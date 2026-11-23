import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TrainService } from './train.service';
import { TrainDetail } from './train-detail';

describe('TrainDetail', () => {
  let fixture: ComponentFixture<TrainDetail>;
  const authService = {
    isAuthenticated: signal(false),
  };

  const train = {
    id: 1,
    number: 101,
    name: 'Tbilisi Express',
    thumbnail: '/train.jpg',
    coachesCount: 1,
    totalSeats: 20,
    schedules: [
      {
        id: 1,
        origin: 'Tbilisi Central Station',
        destination: 'Batumi Central Station',
        departureTime: '08:00:00',
        trainId: 1,
        trainName: 'Tbilisi Express',
        trainNumber: 101,
      },
    ],
    coaches: [
      {
        id: 1,
        number: 1,
        class: 'Business',
        price: 55,
        trainId: 1,
        seatCount: 20,
      },
    ],
  };

  beforeEach(async () => {
    authService.isAuthenticated.set(false);
    await TestBed.configureTestingModule({
      imports: [TrainDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '1' })) },
        },
        {
          provide: TrainService,
          useValue: { getTrainById: () => of(train) },
        },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainDetail);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads train statistics and schedules from the route id', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Tbilisi Express');
    expect(element.querySelector('.statistics')?.textContent).toContain('20');
    expect(element.querySelector('.schedule-route')?.textContent).toContain(
      'Batumi Central Station',
    );
  });

  it('shows coach details when the coaches tab is selected', () => {
    const element = fixture.nativeElement as HTMLElement;
    const coachesTab = element.querySelector('#coaches-tab') as HTMLButtonElement;

    coachesTab.click();
    fixture.detectChanges();

    const coachRow = element.querySelector('.coach-row');
    expect(coachRow?.textContent).toContain('Business');
    expect(coachRow?.querySelector('.coach-class-business')).not.toBeNull();
    expect(coachRow?.querySelector('.coach-meta')?.textContent).toContain('20 seats');
    expect(coachRow?.querySelector('.coach-meta')?.textContent).toContain('$55');
    expect(coachRow?.textContent).toContain('Coach 1');
    expect(element.querySelector('.seat-list')).toBeNull();
    expect(element.querySelector('.seat-button')).toBeNull();
    expect(element.textContent).not.toContain('Seat reservations are saved on this device');
    expect(element.textContent).not.toContain('has been reserved on this device');
  });

  it('prompts unauthenticated users to sign in before booking', () => {
    const bookLink = fixture.nativeElement.querySelector('.book-button') as HTMLAnchorElement;

    expect(bookLink.textContent).toContain('Sign in to book');
    expect(bookLink.getAttribute('href')).toContain('/auth/signin?returnUrl=');
  });

  it('keeps the booking action for authenticated users', () => {
    authService.isAuthenticated.set(true);
    fixture.detectChanges();

    const bookLink = fixture.nativeElement.querySelector('.book-button') as HTMLAnchorElement;
    expect(bookLink.textContent).toContain('Book');
    expect(bookLink.textContent).not.toContain('Sign in to book');
    expect(bookLink.getAttribute('href')).toBe('/book?scheduledId=1&trainId=1');
  });
});
