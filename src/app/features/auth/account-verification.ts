import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-account-verification',
  styleUrl: './account-verification.css',
  templateUrl: './account-verification.html',
})
export class AccountVerification {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly email = this.route.snapshot.paramMap.get('email') ?? '';
  readonly code = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly queryParams = this.route.snapshot.queryParams;

  constructor() {
    effect((onCleanup) => {
      if (!this.message()) return;

      const timeoutId = setTimeout(() => this.message.set(''), 2000);
      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  dismissMessage(): void {
    this.message.set('');
  }

  verify(): void {
    const code = this.code().trim();
    if (!this.email || !/^\d{6}$/.test(code)) {
      this.error.set('Enter the 6-digit verification code sent to your email.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    this.authService
      .verifyEmail({ email: this.email, code })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () =>
          void this.router.navigate(['/auth/signin'], {
            queryParams: { verified: 'true', returnUrl: this.returnUrl() },
          }),
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  resendCode(): void {
    if (!this.email) {
      this.error.set('The verification email address is missing.');
      return;
    }

    this.error.set('');
    this.message.set('');
    this.resending.set(true);
    this.authService
      .resendVerificationCode(this.email)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resending.set(false)),
      )
      .subscribe({
        next: () => {
          this.code.set('');
          this.message.set('A new verification code has been sent to your email.');
        },
        error: (error: unknown) => this.error.set(this.errorMessage(error)),
      });
  }

  private returnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Unable to reach the authentication service. Please try again.';
      }
      const detail = error.error?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
      if (typeof error.error?.message === 'string') {
        return error.error.message;
      }
    } else if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Account verification failed. Check the code and try again.';
  }
}
