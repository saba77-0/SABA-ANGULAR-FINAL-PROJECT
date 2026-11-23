import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdateRequest,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  UserProfileResponse,
  VerificationRequest,
} from './auth.model';

const AUTH_SESSION_KEY = 'step_trains_auth_session';
const LEGACY_ACCESS_TOKEN_KEY = 'auth_token';
const LEGACY_REFRESH_TOKEN_KEY = 'refresh_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;
  private loginNoticeTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly token = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly loginNotice = signal('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSession();
    }
  }

  register(request: RegisterRequest): Observable<RegisterResponse | null> {
    return this.http
      .post<RegisterResponse | null>(`${this.apiUrl}/api/auth/register`, request)
      .pipe(
        tap((response) => {
          const accessToken = this.accessTokenFrom(response);
          if (accessToken) {
            this.saveTokens(accessToken, this.refreshTokenFrom(response));
          }
        }),
      );
  }

  verifyEmail(request: VerificationRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/api/auth/verify-email`, request);
  }

  resendVerificationCode(email: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/api/auth/resend-email-verification/${encodeURIComponent(email)}`,
      null,
    );
  }

  getCurrentUser(): Observable<UserProfileResponse | null> {
    return this.http.get<UserProfileResponse | null>(`${this.apiUrl}/api/users/me`);
  }

  updateProfile(request: ProfileUpdateRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/api/users`, request);
  }

  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/api/auth/forget-password/${encodeURIComponent(email)}`,
      null,
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/api/auth/reset-password`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/api/users/change-password`, request);
  }

  deleteProfile(): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/api/users/delete-profile`);
  }

  login(request: LoginRequest): Observable<AuthResponse | null> {
    return this.http
      .post<AuthResponse | null>(
        `${this.apiUrl}/api/auth/login`,
        {
          email: request.email.trim(),
          password: request.password,
        },
        { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) },
      )
      .pipe(
        tap((response) => {
          const accessToken = this.accessTokenFrom(response);
          if (!accessToken) {
            const isVerificationPlaceholder = this.hasVerificationPlaceholder(response);
            this.logout();
            throw new Error(
              isVerificationPlaceholder
                ? 'Please verify your account before signing in.'
                : 'The authentication response did not include an access token.',
            );
          }

          this.saveTokens(accessToken, this.refreshTokenFrom(response));
          this.showLoginSuccessNotice();
        }),
      );
  }

  private showLoginSuccessNotice(): void {
    this.clearLoginNoticeTimeout();
    this.loginNotice.set('Login successful!');
    this.loginNoticeTimeout = setTimeout(() => {
      this.loginNotice.set('');
      this.loginNoticeTimeout = null;
    }, 2000);
  }

  private clearLoginNoticeTimeout(): void {
    if (this.loginNoticeTimeout !== null) {
      clearTimeout(this.loginNoticeTimeout);
      this.loginNoticeTimeout = null;
    }
  }

  private accessTokenFrom(response: AuthResponse | null): string | null {
    const candidates = [
      response?.data?.accessToken,
      response?.accessToken,
      response?.data?.token,
      response?.token,
    ];
    return (
      candidates.find((candidate): candidate is string =>
        this.isValidAccessToken(candidate ?? null),
      )?.trim() ?? null
    );
  }

  private refreshTokenFrom(response: AuthResponse | null): string | null {
    const refreshToken = [response?.data?.refreshToken, response?.refreshToken].find(
      (candidate) => typeof candidate === 'string' && candidate.trim(),
    );
    return typeof refreshToken === 'string' ? refreshToken.trim() : null;
  }

  private hasVerificationPlaceholder(response: AuthResponse | null): boolean {
    return [
      response?.data?.accessToken,
      response?.accessToken,
      response?.data?.token,
      response?.token,
    ].some((candidate) => this.isVerificationPlaceholder(candidate));
  }

  private saveTokens(accessToken: string, refreshToken: string | null): void {
    const normalizedAccessToken = accessToken.trim();
    const normalizedRefreshToken = refreshToken?.trim() || null;
    if (!this.isValidAccessToken(normalizedAccessToken)) {
      throw new Error('The authentication response did not include a token.');
    }

    if (isPlatformBrowser(this.platformId)) {
      const session: AuthSession = {
        accessToken: normalizedAccessToken,
        refreshToken: normalizedRefreshToken,
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      this.removeLegacyTokens();
    }
    this.token.set(normalizedAccessToken);
    this.refreshToken.set(normalizedRefreshToken);
  }

  logout(): void {
    this.clearStoredSession();
    this.token.set(null);
    this.refreshToken.set(null);
    this.dismissLoginNotice();
  }

  dismissLoginNotice(): void {
    this.clearLoginNoticeTimeout();
    this.loginNotice.set('');
  }

  private isValidAccessToken(token: string | null | undefined): token is string {
    const normalizedToken = token?.trim();
    return !!normalizedToken && !this.isVerificationPlaceholder(normalizedToken);
  }

  private isVerificationPlaceholder(token: string | null | undefined): boolean {
    return typeof token === 'string' && token.trim().toLocaleLowerCase() === 'verification';
  }

  private restoreSession(): void {
    const storedSession = localStorage.getItem(AUTH_SESSION_KEY);
    if (storedSession) {
      try {
        const parsed: unknown = JSON.parse(storedSession);
        if (this.isAuthSession(parsed) && this.isValidAccessToken(parsed.accessToken)) {
          this.token.set(parsed.accessToken.trim());
          this.refreshToken.set(parsed.refreshToken?.trim() || null);
          this.removeLegacyTokens();
          return;
        }
      } catch {
        this.clearStoredSession();
        return;
      }

      this.clearStoredSession();
      return;
    }

    const legacyAccessToken = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    const legacyRefreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    if (this.isValidAccessToken(legacyAccessToken)) {
      this.saveTokens(legacyAccessToken, legacyRefreshToken);
      return;
    }

    this.clearStoredSession();
  }

  private isAuthSession(value: unknown): value is AuthSession {
    return (
      typeof value === 'object' &&
      value !== null &&
      'accessToken' in value &&
      typeof value.accessToken === 'string' &&
      (!('refreshToken' in value) ||
        value.refreshToken === null ||
        typeof value.refreshToken === 'string')
    );
  }

  private removeLegacyTokens(): void {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  }

  private clearStoredSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      this.removeLegacyTokens();
    }
  }
}
