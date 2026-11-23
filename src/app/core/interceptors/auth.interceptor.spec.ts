import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('step_trains_auth_session');
    localStorage.removeItem('auth_token');
  });

  it('attaches the bearer token only to requests for the train API', () => {
    localStorage.setItem('auth_token', 'stored-token');
    TestBed.inject(AuthService);

    TestBed.inject(HttpClient).get(`${environment.apiUrl}/api/stations`).subscribe();

    const apiRequest = http.expectOne(`${environment.apiUrl}/api/stations`);
    expect(apiRequest.request.headers.get('Authorization')).toBe('Bearer stored-token');
    apiRequest.flush({ data: [] });
  });

  it('does not attach a bearer token without an authenticated session', () => {
    TestBed.inject(HttpClient).get('https://other.example.test/resource').subscribe();

    const request = http.expectOne('https://other.example.test/resource');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
