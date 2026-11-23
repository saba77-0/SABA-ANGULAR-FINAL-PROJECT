import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of, Subject, switchMap } from 'rxjs';
import { Station, TrainSearch } from '../trains/train.model';
import { TrainService } from '../trains/train.service';

@Component({
  imports: [FormsModule],
  selector: 'app-hero-search',
  styleUrl: './hero-search.css',
  templateUrl: './hero-search.html',
})
export class HeroSearch {
  private readonly trainService = inject(TrainService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly originChanges = new Subject<number | null>();

  readonly stations = input.required<Station[]>();
  readonly search = output<TrainSearch>();
  readonly fromStation = signal('');
  readonly toStation = signal('');
  readonly destinationStations = signal<Station[]>([]);
  readonly destinationLoading = signal(false);
  readonly destinationError = signal('');
  readonly validationMessage = signal('');
  readonly fromOpen = signal(false);
  readonly toOpen = signal(false);
  readonly activeOriginIndex = signal(-1);
  readonly activeDestinationIndex = signal(-1);
  readonly dropdownAbove = signal(false);
  readonly dropdownMaxHeight = signal(288);
  readonly selectedOrigin = computed(() => {
    const name = this.fromStation().trim().toLocaleLowerCase();
    return this.stations().find((station) => station.name.trim().toLocaleLowerCase() === name) ?? null;
  });
  readonly filteredOrigins = computed(() => this.filterStations(this.stations(), this.fromStation()));
  readonly filteredDestinations = computed(() =>
    this.filterStations(this.destinationStations(), this.toStation()),
  );

  constructor() {
    this.originChanges
      .pipe(
        switchMap((originId) => {
          this.destinationError.set('');
          if (originId === null) {
            this.destinationLoading.set(false);
            return of([]);
          }
          this.destinationLoading.set(true);
          return this.trainService.getStationsFrom(originId).pipe(
            catchError(() => {
              this.destinationError.set(
                'Destination stations could not be loaded. Please try again.',
              );
              return of([]);
            }),
            finalize(() => this.destinationLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((stations) => this.destinationStations.set(stations));
  }

  updateOrigin(value: string): void {
    this.fromStation.set(value);
    this.toStation.set('');
    this.validationMessage.set('');
    this.fromOpen.set(true);
    this.toOpen.set(false);
    this.activeOriginIndex.set(-1);
    this.activeDestinationIndex.set(-1);
    this.updateDropdownPlacement('.search-field--origin');
    this.destinationStations.set([]);
    this.originChanges.next(this.selectedOrigin()?.id ?? null);
  }

  openFromOptions(): void {
    this.toOpen.set(false);
    this.fromOpen.set(true);
    this.activeOriginIndex.set(-1);
    this.activeDestinationIndex.set(-1);
    this.updateDropdownPlacement('.search-field--origin');
  }

  openToOptions(): void {
    if (!this.selectedOrigin()) {
      return;
    }

    this.fromOpen.set(false);
    this.toOpen.set(true);
    this.activeOriginIndex.set(-1);
    this.activeDestinationIndex.set(-1);
    this.updateDropdownPlacement('.search-field--destination');
  }

  selectOrigin(station: Station): void {
    this.updateOrigin(station.name);
    this.fromOpen.set(false);
  }

  updateDestination(value: string): void {
    this.toStation.set(value);
    this.validationMessage.set('');
    this.toOpen.set(true);
    this.activeDestinationIndex.set(-1);
  }

  selectDestination(station: Station): void {
    this.toStation.set(station.name);
    this.validationMessage.set('');
    this.toOpen.set(false);
  }

  closeSuggestions(): void {
    this.fromOpen.set(false);
    this.toOpen.set(false);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSuggestions();
    }
  }

  onOriginKeydown(event: KeyboardEvent): void {
    if (!this.fromOpen()) {
      return;
    }

    const options = this.filteredOrigins();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeOriginIndex.update((index) =>
        this.nextActiveIndex(index, options.length, event.key === 'ArrowDown' ? 1 : -1),
      );
    } else if (event.key === 'Enter' && options.length) {
      event.preventDefault();
      this.selectOrigin(options[Math.min(Math.max(this.activeOriginIndex(), 0), options.length - 1)]);
    }
  }

  onDestinationKeydown(event: KeyboardEvent): void {
    if (!this.toOpen()) {
      return;
    }

    const options = this.filteredDestinations();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeDestinationIndex.update((index) =>
        this.nextActiveIndex(index, options.length, event.key === 'ArrowDown' ? 1 : -1),
      );
    } else if (event.key === 'Enter' && options.length) {
      event.preventDefault();
      this.selectDestination(
        options[Math.min(Math.max(this.activeDestinationIndex(), 0), options.length - 1)],
      );
    }
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.refreshDropdownPlacement();
  }

  @HostListener('window:scroll')
  onViewportScroll(): void {
    this.refreshDropdownPlacement();
  }

  private refreshDropdownPlacement(): void {
    if (this.fromOpen()) {
      this.updateDropdownPlacement('.search-field--origin');
    } else if (this.toOpen()) {
      this.updateDropdownPlacement('.search-field--destination');
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (
      !(event.target instanceof Node) ||
      !this.elementRef.nativeElement.contains(event.target)
    ) {
      this.closeSuggestions();
    }
  }

  submitSearch(): void {
    this.closeSuggestions();
    const fromStation = this.fromStation().trim();
    const toStation = this.toStation().trim();

    if (!fromStation || !toStation) {
      this.validationMessage.set('Choose both a departure and arrival station.');
      return;
    }

    if (this.destinationLoading()) {
      this.validationMessage.set('Wait for destination stations to finish loading.');
      return;
    }

    if (
      fromStation.toLocaleLowerCase() === toStation.toLocaleLowerCase() ||
      !this.destinationStations().some(
        (station) => station.name.toLocaleLowerCase() === toStation.toLocaleLowerCase(),
      )
    ) {
      this.validationMessage.set('Choose a destination served by this origin station.');
      return;
    }

    this.validationMessage.set('');
    this.search.emit({
      fromStation,
      toStation,
    });
  }

  private filterStations(stations: Station[], value: string): Station[] {
    const query = value.trim().toLocaleLowerCase();
    return query
      ? stations.filter((station) => station.name.toLocaleLowerCase().includes(query))
      : stations;
  }

  private nextActiveIndex(index: number, optionCount: number, direction: 1 | -1): number {
    if (!optionCount) {
      return -1;
    }

    if (index < 0) {
      return direction === 1 ? 0 : optionCount - 1;
    }

    return (index + direction + optionCount) % optionCount;
  }

  private updateDropdownPlacement(fieldSelector: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const root = this.elementRef.nativeElement as HTMLElement;
    const field = root.querySelector<HTMLElement>(fieldSelector);
    if (!field) {
      return;
    }

    const fieldBounds = field.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAbove = Math.max(0, fieldBounds.top - 8);
    const spaceBelow = Math.max(0, viewportHeight - fieldBounds.bottom - 8);
    const maxHeight = Math.min(288, viewportHeight * 0.4);
    const openAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;

    this.dropdownAbove.set(openAbove);
    this.dropdownMaxHeight.set(Math.floor(Math.min(maxHeight, openAbove ? spaceAbove : spaceBelow)));
  }
}
