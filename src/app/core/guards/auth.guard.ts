import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return (
    authService.isAuthenticated() ||
    router.createUrlTree(['/auth/signin'], { queryParams: { returnUrl: state.url } })
  );
};
