import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles the responsive navigation menu and closes it from a menu link', () => {
    const menuButton = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const homeLink = fixture.nativeElement.querySelector('.nav-links a') as HTMLAnchorElement;

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    menuButton.click();
    fixture.detectChanges();

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    homeLink.click();
    fixture.detectChanges();

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows Home, Trains, and My Profile without hiding the profile link', () => {
    const authService = TestBed.inject(AuthService);
    authService.token.set('access-token');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Home');
    expect(fixture.nativeElement.textContent).toContain('Trains');
    expect(fixture.nativeElement.textContent).toContain('My Profile');
    expect(fixture.nativeElement.textContent).not.toContain('Sign Out');
    expect(fixture.nativeElement.textContent).not.toContain('Get Started');

    authService.logout();
    fixture.detectChanges();

    expect(authService.isAuthenticated()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('My Profile');
    expect(fixture.nativeElement.textContent).toContain('Sign In');
    expect(fixture.nativeElement.textContent).toContain('Get Started');
  });
});
