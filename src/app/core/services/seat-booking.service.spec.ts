import { TestBed } from '@angular/core/testing';
import { SeatBookingService } from './seat-booking.service';

describe('SeatBookingService', () => {
  beforeEach(() => {
    localStorage.removeItem('step_trains_booked_seats');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem('step_trains_booked_seats');
  });

  it('persists booked seats and blocks a duplicate reservation', () => {
    const service = TestBed.inject(SeatBookingService);

    expect(service.bookSeat(12, 4, 7)).toBe(true);
    expect(service.isBooked(12, 4, 7)).toBe(true);
    expect(service.bookSeat(12, 4, 7)).toBe(false);
    expect(localStorage.getItem('step_trains_booked_seats')).toBe(
      JSON.stringify(['12:4:7']),
    );
  });

  it('restores valid saved reservations', () => {
    localStorage.setItem('step_trains_booked_seats', JSON.stringify(['12:4:7']));

    expect(TestBed.inject(SeatBookingService).isBooked(12, 4, 7)).toBe(true);
  });
});
