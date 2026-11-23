import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingRecord } from '../booking/booking.model';
import { BookingService } from '../booking/booking.service';
import {
  ChangePasswordRequest,
  ProfileUpdateRequest,
  UserProfile,
  UserProfileResponse,
} from '../auth/auth.model';
import { AuthService } from '../auth/auth.service';

type ProfileSection = 'profile' | 'bookings' | 'booking-details' | 'settings';

@Component({
  imports: [DatePipe, FormsModule, RouterLink, RouterLinkActive],
  selector: 'app-profile',
  styleUrl: './profile.css',
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly section: ProfileSection =
    this.route.snapshot.data['section'] === 'bookings' ||
    this.route.snapshot.data['section'] === 'booking-details' ||
    this.route.snapshot.data['section'] === 'settings'
      ? this.route.snapshot.data['section']
      : 'profile';
  readonly bookingId = Number(this.route.snapshot.paramMap.get('id'));
  readonly user = signal<UserProfile | null>(null);
  readonly booking = signal<BookingRecord | null>(null);
  readonly bookings = signal<BookingRecord[]>([]);
  readonly loading = signal(true);
  readonly bookingsLoading = signal(true);
  readonly bookingLoading = signal(true);
  readonly saving = signal(false);
  readonly savingBooking = signal(false);
  readonly deleting = signal(false);
  readonly confirmProfileDeletion = signal(false);
  readonly error = signal('');
  readonly bookingsError = signal('');
  readonly message = signal(
    this.route.snapshot.queryParamMap.get('created') === 'true'
      ? 'Booking created successfully!'
      : '',
  );
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly phoneNumber = signal('');
  readonly address = signal('');
  readonly pictureUrl = signal('');
  readonly dateOfBirth = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly bookingDate = signal('');
  readonly today = this.todayString();
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly displayName = computed(() => {
    const user = this.user();
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'My Profile';
  });
  readonly initials = computed(() => {
    const user = this.user();
    return (
      [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') ||
      user?.email?.[0] ||
      'S'
    ).toUpperCase();
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.message()) return;

      const timeoutId = setTimeout(() => this.message.set(''), 2000);
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  ngOnInit(): void {
    this.loadProfile();
    if (this.section === 'bookings') {
      this.loadBookings();
    } else if (this.section === 'booking-details') {
      if (Number.isInteger(this.bookingId) && this.bookingId > 0) {
        this.loadBooking();
      } else {
        this.bookingLoading.set(false);
        this.error.set('This booking could not be found.');
      }
    }
  }

  dismissMessage(): void {
    this.message.set('');
  }

  saveProfile(): void {
    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();
    if (!firstName || !lastName || !this.email().trim()) {
      this.error.set('First name, last name, and email address are required.');
      this.message.set('');
      return;
    }

    const request: ProfileUpdateRequest = {
      firstName,
      lastName,
      email: this.email().trim(),
      phoneNumber: this.phoneNumber().trim() || null,
      address: this.address().trim() || null,
      pictureUrl: this.pictureUrl().trim() || null,
      dateOfBirth: this.dateOfBirth() ? this.dateTime(this.dateOfBirth()) : null,
    };

    this.error.set('');
    this.message.set('');
    this.saving.set(true);
    this.authService
      .updateProfile(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.user.update((user) =>
            user
              ? {
                  ...user,
                  firstName,
                  lastName,
                  email: request.email,
                  phoneNumber: request.phoneNumber,
                  address: request.address,
                  pictureUrl: request.pictureUrl,
                  dateOfBirth: request.dateOfBirth,
                  details: {
                    ...user.details,
                    phoneNumber: request.phoneNumber,
                    address: request.address,
                    pictureUrl: request.pictureUrl,
                    dob: request.dateOfBirth,
                  },
                }
              : user,
          );
          this.message.set('Profile updated successfully.');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  filterBookings(): void {
    this.loadBookings(this.fromDate(), this.toDate());
  }

  clearBookingFilters(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.loadBookings();
  }

  saveBookingDate(): void {
    const date = this.bookingDate();
    if (!date || date < this.todayString()) {
      this.error.set('Choose a valid future travel date.');
      this.message.set('');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.savingBooking.set(true);
    this.bookingService
      .updateBooking(this.bookingId, date)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.savingBooking.set(false)),
      )
      .subscribe({
        next: () => {
          this.booking.update((booking) =>
            booking ? { ...booking, travelDate: this.dateTime(date) } : booking,
          );
          this.message.set('Travel date updated successfully!');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  deleteBooking(): void {
    this.error.set('');
    this.deleting.set(true);
    this.bookingService
      .deleteBooking(this.bookingId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => void this.router.navigate(['/profile/bookings']),
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  changePassword(): void {
    const request: ChangePasswordRequest = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    };
    if (!request.currentPassword || request.newPassword.length < 6) {
      this.error.set('Enter your current password and a new password of at least 6 characters.');
      this.message.set('');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.saving.set(true);
    this.authService
      .changePassword(request)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.currentPassword.set('');
          this.newPassword.set('');
          this.message.set('Password updated successfully.');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  deleteProfile(): void {
    this.error.set('');
    this.deleting.set(true);
    this.authService
      .deleteProfile()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.authService.logout();
          void this.router.navigateByUrl('/');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  signOut(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  bookingOrigin(booking: BookingRecord): string {
    return booking.schedule?.origin ?? booking.origin ?? 'Route details unavailable';
  }

  bookingDestination(booking: BookingRecord): string {
    return booking.schedule?.destination ?? booking.destination ?? '';
  }

  bookingTrainName(booking: BookingRecord): string {
    return booking.schedule?.trainName ?? booking.trainName ?? 'Train';
  }

  bookingTrainNumber(booking: BookingRecord): number | null {
    return booking.schedule?.trainNumber ?? booking.trainNumber ?? null;
  }

  bookingDeparture(booking: BookingRecord): string {
    return (booking.schedule?.departureTime ?? booking.departureTime ?? '').slice(0, 5);
  }

  bookingCoach(booking: BookingRecord): string {
    const coach = booking.coach;
    const number = coach?.number ?? booking.coachNumber;
    const coachClass = coach?.class ?? booking.coachClass;
    return number !== undefined || coachClass ? `${number ?? ''} — ${coachClass ?? ''}` : '—';
  }

  bookingSeats(booking: BookingRecord): string {
    return (
      booking.seats?.map((seat) => seat.number).join(', ') ??
      booking.seatNumbers?.join(', ') ??
      '—'
    );
  }

  bookingPrice(booking: BookingRecord): number | null {
    return booking.totalPrice ?? booking.price ?? booking.coach?.price ?? null;
  }

  private loadProfile(): void {
    this.authService
      .getCurrentUser()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const user = this.profileFrom(response);
          if (!user) {
            this.error.set('Your profile could not be loaded. Please try again.');
            return;
          }
          this.user.set(user);
          this.firstName.set(user.firstName ?? '');
          this.lastName.set(user.lastName ?? '');
          this.email.set(user.email ?? '');
          this.phoneNumber.set(user.details?.phoneNumber ?? user.phoneNumber ?? '');
          this.address.set(user.details?.address ?? user.address ?? '');
          this.pictureUrl.set(user.details?.pictureUrl ?? user.pictureUrl ?? '');
          this.dateOfBirth.set(
            (user.details?.dob ?? user.details?.dateOfBirth ?? user.dateOfBirth ?? '').split('T')[0],
          );
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  private loadBookings(from?: string, to?: string): void {
    this.bookingsError.set('');
    this.bookingsLoading.set(true);
    this.bookingService
      .getBookings(from, to)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.bookingsLoading.set(false)),
      )
      .subscribe({
        next: (bookings) => this.bookings.set(bookings),
        error: (error: unknown) => this.bookingsError.set(this.errorMessage(error)),
      });
  }

  private loadBooking(): void {
    this.bookingService
      .getBookingById(this.bookingId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.bookingLoading.set(false)),
      )
      .subscribe({
        next: (booking) => {
          this.booking.set(booking);
          this.bookingDate.set(booking.travelDate.split('T')[0]);
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  private profileFrom(response: UserProfileResponse | null): UserProfile | null {
    if (!response) {
      return null;
    }
    return 'data' in response ? response.data : response;
  }

  private dateTime(date: string): string {
    return `${date}T00:00:00.000Z`;
  }

  private todayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the profile service. Please try again.';
      }
      if (typeof error.error?.detail === 'string') {
        return error.error.detail;
      }
      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    } else if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'The request could not be completed. Please try again.';
  }
}
