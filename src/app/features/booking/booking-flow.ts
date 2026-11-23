import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, forkJoin, map } from 'rxjs';
import { BookingService } from './booking.service';
import { SeatAvailability } from './booking.model';
import { ScheduleDetails, TrainCoach } from '../trains/train.model';
import { TrainService } from '../trains/train.service';

type BookingStep = 'coach' | 'date' | 'seats' | 'confirm';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-booking-flow',
  styleUrl: './booking-flow.css',
  templateUrl: './booking-flow.html',
})
export class BookingFlow implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trainService = inject(TrainService);
  private readonly bookingService = inject(BookingService);

  readonly scheduleId = Number(
    this.route.snapshot.queryParamMap.get('scheduleId') ??
      this.route.snapshot.queryParamMap.get('scheduledId'),
  );
  readonly trainId = Number(this.route.snapshot.queryParamMap.get('trainId'));
  readonly schedule = signal<ScheduleDetails | null>(null);
  readonly coaches = signal<TrainCoach[]>([]);
  readonly selectedCoach = signal<TrainCoach | null>(null);
  readonly travelDate = signal('');
  readonly seats = signal<SeatAvailability[]>([]);
  readonly selectedSeats = signal<SeatAvailability[]>([]);
  readonly step = signal<BookingStep>('coach');
  readonly draggingCoachCarousel = signal(false);
  readonly loading = signal(true);
  readonly loadingSeats = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly today = this.todayString();
  private coachPointerId: number | null = null;
  private coachPointerStartX = 0;
  private coachPointerStartScroll = 0;
  private coachPointerMoved = false;
  private suppressCoachClick = false;
  private coachPointerElement: HTMLElement | null = null;
  private coachPointerCaptureTarget: HTMLElement | null = null;

  ngOnInit(): void {
    if (
      !Number.isInteger(this.scheduleId) ||
      this.scheduleId < 1 ||
      !Number.isInteger(this.trainId) ||
      this.trainId < 1
    ) {
      this.loading.set(false);
      this.error.set('This booking route is missing a valid schedule or train.');
      return;
    }

    forkJoin({
      schedule: this.trainService.getScheduleById(this.scheduleId),
      coaches: this.trainService.getCoachesByTrain(this.trainId),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ schedule, coaches }) => {
          if (schedule.trainId !== this.trainId) {
            this.error.set('The selected schedule does not belong to this train.');
            return;
          }
          this.schedule.set(schedule);
          this.coaches.set(coaches);
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  continueToDate(): void {
    if (!this.selectedCoach()) {
      this.error.set('Choose a coach to continue.');
      return;
    }
    this.error.set('');
    this.step.set('date');
  }

  startCoachDrag(event: PointerEvent, element: HTMLElement): void {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    this.coachPointerId = event.pointerId;
    this.coachPointerStartX = event.clientX;
    this.coachPointerStartScroll = element.scrollLeft;
    this.coachPointerMoved = false;
    this.coachPointerElement = element;
    element.style.scrollBehavior = 'auto';

    const target = event.target instanceof Element ? event.target.closest('.coach-option') : null;
    this.coachPointerCaptureTarget =
      target instanceof HTMLElement ? target : element;
    this.coachPointerCaptureTarget.setPointerCapture(event.pointerId);
  }

  moveCoachDrag(event: PointerEvent, element: HTMLElement): void {
    if (event.pointerId !== this.coachPointerId) {
      return;
    }

    const distance = event.clientX - this.coachPointerStartX;
    if (!this.coachPointerMoved && Math.abs(distance) < 6) {
      return;
    }

    this.coachPointerMoved = true;
    this.suppressCoachClick = true;
    this.draggingCoachCarousel.set(true);
    element.classList.add('is-dragging');
    event.preventDefault();
    element.scrollLeft = this.coachPointerStartScroll - distance;
  }

  scrollCoachWheel(event: WheelEvent, element: HTMLElement): void {
    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const distance = event.deltaX || event.deltaY;
    if (!distance) {
      return;
    }

    event.preventDefault();
    element.scrollBy({ left: distance, behavior: 'smooth' });
  }

  endCoachDrag(event: PointerEvent): void {
    if (event.pointerId !== this.coachPointerId) {
      return;
    }

    const pointerElement = this.coachPointerElement;
    const captureTarget = this.coachPointerCaptureTarget;
    const dragged = this.coachPointerMoved;
    this.coachPointerId = null;
    this.coachPointerElement = null;
    this.coachPointerCaptureTarget = null;
    this.coachPointerMoved = false;
    this.draggingCoachCarousel.set(false);

    if (pointerElement) {
      pointerElement.style.scrollBehavior = '';
      pointerElement.classList.remove('is-dragging');
    }
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    if (dragged) {
      setTimeout(() => (this.suppressCoachClick = false), 0);
    }
  }

  selectCoach(coach: TrainCoach): void {
    if (this.suppressCoachClick) {
      this.suppressCoachClick = false;
      return;
    }

    this.selectedCoach.set(coach);
    this.error.set('');
  }

  continueToSeats(): void {
    const coach = this.selectedCoach();
    const date = this.travelDate();
    if (!coach || !date || date < this.today) {
      this.error.set('Choose a coach and a valid future travel date.');
      return;
    }

    this.error.set('');
    this.loadingSeats.set(true);
    forkJoin({
      seats: this.bookingService.getSeatsByCoach(coach.id),
      availability: this.bookingService.getSeatsAvailability(
        this.scheduleId,
        coach.id,
        this.dateTime(date),
      ),
    })
      .pipe(
        map(({ seats, availability }) => {
          const availabilityById = new Map(
            availability.map((seat) => [seat.id, seat.isAvailable]),
          );
          if (seats.some((seat) => !availabilityById.has(seat.id))) {
            throw new Error('Seat availability could not be loaded for every coach seat.');
          }
          return seats.map((seat) => ({
            ...seat,
            isAvailable: availabilityById.get(seat.id) ?? false,
          }));
        }),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingSeats.set(false)),
      )
      .subscribe({
        next: (seats) => {
          this.seats.set(seats);
          this.selectedSeats.set([]);
          this.step.set('seats');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  toggleSeat(seat: SeatAvailability): void {
    if (!seat.isAvailable) {
      return;
    }
    this.selectedSeats.update((selected) =>
      selected.some((item) => item.id === seat.id)
        ? selected.filter((item) => item.id !== seat.id)
        : [...selected, seat],
    );
    this.error.set('');
  }

  continueToConfirmation(): void {
    if (!this.selectedSeats().length) {
      this.error.set('Select at least one seat.');
      return;
    }
    this.error.set('');
    this.step.set('confirm');
  }

  goBack(step: BookingStep): void {
    this.error.set('');
    this.step.set(step);
  }

  confirmBooking(): void {
    const schedule = this.schedule();
    const coach = this.selectedCoach();
    const date = this.travelDate();
    const seats = this.selectedSeats();
    if (!schedule || !coach || !date || !seats.length) {
      this.error.set('Complete each booking step before confirming.');
      return;
    }

    this.error.set('');
    this.submitting.set(true);
    this.bookingService
      .createBooking({
        scheduleId: schedule.id,
        seatId: seats.map((seat) => seat.id),
        travelDate: this.dateTime(date),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () =>
          void this.router.navigate(['/profile/bookings'], {
            queryParams: { created: 'true' },
          }),
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  selectedSeat(seat: SeatAvailability): boolean {
    return this.selectedSeats().some((selected) => selected.id === seat.id);
  }

  totalPrice(): number {
    return (this.selectedCoach()?.price ?? 0) * this.selectedSeats().length;
  }

  private dateTime(date: string): string {
    return `${date}T00:00:00.000Z`;
  }

  private todayString(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the booking service. Please try again.';
      }
      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }
      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    }
    return error instanceof Error ? error.message : 'The booking could not be completed.';
  }
}
