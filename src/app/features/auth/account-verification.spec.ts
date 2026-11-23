import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountVerification } from './account-verification';
import { AuthService } from './auth.service';

describe('AccountVerification', () => {
  let fixture: ComponentFixture<AccountVerification>;
  let component: AccountVerification;
  const authService = {
    verifyEmail: vi.fn(() => of({})),
    resendVerificationCode: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    authService.verifyEmail.mockClear();
    authService.resendVerificationCode.mockClear();
    await TestBed.configureTestingModule({
      imports: [AccountVerification],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => 'ada@example.com' },
              queryParamMap: { get: (name: string) => (name === 'returnUrl' ? '/trains' : null) },
              queryParams: { returnUrl: '/trains' },
            },
          },
        },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountVerification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the split verification screen with all existing actions', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.verification-page')).not.toBeNull();
    expect(element.querySelector('.verification-promo')?.textContent).toContain('Almost There!');
    expect(element.querySelector('.verification-benefits')?.textContent).toContain(
      'Secure Account',
    );
    expect(element.querySelector('.verification-card h2')?.textContent).toContain(
      'Verify Your Email',
    );
    expect(element.querySelector('[name="code"]')).not.toBeNull();
    expect(element.querySelector('.resend-button')).not.toBeNull();
    expect(element.querySelector('.verification-footer a')).not.toBeNull();
  });

  it('verifies the email code and returns to sign in with the original destination', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.code.set('123456');

    component.verify();

    expect(authService.verifyEmail).toHaveBeenCalledWith({
      email: 'ada@example.com',
      code: '123456',
    });
    expect(navigate).toHaveBeenCalledWith(['/auth/signin'], {
      queryParams: { verified: 'true', returnUrl: '/trains' },
    });
  });

  it('does not submit an invalid verification code', () => {
    component.code.set('123');

    component.verify();

    expect(authService.verifyEmail).not.toHaveBeenCalled();
    expect(component.error()).toContain('6-digit');
  });

  it('auto-dismisses the resend notice after two seconds and supports manual close', () => {
    vi.useFakeTimers();
    try {
      component.message.set('A new verification code has been sent to your email.');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.verification-toast button')).not.toBeNull();

      vi.advanceTimersByTime(1999);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.verification-toast')).not.toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.verification-toast')).toBeNull();

      component.message.set('Another verification notice');
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('.verification-toast button')?.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.verification-toast')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
