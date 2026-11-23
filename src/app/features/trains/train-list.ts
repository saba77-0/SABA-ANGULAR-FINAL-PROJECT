import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  Subject,
  Subscription,
  switchMap,
} from 'rxjs';
import { TrainCard } from './train-card';
import {
  Station,
  TrainSchedule,
  TrainSearch,
  TrainSummary,
} from './train.model';
import { TrainService } from './train.service';

const DEFAULT_TRAIN_ORIGIN = 'Tbilisi Central Station';

@Component({
  imports: [FormsModule, TrainCard],
  selector: 'app-train-list',
  styleUrl: './train-list.css',
  templateUrl: './train-list.html',
})
export class TrainList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trainService = inject(TrainService);
  private readonly originChanges = new Subject<number | null>();
  private readonly destinationChanges = new Subject<number | null>();
  private lastResultsKey = '';
  private resultsSubscription: Subscription | null = null;

  readonly stations = signal<Station[]>([]);
  readonly availableOrigins = signal<Station[]>([]);
  readonly availableDestinations = signal<Station[]>([]);
  readonly trains = signal<TrainSchedule[]>([]);
  readonly trainDetails = signal<TrainSummary[]>([]);
  readonly allTrainDetails = signal<TrainSummary[]>([]);
  readonly stationsLoading = signal(true);
  readonly trainsLoading = signal(true);
  readonly stationsError = signal('');
  readonly trainsError = signal('');
  readonly trainSearchTerm = signal(
    this.route.snapshot.queryParamMap.get('trainNumber') ?? '',
  );
  readonly selectedOrigin = signal(this.route.snapshot.queryParamMap.get('origin') ?? '');
  readonly selectedDestination = signal(
    this.route.snapshot.queryParamMap.get('destination') ?? '',
  );
  readonly appliedOrigin = signal(this.selectedOrigin());
  readonly appliedDestination = signal(this.selectedDestination());
  readonly searchCriteria = computed<TrainSearch | null>(() => {
    const fromStation = this.appliedOrigin().trim();
    const toStation = this.appliedDestination().trim();
    return fromStation || toStation ? { fromStation, toStation } : null;
  });
  readonly trainDetailsById = computed(
    () => new Map(this.trainDetails().map((train) => [train.id, train])),
  );
  readonly visibleTrains = computed(() => this.trains());

  constructor() {
    this.originChanges
      .pipe(
        switchMap((id) => {
          this.stationsError.set('');
          if (id === null) {
            return of(this.stations());
          }
          return this.trainService.getStationsFrom(id).pipe(
            catchError(() => {
              this.stationsError.set('Destination stations could not be loaded. Please try again.');
              return of([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((stations) => this.availableDestinations.set(stations));

    this.destinationChanges
      .pipe(
        switchMap((id) => {
          this.stationsError.set('');
          if (id === null) {
            return of(this.stations());
          }
          return this.trainService.getStationsTo(id).pipe(
            catchError(() => {
              this.stationsError.set('Origin stations could not be loaded. Please try again.');
              return of([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((stations) => this.availableOrigins.set(stations));
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.selectedOrigin.set(params.get('origin') ?? '');
        this.selectedDestination.set(params.get('destination') ?? '');
        this.appliedOrigin.set(this.selectedOrigin());
        this.appliedDestination.set(this.selectedDestination());
        this.trainSearchTerm.set(params.get('trainNumber') ?? '');
        if (this.stations().length) {
          this.loadStationOptions();
          this.loadResults();
        }
      });

    this.trainService
      .getStations()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.stationsLoading.set(false)),
      )
      .subscribe({
        next: (stations) => {
          this.stations.set(stations);
          this.stationsError.set('');
          this.loadStationOptions();
          this.loadResults();
        },
        error: () => {
          this.stationsError.set('Stations could not be loaded. Please try again later.');
          this.trainsLoading.set(false);
        },
      });
  }

  searchTrains(): void {
    this.appliedOrigin.set(this.selectedOrigin());
    this.appliedDestination.set(this.selectedDestination());
    this.loadStationOptions();
    this.applyFilters();
  }

  applyTrainSearch(): void {
    this.loadResults();
    void this.updateUrl();
  }

  updateTrainSearch(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.trainSearchTerm.set(event.target.value);
      this.applyTrainSearch();
    }
  }

  updateOrigin(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedOrigin.set(event.target.value);
      this.selectedDestination.set('');
      this.destinationChanges.next(null);
      this.originChanges.next(this.stationId(this.selectedOrigin()));
      this.appliedOrigin.set(this.selectedOrigin());
      this.appliedDestination.set('');
      this.applyFilters();
    }
  }

  updateDestination(event: Event): void {
    if (event.target instanceof HTMLSelectElement) {
      this.selectedDestination.set(event.target.value);
      this.destinationChanges.next(this.stationId(this.selectedDestination()));
      this.appliedOrigin.set(this.selectedOrigin());
      this.appliedDestination.set(this.selectedDestination());
      this.applyFilters();
    }
  }

  clearFilters(): void {
    this.trainSearchTerm.set('');
    this.selectedOrigin.set('');
    this.selectedDestination.set('');
    this.searchTrains();
  }

  private loadStationOptions(): void {
    this.originChanges.next(this.stationId(this.selectedOrigin()));
    this.destinationChanges.next(this.stationId(this.selectedDestination()));
  }

  private loadResults(): void {
    const origin = this.appliedOrigin().trim();
    const destination = this.appliedDestination().trim();
    const searchTerm = this.trainSearchTerm().trim();
    const key = JSON.stringify([origin, destination, searchTerm]);
    if (key === this.lastResultsKey) {
      return;
    }
    this.resultsSubscription?.unsubscribe();
    this.resultsSubscription = null;
    this.lastResultsKey = key;

    const originStationId = this.stationId(origin);
    const destinationStationId = this.stationId(destination);
    if ((origin && originStationId === null) || (destination && destinationStationId === null)) {
      this.trains.set([]);
      this.trainsError.set('Choose a valid station from the available options.');
      this.trainsLoading.set(false);
      return;
    }

    const hasRouteFilter = originStationId !== null || destinationStationId !== null;
    const directionOrigin = origin || (destination ? '' : DEFAULT_TRAIN_ORIGIN);
    const matchesSelectedRoute = (schedule: TrainSchedule) =>
      this.matchesRoute(schedule, directionOrigin, destination);
    const scheduleQuery$ = hasRouteFilter
      ? this.trainService.filterSchedules({
          originStationId: originStationId ?? undefined,
          destinationStationId: destinationStationId ?? undefined,
        })
      : this.trainService.getSchedules();
    const summaryQuery$ = searchTerm
      ? this.trainService.searchTrains(searchTerm)
      : hasRouteFilter
        ? this.trainService.filterTrains({ origin: origin || undefined, destination: destination || undefined })
        : this.trainService.getTrains();
    const scheduleSearch$ = searchTerm
      ? this.trainService.searchSchedules(searchTerm)
      : of<TrainSchedule[]>([]);
    const catalogQuery$ =
      searchTerm && this.allTrainDetails().length === 0
        ? this.trainService.getTrains()
        : of(this.allTrainDetails());

    this.trainsLoading.set(true);
    this.trainsError.set('');
    this.resultsSubscription = forkJoin({
      schedules: scheduleQuery$,
      trainDetails: summaryQuery$,
      scheduleMatches: scheduleSearch$,
      catalog: catalogQuery$,
    })
      .pipe(
        map(({ schedules, trainDetails, scheduleMatches, catalog }) => {
          const routeSchedules = this.uniqueSchedules(schedules.filter(matchesSelectedRoute));
          if (!searchTerm) {
            return { schedules: routeSchedules, trainDetails, catalog };
          }

          const matchingTrainDetails = this.uniqueTrainSummaries(
            [...catalog, ...this.allTrainDetails(), ...trainDetails].filter((train) =>
              this.matchesTrainSearch(train, searchTerm),
            ),
          );
          const directionMatches = this.uniqueSchedules(
            scheduleMatches.filter(
              (schedule) =>
                matchesSelectedRoute(schedule) && this.matchesScheduleSearch(schedule, searchTerm),
            ),
          );
          const matchingTrainIds = new Set(matchingTrainDetails.map((train) => train.id));
          const matchingScheduleIds = new Set(directionMatches.map((schedule) => schedule.id));
          const matchingSchedules = routeSchedules.filter(
            (schedule) =>
              matchingTrainIds.has(schedule.trainId) || matchingScheduleIds.has(schedule.id),
          );
          if (hasRouteFilter) {
            return { schedules: matchingSchedules, trainDetails: matchingTrainDetails, catalog };
          }

          return {
            schedules: this.uniqueSchedules([...directionMatches, ...matchingSchedules]),
            trainDetails: matchingTrainDetails,
            catalog,
          };
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.trainsLoading.set(false)),
      )
      .subscribe({
        next: ({ schedules, trainDetails, catalog }) => {
          this.trains.set(schedules);
          this.trainDetails.set(trainDetails);
          if (catalog.length) {
            this.allTrainDetails.set(catalog);
          } else if (!searchTerm && !hasRouteFilter) {
            this.allTrainDetails.set(trainDetails);
          }
        },
        error: () => {
          this.trains.set([]);
          this.trainsError.set('Train search results could not be loaded. Please try again later.');
          this.lastResultsKey = '';
        },
      });
  }

  private stationId(name: string): number | null {
    const station = this.stations().find(
      (item) => item.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
    );
    return station?.id ?? null;
  }

  private matchesRoute(schedule: TrainSchedule, origin: string, destination: string): boolean {
    const normalize = (station: string) => station.trim().toLocaleLowerCase();
    return (
      (!origin || normalize(schedule.origin) === normalize(origin)) &&
      (!destination || normalize(schedule.destination) === normalize(destination))
    );
  }

  private matchesTrainSearch(train: TrainSummary, searchTerm: string): boolean {
    const query = searchTerm.trim().toLocaleLowerCase();
    return (
      train.number.toString().includes(query) ||
      train.name.toLocaleLowerCase().includes(query)
    );
  }

  private matchesScheduleSearch(schedule: TrainSchedule, searchTerm: string): boolean {
    const query = searchTerm.trim().toLocaleLowerCase();
    return (
      schedule.trainNumber.toString().includes(query) ||
      schedule.trainName.toLocaleLowerCase().includes(query)
    );
  }

  private uniqueTrainSummaries(trains: TrainSummary[]): TrainSummary[] {
    const unique = new Map<number, TrainSummary>();
    for (const train of trains) {
      if (!unique.has(train.id)) {
        unique.set(train.id, train);
      }
    }
    return [...unique.values()];
  }

  private uniqueSchedules(schedules: TrainSchedule[]): TrainSchedule[] {
    const unique = new Map<number, TrainSchedule>();
    for (const schedule of schedules) {
      if (!unique.has(schedule.trainId)) {
        unique.set(schedule.trainId, schedule);
      }
    }
    return [...unique.values()].sort((first, second) => first.trainNumber - second.trainNumber);
  }

  private applyFilters(): void {
    this.loadResults();
    void this.updateUrl();
  }

  private updateUrl(): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        origin: this.selectedOrigin() || null,
        destination: this.selectedDestination() || null,
        trainNumber: this.trainSearchTerm().trim() || null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
