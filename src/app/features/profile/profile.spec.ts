import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookingService } from '../booking/booking.service';
import { AuthService } from '../auth/auth.service';
import { Profile } from './profile';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  const authService = {
    getCurrentUser: vi.fn(() =>
      of({
        data: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          details: { phoneNumber: '555-1234', address: 'London' },
        },
      }),
    ),
    updateProfile: vi.fn(() => of({})),
    changePassword: vi.fn(() => of({})),
    deleteProfile: vi.fn(() => of({})),
    logout: vi.fn(),
  };
  const bookingService = {
    getBookings: vi.fn(() => of([])),
    getBookingById: vi.fn(() => of({ id: 1, travelDate: '2026-11-21T00:00:00.000Z' })),
    updateBooking: vi.fn(() => of({})),
    deleteBooking: vi.fn(() => of({})),
  };
  const routeSnapshot = {
    data: { section: 'profile' },
    paramMap: { get: () => '1' },
    queryParamMap: { get: () => null },
  };

  beforeEach(async () => {
    routeSnapshot.data.section = 'profile';
    authService.getCurrentUser.mockClear();
    authService.updateProfile.mockClear();
    bookingService.getBookings.mockClear();
    bookingService.getBookingById.mockClear();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: routeSnapshot } },
        { provide: AuthService, useValue: authService },
        { provide: BookingService, useValue: bookingService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
  });

  it('loads and displays the authenticated user profile', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(authService.getCurrentUser).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Ada Lovelace');
    expect(element.textContent).toContain('ada@example.com');
    expect(element.querySelector<HTMLInputElement>('[name="email"]')?.readOnly).toBe(true);
    expect(element.querySelector<HTMLInputElement>('[name="phoneNumber"]')?.value).toBe('555-1234');
    expect(element.querySelector<HTMLInputElement>('[name="address"]')?.value).toBe('London');
  });

  it('shows profile API errors', () => {
    authService.getCurrentUser.mockReturnValueOnce(
      throwError(() => new Error('Profile request failed.')),
    );
    fixture.destroy();
    fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Profile request failed.',
    );
  });

  it('saves trimmed account details and confirms success', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(Profile);
    const component = fixture.componentInstance;
    component.firstName.set(' Augusta ');
    component.lastName.set(' Lovelace ');
    component.email.set('ada@example.com');
    component.phoneNumber.set(' 555-1234 ');
    component.address.set(' London ');

    component.saveProfile();

    expect(authService.updateProfile).toHaveBeenCalledWith({
      firstName: 'Augusta',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: '555-1234',
      address: 'London',
      pictureUrl: null,
      dateOfBirth: null,
    });
    expect(component.message()).toBe('Profile updated successfully.');
  });

  it('auto-dismisses profile notices after two seconds and supports manual close', () => {
    vi.useFakeTimers();
    try {
      fixture.componentInstance.message.set('Profile updated successfully.');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.profile-notice button')).not.toBeNull();

      vi.advanceTimersByTime(1999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.profile-notice')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.profile-notice')).toBeNull();

      fixture.componentInstance.message.set('Another profile notice');
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('.profile-notice button')?.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.profile-notice')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads bookings when the bookings section is requested', () => {
    routeSnapshot.data.section = 'bookings';
    fixture.destroy();
    fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    expect(bookingService.getBookings).toHaveBeenCalledOnce();
  });
});
