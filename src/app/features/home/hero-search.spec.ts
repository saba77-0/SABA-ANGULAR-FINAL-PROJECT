import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { TrainService } from '../trains/train.service';
import { HeroSearch } from './hero-search';

describe('HeroSearch', () => {
  let component: HeroSearch;
  let fixture: ComponentFixture<HeroSearch>;
  const trainService = {
    getStationsFrom: vi.fn((originId: number) =>
      of(originId === 1 ? [{ id: 2, name: 'Batumi Central Station' }] : []),
    ),
  };

  beforeEach(async () => {
    trainService.getStationsFrom.mockClear();
    await TestBed.configureTestingModule({
      imports: [HeroSearch],
      providers: [{ provide: TrainService, useValue: trainService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroSearch);
    fixture.componentRef.setInput('stations', [
      { id: 1, name: 'Tbilisi Central Station' },
      { id: 2, name: 'Batumi Central Station' },
    ]);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not render a train number field', () => {
    expect(fixture.nativeElement.querySelector('#train-number')).toBeNull();
  });

  it('does not render a travel date field', () => {
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
  });

  it('loads destination options from the station-origin API', () => {
    component.updateOrigin('Tbilisi Central Station');

    expect(component.destinationStations().map((station) => station.name)).toEqual([
      'Batumi Central Station',
    ]);
    expect(trainService.getStationsFrom).toHaveBeenCalledWith(1);

    component.updateOrigin('Batumi Central Station');
    expect(component.destinationStations()).toEqual([]);
    expect(trainService.getStationsFrom).toHaveBeenCalledWith(2);
  });

  it('filters station suggestions and closes them after selection', async () => {
    component.openFromOptions();
    component.updateOrigin('tbil');
    fixture.detectChanges();

    expect(component.filteredOrigins().map((station) => station.name)).toEqual([
      'Tbilisi Central Station',
    ]);

    component.selectOrigin({ id: 1, name: 'Tbilisi Central Station' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.fromOpen()).toBe(false);
    expect(component.selectedOrigin()?.id).toBe(1);
    expect(component.destinationStations()).toEqual([{ id: 2, name: 'Batumi Central Station' }]);

    component.openToOptions();
    component.updateDestination('batu');
    fixture.detectChanges();
    expect(component.filteredDestinations().map((station) => station.name)).toEqual([
      'Batumi Central Station',
    ]);

    component.selectDestination({ id: 2, name: 'Batumi Central Station' });
    fixture.detectChanges();
    expect(component.toOpen()).toBe(false);
    expect(component.toStation()).toBe('Batumi Central Station');
  });

  it('supports keyboard navigation and selection in both station lists', () => {
    component.updateOrigin('Tbilisi');
    component.onOriginKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    component.onOriginKeydown(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));

    expect(component.fromStation()).toBe('Tbilisi Central Station');
    expect(component.destinationStations()).toEqual([{ id: 2, name: 'Batumi Central Station' }]);

    component.openToOptions();
    component.onDestinationKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }),
    );
    component.onDestinationKeydown(
      new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }),
    );

    expect(component.toStation()).toBe('Batumi Central Station');
    expect(component.toOpen()).toBe(false);
  });

  it('closes station suggestions on Escape and outside click', () => {
    component.openFromOptions();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(component.fromOpen()).toBe(false);

    component.selectOrigin({ id: 1, name: 'Tbilisi Central Station' });
    component.openToOptions();
    fixture.detectChanges();
    expect(component.toOpen()).toBe(true);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(component.toOpen()).toBe(false);
  });
});
