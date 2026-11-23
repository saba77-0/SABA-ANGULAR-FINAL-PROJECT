import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookingService } from './booking.service';
import { BookingFlow } from './booking-flow';
import { TrainService } from '../trains/train.service';

function createPointerEvent(clientX: number): PointerEvent {
  const event = new Event('pointermove', { cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
    isPrimary: { value: true },
    button: { value: 0 },
    clientX: { value: clientX },
  });
  return event as PointerEvent;
}

describe('BookingFlow', () => {
  let fixture: ComponentFixture<BookingFlow>;
  let component: BookingFlow;
  const coach = {
    id: 2,
    number: 2,
    class: 'Business',
    price: 35,
    trainId: 1,
    seatCount: 20,
  };
  const trainService = {
    getScheduleById: vi.fn(() =>
      of({
        id: 1,
        origin: 'Tbilisi Central Station',
        destination: 'Batumi Central Station',
        departureTime: '08:00:00',
        trainId: 1,
        trainName: 'Tbilisi Express',
        trainNumber: 101,
      }),
    ),
    getCoachesByTrain: vi.fn(() => of([coach])),
  };
  const bookingService = {
    getSeatsByCoach: vi.fn(() =>
      of([
        { id: 10, number: '1A', coachId: 2 },
        { id: 11, number: '1B', coachId: 2 },
      ]),
    ),
    getSeatsAvailability: vi.fn(() =>
      of([
        { id: 10, number: '1A', coachId: 2, isAvailable: true },
        { id: 11, number: '1B', coachId: 2, isAvailable: false },
      ]),
    ),
    createBooking: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    trainService.getScheduleById.mockClear();
    trainService.getCoachesByTrain.mockClear();
    bookingService.getSeatsByCoach.mockClear();
    bookingService.getSeatsAvailability.mockClear();
    bookingService.createBooking.mockClear();
    await TestBed.configureTestingModule({
      imports: [BookingFlow],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (name: string) => (name === 'scheduleId' ? '1' : name === 'trainId' ? '1' : null),
              },
            },
          },
        },
        { provide: TrainService, useValue: trainService },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingFlow);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads the selected schedule and its train coaches', () => {
    expect(trainService.getScheduleById).toHaveBeenCalledWith(1);
    expect(trainService.getCoachesByTrain).toHaveBeenCalledWith(1);
    expect(component.schedule()?.origin).toBe('Tbilisi Central Station');
    expect(component.coaches()).toEqual([coach]);
  });

  it('scrolls a dragged coach row without accidentally selecting a coach', () => {
    const carousel = fixture.nativeElement.querySelector('.coach-options') as HTMLDivElement;
    carousel.setPointerCapture = vi.fn();
    carousel.hasPointerCapture = vi.fn(() => true);
    carousel.releasePointerCapture = vi.fn();

    component.startCoachDrag(createPointerEvent(200), carousel);
    component.moveCoachDrag(createPointerEvent(150), carousel);

    expect(carousel.scrollLeft).toBe(50);
    expect(component.draggingCoachCarousel()).toBe(true);

    component.endCoachDrag(createPointerEvent(150));
    component.selectCoach(coach);

    expect(component.selectedCoach()).toBeNull();
    expect(component.draggingCoachCarousel()).toBe(false);

    component.selectCoach(coach);
    expect(component.selectedCoach()).toEqual(coach);
  });

  it('maps mouse-wheel movement to smooth horizontal coach scrolling', () => {
    const carousel = fixture.nativeElement.querySelector('.coach-options') as HTMLDivElement;
    Object.defineProperties(carousel, {
      scrollWidth: { configurable: true, value: 1200 },
      clientWidth: { configurable: true, value: 400 },
      scrollBy: { configurable: true, value: vi.fn() },
    });
    const event = new WheelEvent('wheel', { deltaY: 120, cancelable: true });

    component.scrollCoachWheel(event, carousel);

    expect(event.defaultPrevented).toBe(true);
    expect(carousel.scrollBy).toHaveBeenCalledWith({ left: 120, behavior: 'smooth' });
  });

  it('checks seat availability and posts the selected seat IDs and date', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.selectedCoach.set(coach);
    component.continueToDate();
    component.travelDate.set('2099-01-01');
    component.continueToSeats();

    expect(bookingService.getSeatsAvailability).toHaveBeenCalledWith(
      1,
      coach.id,
      '2099-01-01T00:00:00.000Z',
    );
    expect(bookingService.getSeatsByCoach).toHaveBeenCalledWith(coach.id);
    expect(component.step()).toBe('seats');

    component.toggleSeat(component.seats()[1]);
    expect(component.selectedSeats()).toHaveLength(0);
    component.toggleSeat(component.seats()[0]);
    component.continueToConfirmation();
    expect(component.totalPrice()).toBe(35);
    component.confirmBooking();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      scheduleId: 1,
      seatId: [10],
      travelDate: '2099-01-01T00:00:00.000Z',
    });
    expect(navigate).toHaveBeenCalledWith(['/profile/bookings'], {
      queryParams: { created: 'true' },
    });
  });
});
