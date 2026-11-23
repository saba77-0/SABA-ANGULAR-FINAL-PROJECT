import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests seat availability with schedule, coach, and date parameters', () => {
    service.getSeatsAvailability(1, 2, '2026-11-21T00:00:00.000Z').subscribe();
    const request = http.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/seats/availability` &&
        item.params.get('scheduleId') === '1' &&
        item.params.get('coachId') === '2' &&
        item.params.get('travelDate') === '2026-11-21T00:00:00.000Z',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 10, number: '1A', coachId: 2, isAvailable: true }] });
  });

  it('loads the seat inventory for a coach', () => {
    service.getSeatsByCoach(2).subscribe((seats) => {
      expect(seats).toEqual([{ id: 10, number: '1A', coachId: 2 }]);
    });
    const request = http.expectOne(`${environment.apiUrl}/api/seats/coach/2`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [{ id: 10, number: '1A', coachId: 2 }] });
  });

  it('creates a booking with the Swagger DTO field names', () => {
    const requestBody = {
      scheduleId: 1,
      seatId: [10, 11],
      travelDate: '2026-11-21T00:00:00.000Z',
    };
    service.createBooking(requestBody).subscribe();
    const request = http.expectOne(`${environment.apiUrl}/api/bookings`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush({ data: { id: 612 } });
  });

  it('loads bookings from the paged collection and sends date filters', () => {
    service.getBookings('2026-11-20', '2026-11-30').subscribe((bookings) => {
      expect(bookings).toEqual([{ id: 612, travelDate: '2026-11-21T00:00:00.000Z' }]);
    });
    const request = http.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/bookings/filter` &&
        item.params.get('from') === '2026-11-20T00:00:00.000Z' &&
        item.params.get('to') === '2026-11-30T23:59:59.000Z' &&
        item.params.get('Take') === '100' &&
        item.params.get('Page') === '1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: { items: [{ id: 612, travelDate: '2026-11-21T00:00:00.000Z' }] },
    });
  });

  it('updates and deletes a booking using documented operations', () => {
    service.updateBooking(612, '2026-11-22').subscribe();
    const update = http.expectOne(`${environment.apiUrl}/api/bookings/612`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ travelDate: '2026-11-22T00:00:00.000Z' });
    update.flush({});

    service.deleteBooking(612).subscribe();
    const deletion = http.expectOne(`${environment.apiUrl}/api/bookings/612`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({});
  });
});
