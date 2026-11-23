import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TrainSchedule, TrainSummary } from './train.model';
import { TrainService } from './train.service';
import { TrainList } from './train-list';

describe('TrainList', () => {
  let component: TrainList;
  let fixture: ComponentFixture<TrainList>;
  const schedule: TrainSchedule = {
    id: 1,
    origin: 'Tbilisi Central Station',
    destination: 'Batumi Central Station',
    departureTime: '08:00:00',
    trainId: 1,
    trainName: 'Tbilisi Express',
    trainNumber: 101,
  };
  const reverseSchedule: TrainSchedule = {
    ...schedule,
    id: 2,
    origin: 'Batumi Central Station',
    destination: 'Tbilisi Central Station',
  };
  const allSchedules: TrainSchedule[] = [
    { ...schedule, id: 10, trainId: 5, trainName: 'Adjara Night', trainNumber: 505, origin: 'Batumi Central Station', destination: 'Tbilisi Central Station' },
    { ...schedule, id: 7, trainId: 4, trainName: 'Borjomi', trainNumber: 404, origin: 'Tbilisi Central Station', destination: 'Borjomi-Bakuriani Station' },
    schedule,
    { ...schedule, id: 3, trainId: 2, trainName: 'Imereti', trainNumber: 202, destination: 'Kutaisi Station' },
    { ...schedule, id: 5, trainId: 3, trainName: 'Kolkheti', trainNumber: 303, destination: 'Zugdidi Station' },
    { ...schedule, id: 8, trainId: 4, trainName: 'Borjomi', trainNumber: 404, origin: 'Borjomi-Bakuriani Station', destination: 'Tbilisi Central Station' },
    { ...schedule, id: 4, trainId: 2, trainName: 'Imereti', trainNumber: 202, origin: 'Kutaisi Station', destination: 'Tbilisi Central Station' },
    { ...schedule, id: 6, trainId: 3, trainName: 'Kolkheti', trainNumber: 303, origin: 'Zugdidi Station', destination: 'Tbilisi Central Station' },
    reverseSchedule,
    { ...schedule, id: 9, trainId: 5, trainName: 'Adjara Night', trainNumber: 505 },
  ];
  const train: TrainSummary = {
    id: 1,
    number: 101,
    name: 'Tbilisi Express',
    thumbnail: '',
    coachesCount: 3,
    totalSeats: 60,
  };
  const stations = [
    { id: 1, name: 'Tbilisi Central Station' },
    { id: 2, name: 'Batumi Central Station' },
    { id: 3, name: 'Kutaisi Station' },
  ];
  const trainService = {
    getStations: vi.fn(() => of(stations)),
    getStationsFrom: vi.fn((id: number) => of(id === 1 ? [stations[1], stations[2]] : [])),
    getStationsTo: vi.fn((id: number) => of(id === 2 ? [stations[0]] : [])),
    getSchedules: vi.fn(() => of(allSchedules)),
    filterSchedules: vi.fn(
      ({
        originStationId,
        destinationStationId,
      }: {
        originStationId?: number;
        destinationStationId?: number;
      }) =>
        of(
          originStationId === 1 && destinationStationId === 2
            ? [schedule, reverseSchedule, schedule]
            : [],
        ),
    ),
    searchSchedules: vi.fn((query: string) => of(query === 'Tbilisi' ? [schedule] : [])),
    getTrains: vi.fn(() =>
      of([
        train,
        { ...train, id: 2, number: 202, name: 'Imereti' },
        { ...train, id: 3, number: 303, name: 'Kolkheti' },
        { ...train, id: 4, number: 404, name: 'Borjomi' },
        { ...train, id: 5, number: 505, name: 'Adjara Night' },
      ]),
    ),
    searchTrains: vi.fn((query: string) => of(query === 'unknown' ? [] : [train])),
    filterTrains: vi.fn(
      ({ origin, destination }: { origin?: string; destination?: string }) =>
        of(origin === 'Tbilisi Central Station' && destination === 'Batumi Central Station' ? [train] : []),
    ),
  };

  beforeEach(async () => {
    trainService.getStations.mockClear();
    trainService.getStationsFrom.mockClear();
    trainService.getStationsTo.mockClear();
    trainService.getSchedules.mockClear();
    trainService.filterSchedules.mockClear();
    trainService.searchSchedules.mockClear();
    trainService.getTrains.mockClear();
    trainService.searchTrains.mockClear();
    trainService.filterTrains.mockClear();

    await TestBed.configureTestingModule({
      imports: [TrainList],
      providers: [
        provideRouter([]),
        { provide: TrainService, useValue: trainService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows one outbound schedule per train in train-number order', () => {
    expect(trainService.getSchedules).toHaveBeenCalledOnce();
    expect(trainService.getTrains).toHaveBeenCalledOnce();
    expect(component.visibleTrains().map(({ trainNumber }) => trainNumber)).toEqual([
      101, 202, 303, 404, 505,
    ]);
    expect(
      component.visibleTrains().every(({ origin }) => origin === 'Tbilisi Central Station'),
    ).toBe(true);

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.result-count')?.textContent?.trim()).toBe('5 trains found');
    expect(element.querySelector('label[for="train-search"]')?.textContent?.trim()).toBe(
      'Train number',
    );
    expect(element.querySelector('.results-heading')).toBeNull();
    expect(element.textContent).not.toContain('All available trains');
    expect(element.textContent).not.toContain('SCHEDULES');
  });

  it('searches train names/numbers through backend search endpoints', () => {
    const searchInput = fixture.nativeElement.querySelector(
      '#train-search',
    ) as HTMLInputElement;
    searchInput.value = '2';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(trainService.searchTrains).toHaveBeenCalledWith('2');
    expect(trainService.searchSchedules).toHaveBeenCalledWith('2');
    expect(component.visibleTrains().map(({ trainNumber }) => trainNumber)).toEqual([202]);

    searchInput.value = 'unknown';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(component.visibleTrains()).toEqual([]);

    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(component.visibleTrains().map(({ trainNumber }) => trainNumber)).toEqual([
      101, 202, 303, 404, 505,
    ]);
  });

  it('loads route options and applies ID-based schedule filters through the API', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const originSelect = fixture.nativeElement.querySelector(
      '#origin-filter',
    ) as HTMLSelectElement;
    originSelect.value = stations[0].name;
    originSelect.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(component.availableDestinations()).toEqual([stations[1], stations[2]]);

    const destinationSelect = fixture.nativeElement.querySelector(
      '#destination-filter',
    ) as HTMLSelectElement;
    destinationSelect.value = stations[1].name;
    destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(trainService.filterSchedules).toHaveBeenCalledWith({
      originStationId: 1,
      destinationStationId: 2,
    });
    expect(component.visibleTrains()).toEqual([schedule]);

    component.searchTrains();

    expect(trainService.getStationsFrom).toHaveBeenCalledWith(1);
    expect(trainService.getStationsTo).toHaveBeenCalledWith(2);
    expect(trainService.filterSchedules).toHaveBeenCalledWith({
      originStationId: 1,
      destinationStationId: 2,
    });
    expect(trainService.filterTrains).toHaveBeenCalledWith({
      origin: stations[0].name,
      destination: stations[1].name,
    });
    expect(component.visibleTrains()).toEqual([schedule]);
    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {
        origin: stations[0].name,
        destination: stations[1].name,
        trainNumber: null,
      },
      queryParamsHandling: 'merge',
    });

    const searchInput = fixture.nativeElement.querySelector(
      '#train-search',
    ) as HTMLInputElement;
    searchInput.value = '101';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    component.applyTrainSearch();
    expect(component.visibleTrains()).toEqual([schedule]);

    destinationSelect.value = stations[2].name;
    destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    component.searchTrains();
    expect(component.visibleTrains()).toEqual([]);

    component.clearFilters();
    expect(component.visibleTrains().map(({ trainNumber }) => trainNumber)).toEqual([
      101, 202, 303, 404, 505,
    ]);
  });
});
