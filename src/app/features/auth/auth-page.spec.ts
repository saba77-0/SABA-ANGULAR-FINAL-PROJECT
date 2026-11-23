import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthPage } from './auth-page';
import { AuthResponse, RegisterResponse } from './auth.model';
import { AuthService } from './auth.service';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  let component: AuthPage;
  const returnUrl = '/trains?origin=Tbilisi%20Central%20Station&destination=Batumi';
  let queryReturnUrl: string | null;
  let queryToken: string | null;
  const routeData = { mode: 'register' };
  let queryVerified: string | null;
  const authService = {
    register: vi.fn((): Observable<RegisterResponse | null> => of({ token: 'register-token' })),
    login: vi.fn((): Observable<AuthResponse> => of({ token: 'login-token' })),
    resetPassword: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    queryReturnUrl = returnUrl;
    queryToken = 'reset-token';
    queryVerified = null;
    routeData.mode = 'register';
    authService.register.mockClear();
    authService.login.mockClear();
    authService.resetPassword.mockClear();
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: routeData,
              queryParamMap: {
                get: (name: string) =>
                  name === 'token'
                    ? queryToken
                    : name === 'returnUrl'
                      ? queryReturnUrl
                      : name === 'verified'
                        ? queryVerified
                        : null,
              },
              queryParams: { returnUrl },
            },
          },
        },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createSignInComponent(): void {
    fixture.destroy();
    routeData.mode = 'signin';
    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function createResetComponent(): void {
    fixture.destroy();
    routeData.mode = 'reset';
    fixture = TestBed.createComponent(AuthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders the registration split-screen and preserves its form fields', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.auth-page.auth-split-page')).not.toBeNull();
    expect(element.querySelector('.auth-card')).not.toBeNull();
    expect(element.querySelector('.auth-promo')?.textContent).toContain('STEP TRAINS');
    expect(element.querySelector('.auth-promo')?.textContent).toContain('500+');
    expect(element.querySelector('.auth-promo')?.textContent).toContain('50+');
    expect(element.querySelector('.auth-promo')?.textContent).toContain('24/7');
    expect(element.querySelector('h1')?.textContent).toContain('Create Your Account');
    expect(element.querySelector('[name="firstName"]')).not.toBeNull();
    expect(element.querySelector('[name="lastName"]')).not.toBeNull();
    expect(element.querySelector('[name="email"]')).not.toBeNull();
    expect(element.querySelector('[name="password"]')).not.toBeNull();
  });

  it('renders the split-screen design for sign-in without changing its controls', () => {
    createSignInComponent();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.auth-page.auth-split-page')).not.toBeNull();
    expect(element.querySelector('.auth-promo')?.textContent).toContain('STEP TRAINS');
    expect(element.querySelector('[name="email"]')).not.toBeNull();
    expect(element.querySelector('[name="password"]')).not.toBeNull();
    expect(element.querySelector('[name="rememberMe"]')).not.toBeNull();
  });

  it('starts Remember me unchecked by default', () => {
    createSignInComponent();

    const element = fixture.nativeElement as HTMLElement;
    const rememberMe = element.querySelector<HTMLInputElement>('[name="rememberMe"]');

    expect(rememberMe?.checked).toBe(false);
  });

  it('dismisses the verified-email status message after two seconds and supports manual close', () => {
    vi.useFakeTimers();
    queryVerified = 'true';
    createSignInComponent();

    const element = fixture.nativeElement as HTMLElement;
    try {
      expect(element.querySelector('.auth-success')?.textContent).toContain(
        'Your email has been verified. Please sign in to continue.',
      );
      expect(element.querySelector('.auth-success button')).not.toBeNull();

      vi.advanceTimersByTime(1999);
      fixture.detectChanges();
      expect(element.querySelector('.auth-success')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(element.querySelector('.auth-success')).toBeNull();

      component.successMessage.set('Another success message');
      fixture.detectChanges();
      element.querySelector<HTMLButtonElement>('.auth-success button')?.click();
      fixture.detectChanges();
      expect(element.querySelector('.auth-success')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns to the requested train search after successful registration', () => {
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.firstName.set('Ada');
    component.lastName.set('Lovelace');
    component.email.set('ada@example.com');
    component.password.set('secure-password');

    component.submit();

    expect(authService.register).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure-password',
    });
    expect(navigateByUrl).toHaveBeenCalledWith(returnUrl);
  });

  it('signs in after tokenless registration and defaults to the root route', () => {
    queryReturnUrl = null;
    authService.register.mockReturnValueOnce(of(null));
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    component.firstName.set('Ada');
    component.lastName.set('Lovelace');
    component.email.set('ada@example.com');
    component.password.set('secure-password');

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'secure-password',
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('routes registrations requiring verification to the code entry page', () => {
    authService.register.mockReturnValueOnce(of({ token: 'Verification' }));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.firstName.set('Ada');
    component.lastName.set('Lovelace');
    component.email.set('ada@example.com');
    component.password.set('secure-password');

    component.submit();

    expect(authService.login).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/auth/verification', 'ada@example.com'], {
      queryParams: { returnUrl },
    });
  });

  it('displays duplicate-registration API details', () => {
    authService.register.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { detail: 'An account with this email already exists.' },
          }),
      ),
    );
    component.firstName.set('Ada');
    component.lastName.set('Lovelace');
    component.email.set('ada@example.com');
    component.password.set('secure-password');

    component.submit();

    expect(component.error()).toBe('An account with this email already exists.');
  });

  it('trims sign-in email, preserves password, and returns home after successful sign-in', () => {
    createSignInComponent();
    queryReturnUrl = returnUrl;
    component.email.set(' ada@example.com ');
    component.password.set(' secure-password ');
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    component.submit();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: ' secure-password ',
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('logs and displays the exact API detail for sign-in errors', () => {
    createSignInComponent();
    authService.login.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { detail: 'The account has not been verified.' },
          }),
      ),
    );
    component.email.set('ada@example.com');
    component.password.set('secure-password');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.submit();

    expect(component.error()).toBe('The account has not been verified.');
    expect(logError).toHaveBeenCalledWith('Sign-in request failed.', expect.any(HttpErrorResponse));
    logError.mockRestore();
  });

  it('displays the API message when no detail is provided', () => {
    createSignInComponent();
    authService.login.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Invalid credentials.' },
          }),
      ),
    );
    component.email.set('ada@example.com');
    component.password.set('secure-password');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.submit();

    expect(component.error()).toBe('Invalid credentials.');
  });

  it('offers verification when sign-in reports an unverified account', () => {
    createSignInComponent();
    authService.login.mockReturnValueOnce(
      throwError(() => new Error('Please verify your account before signing in.')),
    );
    component.email.set('ada@example.com');
    component.password.set('secure-password');

    component.submit();
    fixture.detectChanges();

    expect(component.verificationRequired()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Enter your verification code');
  });

  it('submits a reset token and new password to the reset endpoint', () => {
    createResetComponent();
    component.password.set('new-password');

    component.submit();

    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      password: 'new-password',
    });
    expect(component.successMessage()).toBe('Your password has been reset. Please sign in.');
  });
});
