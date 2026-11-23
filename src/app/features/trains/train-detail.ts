import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, switchMap, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TrainDetails } from './train.model';
import { TrainService } from './train.service';

type TrainDetailTab = 'schedules' | 'coaches';

@Component({
  imports: [RouterLink],
  selector: 'app-train-detail',
  styleUrl: './train-detail.css',
  templateUrl: './train-detail.html',
})
export class TrainDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trainService = inject(TrainService);

  readonly authService = inject(AuthService);
  readonly train = signal<TrainDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeTab = signal<TrainDetailTab>('schedules');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          const id = Number(params.get('id'));
          this.train.set(null);

          if (!Number.isInteger(id) || id < 1) {
            this.loading.set(false);
            this.error.set('This train could not be found.');
            return EMPTY;
          }

          this.loading.set(true);
          this.error.set('');
          return this.trainService.getTrainById(id).pipe(
            tap((train) => this.train.set(train)),
            catchError(() => {
              this.error.set('Train details could not be loaded. Please try again later.');
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
      )
      .subscribe();
  }

  useFallbackImage(event: Event): void {
    if (event.target instanceof HTMLImageElement) {
      event.target.src = '/train-placeholder.svg';
    }
  }

  bookingReturnUrl(scheduleId: number, trainId: number): string {
    return `/book?scheduledId=${scheduleId}&trainId=${trainId}`;
  }
}
