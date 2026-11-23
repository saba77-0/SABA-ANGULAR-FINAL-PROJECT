import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'trains/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'auth/verification/:email',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile/bookings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile/bookings/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profile/settings',
    renderMode: RenderMode.Client,
  },
  {
    path: 'book',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
