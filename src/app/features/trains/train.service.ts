import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ScheduleDetails,
  ScheduleFilterQuery,
  ScheduleQuery,
  Station,
  TrainCoach,
  TrainDetails,
  TrainFilterQuery,
  TrainSchedule,
  TrainSummary,
  CoachFilterQuery,
  PageQuery,
} from './train.model';

interface ApiCollectionResponse<T> {
  data: T[] | { items: T[] };
}

interface ApiItemResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class TrainService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStations(): Observable<Station[]> {
    return this.getCollection<Station>('/api/stations');
  }

  getStationsFrom(fromId: number): Observable<Station[]> {
    return this.getCollection<Station>(`/api/stations/from/${fromId}`);
  }

  getStationsTo(toId: number): Observable<Station[]> {
    return this.getCollection<Station>(`/api/stations/to/${toId}`);
  }

  getTrains(query: PageQuery = {}): Observable<TrainSummary[]> {
    return this.getCollection<TrainSummary>('/api/trains', this.pageParams(query));
  }

  searchTrains(query: string, page: PageQuery = {}): Observable<TrainSummary[]> {
    const params = this.pageParams(page).set('query', query);
    return this.getCollection<TrainSummary>('/api/trains/search', params);
  }

  filterTrains(query: TrainFilterQuery): Observable<TrainSummary[]> {
    let params = this.pageParams(query);
    if (query.origin) {
      params = params.set('origin', query.origin);
    }
    if (query.destination) {
      params = params.set('destination', query.destination);
    }
    return this.getCollection<TrainSummary>('/api/trains/filter', params);
  }

  getTrainById(id: number): Observable<TrainDetails> {
    return this.http
      .get<ApiItemResponse<TrainDetails>>(`${this.apiUrl}/api/trains/${id}`)
      .pipe(
        map(({ data }) => {
          if (!data || data.id !== id) {
            throw new Error(`Unexpected train response for id ${id}`);
          }

          return data;
        }),
      );
  }

  getSchedules(query: ScheduleQuery = {}): Observable<TrainSchedule[]> {
    let params = this.pageParams(query);
    if (query.trainId !== undefined) {
      params = params.set('trainId', query.trainId);
    }
    return this.getCollection<TrainSchedule>('/api/schedules', params);
  }

  searchSchedules(query: string, page: PageQuery = {}): Observable<TrainSchedule[]> {
    const params = this.pageParams(page).set('query', query);
    return this.getCollection<TrainSchedule>('/api/schedules/search', params);
  }

  filterSchedules(query: ScheduleFilterQuery): Observable<TrainSchedule[]> {
    let params = this.pageParams(query);
    if (query.originStationId !== undefined) {
      params = params.set('originStationId', query.originStationId);
    }
    if (query.destinationStationId !== undefined) {
      params = params.set('destinationStationId', query.destinationStationId);
    }
    return this.getCollection<TrainSchedule>('/api/schedules/filter', params);
  }

  getScheduleById(id: number): Observable<ScheduleDetails> {
    return this.http
      .get<ApiItemResponse<ScheduleDetails>>(`${this.apiUrl}/api/schedules/${id}`)
      .pipe(
        map(({ data }) => {
          if (!data || data.id !== id) {
            throw new Error(`Unexpected schedule response for id ${id}`);
          }

          return data;
        }),
      );
  }

  getCoachesByTrain(trainId: number): Observable<TrainCoach[]> {
    return this.getCollection<TrainCoach>(
      `/api/coaches/train/${trainId}`,
      this.pageParams(),
    );
  }

  filterCoaches(query: CoachFilterQuery): Observable<TrainCoach[]> {
    let params = this.pageParams(query);
    if (query.trainId !== undefined) {
      params = params.set('trainId', query.trainId);
    }
    if (query.class !== undefined) {
      params = params.set('class', query.class);
    }
    return this.getCollection<TrainCoach>('/api/coaches/filter', params);
  }

  private getCollection<T>(path: string, params = new HttpParams()): Observable<T[]> {
    return this.http
      .get<ApiCollectionResponse<T>>(`${this.apiUrl}${path}`, { params })
      .pipe(
        map(({ data }) => {
          if (Array.isArray(data)) {
            return data;
          }

          if (data && Array.isArray(data.items)) {
            return data.items;
          }

          throw new Error(`Unexpected collection response from ${path}`);
        }),
      );
  }

  private pageParams(query: PageQuery = {}): HttpParams {
    return new HttpParams()
      .set('Take', query.take ?? 100)
      .set('Page', query.page ?? 1);
  }
}
