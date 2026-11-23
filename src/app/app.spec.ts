import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'auth/register', children: [] },
          { path: 'auth/signin', children: [] },
          { path: 'auth/verification/:email', children: [] },
          { path: 'profile', children: [] },
          { path: 'profile/:section', children: [] },
          { path: 'profile/bookings/:id', children: [] },
          { path: '', children: [] },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the shared site navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-header')?.textContent).toContain('STEP');
  });

  it('hides the shared site navigation on auth routes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/auth/signin');
    fixture.detectChanges();
    expect(compiled.querySelector('app-header')).toBeNull();

    await router.navigateByUrl('/auth/register');
    fixture.detectChanges();
    expect(compiled.querySelector('app-header')).toBeNull();
  });

  it('hides the footer on registration, verification, and profile routes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/auth/register');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/auth/verification/test@example.com');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/auth/signin');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).not.toBeNull();

    await router.navigateByUrl('/profile');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/profile/bookings');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/profile/settings');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();

    await router.navigateByUrl('/profile/bookings/1');
    fixture.detectChanges();
    expect(compiled.querySelector('app-footer')).toBeNull();
  });
});
