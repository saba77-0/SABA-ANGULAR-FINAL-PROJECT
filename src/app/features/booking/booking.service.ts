import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BookingRecord,
  CreateBookingRequest,
  Seat,
  SeatAvailability,
} from './booking.model';

interface ApiCollectionResponse<T> {
  data?: T[] | { items?: T[] };
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getSeatsAvailability(
    scheduleId: number,
    coachId: number,
    travelDate: string,
  ): Observable<SeatAvailability[]> {
    const params = new HttpParams()
      .set('scheduleId', scheduleId)
      .set('coachId', coachId)
      .set('travelDate', travelDate);
    return this.http
      .get<ApiCollectionResponse<SeatAvailability>>(
        `${this.apiUrl}/api/seats/availability`,
        { params },
      )
      .pipe(map((response) => this.collectionFrom(response, '/api/seats/availability')));
  }

  getSeatsByCoach(coachId: number): Observable<Seat[]> {
    return this.http
      .get<ApiCollectionResponse<Seat>>(`${this.apiUrl}/api/seats/coach/${coachId}`)
      .pipe(map((response) => this.collectionFrom(response, `/api/seats/coach/${coachId}`)));
  }

  createBooking(request: CreateBookingRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/api/bookings`, request);
  }

  getBookings(from?: string, to?: string): Observable<BookingRecord[]> {
    const path = from || to ? '/api/bookings/filter' : '/api/bookings';
    let params = new HttpParams().set('Take', 100).set('Page', 1);
    if (from) {
      params = params.set('from', this.dateTime(from));
    }
    if (to) {
      params = params.set('to', this.dateTime(to, true));
    }

    return this.http
      .get<ApiCollectionResponse<BookingRecord>>(`${this.apiUrl}${path}`, { params })
      .pipe(map((response) => this.collectionFrom(response, path).map((booking) => this.bookingFrom(booking))));
  }

  getBookingById(id: number): Observable<BookingRecord> {
    return this.http
      .get<unknown>(`${this.apiUrl}/api/bookings/${id}`)
      .pipe(map((response) => this.bookingFrom(this.dataFrom(response))));
  }

  updateBooking(id: number, travelDate: string): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/api/bookings/${id}`, {
      travelDate: this.dateTime(travelDate),
    });
  }

  deleteBooking(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/api/bookings/${id}`);
  }

  private dateTime(date: string, endOfDay = false): string {
    return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}.000Z`;
  }

  private dataFrom(response: unknown): unknown {
    if (!this.isRecord(response)) {
      throw new Error('Unexpected booking response.');
    }
    return 'data' in response ? response['data'] : response;
  }

  private collectionFrom<T>(response: ApiCollectionResponse<T>, path: string): T[] {
    const data = response?.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (this.isRecord(data) && Array.isArray(data.items)) {
      return data.items as T[];
    }
    throw new Error(`Unexpected collection response from ${path}`);
  }

  private bookingFrom(value: unknown): BookingRecord {
    if (
      !this.isRecord(value) ||
      typeof value['id'] !== 'number' ||
      typeof value['travelDate'] !== 'string'
    ) {
      throw new Error('Unexpected booking response.');
    }
    return value as unknown as BookingRecord;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
