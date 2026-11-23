import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const storageKey = 'step_trains_booked_seats';
const seatKeyPattern = /^\d+:\d+:\d+$/;

@Injectable({ providedIn: 'root' })
export class SeatBookingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly bookedSeats = signal<ReadonlySet<string>>(new Set());
  readonly storageError = signal('');

  constructor() {
    this.loadBookedSeats();
  }

  seatNumbers(count: number): number[] {
    return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => index + 1);
  }

  isBooked(trainId: number, coachId: number, seatNumber: number): boolean {
    return this.bookedSeats().has(this.seatKey(trainId, coachId, seatNumber));
  }

  bookSeat(trainId: number, coachId: number, seatNumber: number): boolean {
    const key = this.seatKey(trainId, coachId, seatNumber);
    const current = this.bookedSeats();
    if (current.has(key)) {
      return false;
    }

    if (!isPlatformBrowser(this.platformId)) {
      this.storageError.set('Seat reservations are unavailable outside the browser.');
      return false;
    }

    const next = new Set(current);
    next.add(key);

    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      this.storageError.set('Seat reservations could not be saved on this device.');
      return false;
    }

    this.bookedSeats.set(next);
    this.storageError.set('');
    return true;
  }

  private loadBookedSeats(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        return;
      }

      const parsed: unknown = JSON.parse(saved);
      if (
        !Array.isArray(parsed) ||
        !parsed.every((key: unknown) => typeof key === 'string' && seatKeyPattern.test(key))
      ) {
        this.storageError.set('Saved seat reservations could not be read.');
        return;
      }

      this.bookedSeats.set(new Set(parsed));
    } catch {
      this.storageError.set('Saved seat reservations could not be read.');
    }
  }

  private seatKey(trainId: number, coachId: number, seatNumber: number): string {
    return `${trainId}:${coachId}:${seatNumber}`;
  }
}
