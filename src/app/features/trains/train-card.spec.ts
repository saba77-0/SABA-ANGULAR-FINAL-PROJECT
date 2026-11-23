import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TrainCard } from './train-card';

describe('TrainCard', () => {
  let component: TrainCard;
  let fixture: ComponentFixture<TrainCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainCard);
    fixture.componentRef.setInput('train', {
      id: 1,
      origin: 'Tbilisi Central Station',
      destination: 'Batumi Central Station',
      departureTime: '08:00:00',
      trainId: 1,
      trainName: 'Tbilisi Express',
      trainNumber: 101,
    });
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
