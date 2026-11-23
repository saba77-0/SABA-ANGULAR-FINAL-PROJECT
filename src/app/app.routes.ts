import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'STEP Trains | Travel smarter',
    loadComponent: () => import('./features/home/home').then((module) => module.Home),
  },
  {
    path: 'auth/register',
    title: 'Create account | STEP Trains',
    data: { mode: 'register' },
    loadComponent: () => import('./features/auth/auth-page').then((module) => module.AuthPage),
  },
  {
    path: 'auth/signin',
    title: 'Sign in | STEP Trains',
    data: { mode: 'signin' },
    loadComponent: () => import('./features/auth/auth-page').then((module) => module.AuthPage),
  },
  {
    path: 'auth/login',
    redirectTo: 'auth/signin',
  },
  {
    path: 'auth/forgot-password',
    title: 'Reset password | STEP Trains',
    data: { mode: 'forgot' },
    loadComponent: () => import('./features/auth/auth-page').then((module) => module.AuthPage),
  },
  {
    path: 'auth/reset-password',
    title: 'Reset password | STEP Trains',
    data: { mode: 'reset' },
    loadComponent: () => import('./features/auth/auth-page').then((module) => module.AuthPage),
  },
  {
    path: 'auth/verification/:email',
    title: 'Verify account | STEP Trains',
    loadComponent: () =>
      import('./features/auth/account-verification').then((module) => module.AccountVerification),
  },
  {
    path: 'profile',
    title: 'Profile | STEP Trains',
    canActivate: [authGuard],
    data: { section: 'profile' },
    loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
  },
  {
    path: 'profile/bookings',
    title: 'My bookings | STEP Trains',
    canActivate: [authGuard],
    data: { section: 'bookings' },
    loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
  },
  {
    path: 'profile/bookings/:id',
    title: 'Booking details | STEP Trains',
    canActivate: [authGuard],
    data: { section: 'booking-details' },
    loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
  },
  {
    path: 'profile/settings',
    title: 'Account settings | STEP Trains',
    canActivate: [authGuard],
    data: { section: 'settings' },
    loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
  },
  {
    path: 'book',
    title: 'Book a train | STEP Trains',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/booking/booking-flow').then((module) => module.BookingFlow),
  },
  {
    path: 'trains/:id',
    title: 'Train details | STEP Trains',
    loadComponent: () =>
      import('./features/trains/train-detail').then((module) => module.TrainDetail),
  },
  {
    path: 'trains',
    title: 'Available trains | STEP Trains',
    loadComponent: () =>
      import('./features/trains/train-list').then((module) => module.TrainList),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
