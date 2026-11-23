import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
  });

  afterEach(() => {
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  });

  it('redirects unauthenticated visitors to sign in with their return path', () => {
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/profile' } as RouterStateSnapshot),
    );

    expect(router.serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe(
      '/auth/signin?returnUrl=%2Fprofile',
    );
  });

  it('allows authenticated visitors to continue', () => {
    TestBed.inject(AuthService).token.set('access-token');
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/profile' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });
});
