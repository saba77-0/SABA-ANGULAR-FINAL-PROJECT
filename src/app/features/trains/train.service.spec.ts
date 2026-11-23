import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TrainService } from './train.service';

describe('TrainService', () => {
  let service: TrainService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrainService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('fetches stations', () => {
    const stations = [{ id: 1, name: 'Tbilisi Central Station' }];
    let response: unknown;
    service.getStations().subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/stations`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: stations, meta: {} });
    expect(response).toEqual(stations);
  });

  it('fetches paged train schedules', () => {
    const schedules = [
      {
        id: 1,
        origin: 'Tbilisi Central Station',
        destination: 'Batumi Central Station',
        departureTime: '08:00:00',
        trainId: 1,
        trainName: 'Tbilisi Express',
        trainNumber: 101,
      },
    ];
    let response: unknown;
    service.getSchedules().subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/schedules` &&
        item.params.get('Take') === '100' &&
        item.params.get('Page') === '1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: schedules }, meta: {} });
    expect(response).toEqual(schedules);
  });

  it('fetches train details', () => {
    const trains = [
      {
        id: 1,
        number: 101,
        name: 'Tbilisi Express',
        thumbnail: '',
        coachesCount: 3,
        totalSeats: 60,
      },
    ];
    let response: unknown;
    service.getTrains().subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/trains` &&
        item.params.get('Take') === '100' &&
        item.params.get('Page') === '1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: trains }, meta: {} });
    expect(response).toEqual(trains);
  });

  it('fetches a train detail including schedules and coaches', () => {
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
          class: 'Second',
          price: 55,
          trainId: 1,
          seatCount: 20,
        },
      ],
    };
    let response: unknown;
    service.getTrainById(1).subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/trains/1`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: train, meta: {} });
    expect(response).toEqual(train);
  });

  it('fetches a schedule by id using the documented endpoint', () => {
    const schedule = {
      id: 1,
      origin: 'Tbilisi Central Station',
      destination: 'Batumi Central Station',
      departureTime: '08:00:00',
      trainId: 1,
      trainName: 'Tbilisi Express',
      trainNumber: 101,
      trainThumbnail: '/train.jpg',
      totalBookings: 5,
    };
    let response: unknown;
    service.getScheduleById(1).subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/schedules/1`);
    expect(request.request.method).toBe('GET');
    request.flush({ data: schedule });
    expect(response).toEqual(schedule);
  });

  it('fetches coaches for a train', () => {
    const coaches = [
      { id: 1, number: 1, class: 'Second', price: 55, trainId: 1, seatCount: 20 },
    ];
    let response: unknown;
    service.getCoachesByTrain(1).subscribe((value) => (response = value));

    const request = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/coaches/train/1` &&
        item.params.get('Take') === '100' &&
        item.params.get('Page') === '1',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ data: { items: coaches } });
    expect(response).toEqual(coaches);
  });

  it('uses the Swagger station, search, route-filter, and coach-filter parameters', () => {
    service.getStationsFrom(1).subscribe();
    service.getStationsTo(2).subscribe();
    service.searchSchedules('Tbilisi', { take: 25, page: 2 }).subscribe();
    service.filterSchedules({
      originStationId: 1,
      destinationStationId: 2,
      take: 25,
      page: 2,
    }).subscribe();
    service.searchTrains('Express', { take: 25, page: 2 }).subscribe();
    service.filterTrains({
      origin: 'Tbilisi Central Station',
      destination: 'Batumi Central Station',
      take: 25,
      page: 2,
    }).subscribe();
    service.filterCoaches({ trainId: 1, class: 2, take: 25, page: 2 }).subscribe();

    const from = httpTestingController.expectOne(`${environment.apiUrl}/api/stations/from/1`);
    const to = httpTestingController.expectOne(`${environment.apiUrl}/api/stations/to/2`);
    const scheduleSearch = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/schedules/search` &&
        item.params.get('query') === 'Tbilisi' &&
        item.params.get('Take') === '25' &&
        item.params.get('Page') === '2',
    );
    const scheduleFilter = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/schedules/filter` &&
        item.params.get('originStationId') === '1' &&
        item.params.get('destinationStationId') === '2' &&
        item.params.get('Take') === '25' &&
        item.params.get('Page') === '2',
    );
    const trainSearch = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/trains/search` &&
        item.params.get('query') === 'Express' &&
        item.params.get('Take') === '25' &&
        item.params.get('Page') === '2',
    );
    const trainFilter = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/trains/filter` &&
        item.params.get('origin') === 'Tbilisi Central Station' &&
        item.params.get('destination') === 'Batumi Central Station' &&
        item.params.get('Take') === '25' &&
        item.params.get('Page') === '2',
    );
    const coachFilter = httpTestingController.expectOne(
      (item) =>
        item.url === `${environment.apiUrl}/api/coaches/filter` &&
        item.params.get('trainId') === '1' &&
        item.params.get('class') === '2' &&
        item.params.get('Take') === '25' &&
        item.params.get('Page') === '2',
    );

    for (const request of [
      from,
      to,
      scheduleSearch,
      scheduleFilter,
      trainSearch,
      trainFilter,
      coachFilter,
    ]) {
      expect(request.request.method).toBe('GET');
      request.flush({ data: [] });
    }
  });
});
