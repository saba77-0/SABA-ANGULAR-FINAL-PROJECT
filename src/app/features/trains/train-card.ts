import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrainSchedule, TrainSummary } from './train.model';

@Component({
  imports: [RouterLink],
  selector: 'app-train-card',
  styleUrl: './train-card.css',
  templateUrl: './train-card.html',
})
export class TrainCard {
  readonly train = input.required<TrainSchedule>();
  readonly details = input<TrainSummary | null>(null);

  useFallbackImage(event: Event): void {
    if (event.target instanceof HTMLImageElement) {
      event.target.src = '/train-placeholder.svg';
    }
  }
}
