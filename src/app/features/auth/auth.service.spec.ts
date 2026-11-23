import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const sessionKey = 'step_trains_auth_session';
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
    vi.useRealTimers();
    localStorage.removeItem(sessionKey);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  });

  it('rehydrates access and refresh tokens from local storage', () => {
    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
      }),
    );
    service = TestBed.inject(AuthService);

    expect(service.token()).toBe('stored-access-token');
    expect(service.refreshToken()).toBe('stored-refresh-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('migrates the previous token keys to one session record', () => {
    localStorage.setItem('auth_token', 'stored-access-token');
    localStorage.setItem('refresh_token', 'stored-refresh-token');
    service = TestBed.inject(AuthService);

    expect(service.token()).toBe('stored-access-token');
    expect(JSON.parse(localStorage.getItem(sessionKey) ?? '{}')).toEqual({
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    });
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clears a placeholder token during hydration', () => {
    localStorage.setItem('auth_token', 'Verification');
    localStorage.setItem('refresh_token', 'placeholder');
    service = TestBed.inject(AuthService);

    expect(service.token()).toBeNull();
    expect(service.refreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(sessionKey)).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('registers and stores the returned token', () => {
    service = TestBed.inject(AuthService);
    const requestBody = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    };
    const response = { token: 'register-token' };

    service.register(requestBody).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(requestBody);
    request.flush(response);

    expect(JSON.parse(localStorage.getItem(sessionKey) ?? '{}')).toEqual({
      accessToken: response.token,
      refreshToken: null,
    });
  });

  it('accepts a successful registration response without a token', () => {
    service = TestBed.inject(AuthService);
    const requestBody = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    };
    let completed = false;

    service.register(requestBody).subscribe(() => {
      completed = true;
    });

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/register`);
    request.flush({}, { status: 202, statusText: 'Accepted' });

    expect(completed).toBe(true);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('does not store the verification placeholder returned by registration', () => {
    service = TestBed.inject(AuthService);
    service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    }).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/register`);
    request.flush({ token: 'Verification' });

    expect(service.token()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('verifies email codes and resends them to the encoded email address', () => {
    service = TestBed.inject(AuthService);
    service.verifyEmail({ email: 'ada@example.com', code: '123456' }).subscribe();

    const verifyRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/api/auth/verify-email`,
    );
    expect(verifyRequest.request.method).toBe('PUT');
    expect(verifyRequest.request.body).toEqual({ email: 'ada@example.com', code: '123456' });
    verifyRequest.flush({ message: 'Verified' });

    service.resendVerificationCode('ada+test@example.com').subscribe();
    const resendRequest = httpTestingController.expectOne(
      `${environment.apiUrl}/api/auth/resend-email-verification/ada%2Btest%40example.com`,
    );
    expect(resendRequest.request.method).toBe('POST');
    expect(resendRequest.request.body).toBeNull();
    resendRequest.flush({ message: 'Sent' });
  });

  it('requests and completes password resets using the documented operations', () => {
    service = TestBed.inject(AuthService);
    service.requestPasswordReset('ada+test@example.com').subscribe();
    const request = httpTestingController.expectOne(
      `${environment.apiUrl}/api/auth/forget-password/ada%2Btest%40example.com`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    request.flush({ message: 'Sent' });

    const resetRequest = { token: 'reset-token', password: 'new-password' };
    service.resetPassword(resetRequest).subscribe();
    const reset = httpTestingController.expectOne(
      `${environment.apiUrl}/api/auth/reset-password`,
    );
    expect(reset.request.method).toBe('PUT');
    expect(reset.request.body).toEqual(resetRequest);
    reset.flush({ message: 'Reset' });
  });

  it('loads the current user and updates profile details', () => {
    service = TestBed.inject(AuthService);
    service.getCurrentUser().subscribe();
    const userRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/users/me`);
    expect(userRequest.request.method).toBe('GET');
    userRequest.flush({ data: { email: 'ada@example.com' } });

    const profileUpdate = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phoneNumber: null,
      address: 'London',
      pictureUrl: null,
      dateOfBirth: null,
    };
    service.updateProfile(profileUpdate).subscribe();
    const updateRequest = httpTestingController.expectOne(`${environment.apiUrl}/api/users`);
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual(profileUpdate);
    updateRequest.flush({ message: 'Updated' });
  });

  it('logs in and stores the returned token', () => {
    service = TestBed.inject(AuthService);
    const requestBody = {
      email: '  ada@example.com ',
      password: ' secure-password ',
    };
    const response = {
      data: { accessToken: 'login-access-token', refreshToken: 'login-refresh-token' },
    };

    service.login(requestBody).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'ada@example.com',
      password: ' secure-password ',
    });
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    request.flush(response);

    expect(JSON.parse(localStorage.getItem(sessionKey) ?? '{}')).toEqual({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    });
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(service.token()).toBe(response.data.accessToken);
    expect(service.refreshToken()).toBe(response.data.refreshToken);
  });

  it('clears the login success notice after two seconds', () => {
    vi.useFakeTimers();
    service = TestBed.inject(AuthService);
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`);
    request.flush({ accessToken: 'login-access-token' });
    expect(service.loginNotice()).toBe('Login successful!');

    vi.advanceTimersByTime(1999);
    expect(service.loginNotice()).toBe('Login successful!');

    vi.advanceTimersByTime(1);
    expect(service.loginNotice()).toBe('');
  });

  it('clears the active login-notice timer when manually dismissed', () => {
    vi.useFakeTimers();
    service = TestBed.inject(AuthService);
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe();
    httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      accessToken: 'login-access-token',
    });

    service.dismissLoginNotice();
    vi.advanceTimersByTime(2000);

    expect(service.loginNotice()).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts the login-notice timer when another login succeeds', () => {
    vi.useFakeTimers();
    service = TestBed.inject(AuthService);
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe();
    httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      accessToken: 'first-access-token',
    });

    vi.advanceTimersByTime(1000);
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe();
    httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`).flush({
      accessToken: 'second-access-token',
    });

    vi.advanceTimersByTime(1000);
    expect(service.loginNotice()).toBe('Login successful!');
    vi.advanceTimersByTime(1000);
    expect(service.loginNotice()).toBe('');
  });

  it('accepts a top-level access token', () => {
    service = TestBed.inject(AuthService);
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe();

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`);
    request.flush({ accessToken: 'top-level-access-token' });

    expect(JSON.parse(localStorage.getItem(sessionKey) ?? '{}')).toEqual({
      accessToken: 'top-level-access-token',
      refreshToken: null,
    });
  });

  it('rejects the unverified-account placeholder token', () => {
    service = TestBed.inject(AuthService);
    let loginError: unknown;
    service.login({ email: 'ada@example.com', password: 'secure-password' }).subscribe({
      error: (error: unknown) => {
        loginError = error;
      },
    });

    const request = httpTestingController.expectOne(`${environment.apiUrl}/api/auth/login`);
    request.flush({ data: { accessToken: 'Verification', refreshToken: 'placeholder' } });

    expect(loginError).toEqual(
      expect.objectContaining({ message: 'Please verify your account before signing in.' }),
    );
    expect(localStorage.getItem(sessionKey)).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(service.token()).toBeNull();
  });
});
