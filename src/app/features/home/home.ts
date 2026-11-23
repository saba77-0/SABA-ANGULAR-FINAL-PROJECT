import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HeroSearch } from './hero-search';
import { Station, TrainSearch } from '../trains/train.model';
import { TrainService } from '../trains/train.service';
import { AuthService } from '../auth/auth.service';

@Component({
  imports: [HeroSearch, RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly trainService = inject(TrainService);
  private readonly router = inject(Router);

  readonly authService = inject(AuthService);
  readonly stations = signal<Station[]>([]);
  readonly stationsLoading = signal(true);
  readonly stationsError = signal('');

  ngOnInit(): void {
    this.trainService.getStations().subscribe({
      next: (stations) => this.stations.set(stations),
      error: () => {
        this.stationsError.set('Stations could not be loaded. Please try again later.');
        this.stationsLoading.set(false);
      },
      complete: () => this.stationsLoading.set(false),
    });

  }

  searchTrains(criteria: TrainSearch): void {
    void this.router.navigate(['/trains'], {
      queryParams: {
        origin: criteria.fromStation || null,
        destination: criteria.toStation || null,
      },
    });
  }

  dismissLoginNotice(): void {
    this.authService.dismissLoginNotice();
  }
}
