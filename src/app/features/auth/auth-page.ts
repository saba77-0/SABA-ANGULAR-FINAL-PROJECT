import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { RegisterResponse } from './auth.model';
import { AuthService } from './auth.service';

type AuthMode = 'register' | 'signin' | 'forgot' | 'reset';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-auth-page',
  styleUrl: './auth-page.css',
  templateUrl: './auth-page.html',
})
export class AuthPage {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode: AuthMode =
    this.route.snapshot.data['mode'] === 'register'
      ? 'register'
      : this.route.snapshot.data['mode'] === 'forgot'
        ? 'forgot'
        : this.route.snapshot.data['mode'] === 'reset'
          ? 'reset'
          : 'signin';
  readonly authQueryParams = this.route.snapshot.queryParams;
  readonly resetToken = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly rememberMe = signal(false);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly verificationRequired = signal(false);
  readonly successMessage = signal(
    this.route.snapshot.queryParamMap.get('verified') === 'true'
      ? 'Your email has been verified. Please sign in to continue.'
      : this.route.snapshot.queryParamMap.get('passwordReset') === 'true'
        ? 'Your password has been reset. Please sign in.'
        : '',
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.successMessage()) return;

      const timeoutId = setTimeout(() => this.successMessage.set(''), 2000);
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  dismissSuccessMessage(): void {
    this.successMessage.set('');
  }

  submit(): void {
    const email = this.email().trim();
    const password = this.password();
    const invalidEmail =
      this.mode !== 'reset' &&
      (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (
      invalidEmail ||
      (this.mode !== 'forgot' && !password) ||
      (this.mode === 'register' &&
        (password.length < 6 || !this.firstName().trim() || !this.lastName().trim())) ||
      (this.mode === 'reset' && (password.length < 6 || !this.resetToken))
    ) {
      this.error.set(
        this.mode === 'register'
          ? 'Complete all required fields with a valid email address and a password of at least 6 characters.'
          : this.mode === 'reset'
            ? 'A valid reset link and a password of at least 6 characters are required.'
            : 'Enter a valid email address and complete all required fields.',
      );
      return;
    }

    this.error.set('');
    this.verificationRequired.set(false);
    this.successMessage.set('');
    this.submitting.set(true);
    let usedLoginFallback = false;
    let registrationRequiresVerification = false;
    const request$ =
      this.mode === 'forgot'
        ? this.authService.requestPasswordReset(email)
        : this.mode === 'reset'
          ? this.authService.resetPassword({ token: this.resetToken, password })
          : this.mode === 'register'
            ? this.authService
                .register({
                  firstName: this.firstName().trim(),
                  lastName: this.lastName().trim(),
                  email,
                  password,
                })
                .pipe(
                  switchMap((response) => {
                    if (this.hasVerificationPlaceholder(response)) {
                      registrationRequiresVerification = true;
                      return of(response);
                    }

                    if (this.hasRegistrationToken(response)) {
                      return of(response);
                    }

                    usedLoginFallback = true;
                    return this.authService.login({ email, password });
                  }),
                )
            : this.authService.login({ email, password });

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          if (this.mode === 'forgot') {
            this.successMessage.set('If an account exists for this email, a reset link has been sent.');
            return;
          }
          if (this.mode === 'reset') {
            this.successMessage.set('Your password has been reset. Please sign in.');
            return;
          }
          if (registrationRequiresVerification) {
            this.navigateToVerification(email);
            return;
          }
          void this.router.navigateByUrl(this.mode === 'signin' ? '/' : this.returnUrl());
        },
        error: (error: unknown) => {
          if (this.mode === 'signin') {
            console.error('Sign-in request failed.', error);
          }
          if (this.isVerificationError(error)) {
            if (this.mode === 'register') {
              this.navigateToVerification(email);
              return;
            }
            this.verificationRequired.set(true);
            this.error.set(this.loginErrorMessage(error));
            return;
          }
          this.error.set(
            usedLoginFallback
              ? 'Your account was created, but automatic sign in failed. Please sign in.'
              : this.mode === 'signin'
                ? this.loginErrorMessage(error)
                : this.errorMessage(error),
          );
        },
      });
  }

  private hasRegistrationToken(response: RegisterResponse | null): boolean {
    return [
      response?.data?.accessToken,
      response?.accessToken,
      response?.data?.token,
      response?.token,
    ].some(
      (candidate) =>
        typeof candidate === 'string' &&
        !!candidate.trim() &&
        candidate.trim().toLocaleLowerCase() !== 'verification',
    );
  }

  private hasVerificationPlaceholder(response: RegisterResponse | null): boolean {
    return [
      response?.data?.accessToken,
      response?.accessToken,
      response?.data?.token,
      response?.token,
    ].some(
      (candidate) =>
        typeof candidate === 'string' &&
        candidate.trim().toLocaleLowerCase() === 'verification',
    );
  }

  private navigateToVerification(email: string): void {
    void this.router.navigate(['/auth/verification', email], {
      queryParams: { returnUrl: this.returnUrl() },
    });
  }

  private returnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
  }

  private apiErrorMessage(error: HttpErrorResponse): string | null {
    const detail = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: unknown) => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item !== null && 'msg' in item) {
            return typeof item.msg === 'string' ? item.msg : null;
          }
          return null;
        })
        .filter((message): message is string => !!message);
      if (messages.length) {
        return messages.join(' ');
      }
    }

    return typeof error.error?.message === 'string' ? error.error.message : null;
  }

  private isVerificationError(error: unknown): boolean {
    const message =
      error instanceof HttpErrorResponse
        ? this.apiErrorMessage(error)
        : error instanceof Error
          ? error.message
          : null;
    return !!message && /verif/i.test(message);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Unable to reach the authentication service. Please try again.';
    }

    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.apiErrorMessage(error);
      if (apiMessage) {
        return apiMessage;
      }
    }

    if (this.mode === 'register') {
      return 'Your account could not be created. Please try again.';
    }

    return this.mode === 'reset'
      ? 'Password could not be reset. Please try again.'
      : 'Password reset could not be requested. Please try again.';
  }

  private loginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.apiErrorMessage(error);
      if (apiMessage) {
        return apiMessage;
      }
      if (error.status === 0) {
        return 'Unable to reach the authentication service. Please try again.';
      }
    } else if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Sign in failed. Check your details and try again.';
  }
}
