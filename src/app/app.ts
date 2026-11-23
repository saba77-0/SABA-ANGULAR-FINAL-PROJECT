import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Footer } from './shared/footer/footer';
import { Header } from './shared/header/header';

@Component({
  imports: [Footer, Header, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  readonly showHeader = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => !event.urlAfterRedirects.startsWith('/auth/')),
      startWith(!this.router.url.startsWith('/auth/')),
    ),
    { initialValue: !this.router.url.startsWith('/auth/') },
  );

  readonly showFooter = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => this.shouldShowFooter(event.urlAfterRedirects)),
      startWith(this.shouldShowFooter(this.router.url)),
    ),
    { initialValue: this.shouldShowFooter(this.router.url) },
  );

  private shouldShowFooter(url: string): boolean {
    const path = url.split(/[?#]/, 1)[0];
    return (
      path !== '/auth/register' &&
      !path.startsWith('/auth/verification/') &&
      path !== '/profile' &&
      !path.startsWith('/profile/')
    );
  }
}
