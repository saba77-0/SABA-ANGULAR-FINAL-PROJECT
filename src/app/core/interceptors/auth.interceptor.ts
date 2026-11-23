import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/auth.service';

const apiOrigin = new URL(environment.apiUrl).origin;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const requestOrigin = new URL(request.url, environment.apiUrl).origin;
  const token = inject(AuthService).token();

  if (requestOrigin !== apiOrigin || !token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
