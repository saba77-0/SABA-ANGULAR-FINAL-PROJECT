import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { TrainService } from '../trains/train.service';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  const trainService = {
    getStations: () => of([{ id: 1, name: 'Tbilisi Central Station' }]),
  };
  const authService = {
    isAuthenticated: signal(false),
    loginNotice: signal(''),
    dismissLoginNotice: vi.fn(() => authService.loginNotice.set('')),
  };

  beforeEach(async () => {
    authService.isAuthenticated.set(false);
    authService.loginNotice.set('');
    authService.dismissLoginNotice.mockClear();
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: TrainService, useValue: trainService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to the trains page with the selected route', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.searchTrains({
      fromStation: 'Tbilisi Central Station',
      toStation: 'Batumi Central Station',
    });

    expect(navigate).toHaveBeenCalledWith(['/trains'], {
      queryParams: {
        origin: 'Tbilisi Central Station',
        destination: 'Batumi Central Station',
      },
    });
  });

  it('shows My Bookings beside Browse Trains for authenticated users', () => {
    authService.isAuthenticated.set(true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Browse Trains');
    expect(element.textContent).toContain('My Bookings');
    expect(element.querySelector<HTMLAnchorElement>('a[href="/profile/bookings"]')).not.toBeNull();
  });

  it('dismisses the home login notice through the auth service', () => {
    authService.loginNotice.set('Login successful!');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.login-notice button')?.click();
    fixture.detectChanges();

    expect(authService.dismissLoginNotice).toHaveBeenCalledOnce();
    expect(authService.loginNotice()).toBe('');
  });
});
