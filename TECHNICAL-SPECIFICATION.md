# STEP Trains — Technical Specification and Recreation Prompt

Use this document as a copy/paste prompt for an AI tasked with rebuilding the STEP Trains application from scratch. It describes the workspace’s actual structure and behavior, and explicitly distinguishes existing behavior from requested features that still need to be implemented.

## Copy/paste prompt

> Recreate **STEP Trains**, a responsive train-discovery and booking-entry web application, using the requirements below. Produce a complete, runnable Angular application, not just static mockups. Keep the visual style and working data flows consistent across pages. Where the source-workspace audit identifies a gap, implement the stated target behavior rather than reproducing the gap.

### 1. Product and technical foundation

- Product name and branding: **STEP TRAINS**. Use a dark, premium travel aesthetic: deep navy backgrounds, muted gold accents, warm light text, restrained borders, and rounded cards.
- Use Angular with standalone components, lazy-loaded route components, Angular Router, strict TypeScript, Signals (`signal`, `computed`, component `input`/`output`), `HttpClient`, and RxJS for HTTP and route streams.
- Use SCSS for global tokens and component styles. Bootstrap 5 may provide the grid and base form/button utilities, but the application’s own palette and component styling must control the finished appearance.
- Integrate with the REST API at `https://trainsapi.stepacademy.ge`; keep the base URL in an environment configuration rather than scattering literals.
- Preserve server rendering and client hydration where supported. Guard all browser-only `localStorage` access so server rendering does not throw.
- Use explicit loading, empty, validation, and error states. Do not silently substitute success data for API failures.

### 2. Routes and shared shell

Create these routes:

| Route | Page |
|---|---|
| `/` | Home / hero search |
| `/trains` | Searchable and filterable train schedules |
| `/trains/:id` | Train detail, schedules, and coaches |
| `/auth/register` | Registration |
| `/auth/signin` | Sign in |

Use the train-detail route before the general `/trains` route if route matching requires it. Unknown routes should redirect to `/`. Load page components lazily.

Every page shares a sticky header, main router outlet, and footer. The header includes the STEP TRAINS brand, Home and Trains links with active states, and Sign In / Get Started actions. On narrow screens, wrap or rearrange the nav without horizontal overflow. The footer has a centered creator/attribution link and a subtle top border.

Use Angular `RouterLink` for internal navigation. Authentication actions must navigate to the in-app auth routes rather than an unrelated external site.

### 3. Home page and hero search

- Build a centered hero with a small STEP TRAINS eyebrow, the heading “Travel Smarter, Journey Farther,” short supporting copy, and a prominent origin/destination search panel.
- Load station options from the API and offer them as suggestions or select options. Show a loading or error status when station data is unavailable.
- Provide From and To inputs, a travel-date control defaulted to today, and a Search button. Reject missing stations and identical origin/destination with an accessible inline validation message.
- On submit, navigate to `/trains` with origin, destination, and travel date represented in query parameters. The train-list page must initialize its filters from those parameters and keep filter changes reflected in the URL.
- Below the hero, show four feature cards (classes, flexible dates, seat selection, instant confirmation) and a call-to-action to browse trains or create an account. Treat these as product messaging; do not imply seat selection or booking is functional unless the relevant API and workflow are implemented.

### 4. Train list, filters, and train cards

- Load station options, train schedules, and train summaries through a train service. Present loading, error, and no-results states independently where appropriate.
- Provide a train name/number search and route filters for **From** and **To**, plus Apply/Search and Clear actions. Match route names case-insensitively; allow either filter to be empty. Search by schedule train name/number and, where available, summary name/number.
- Render a responsive grid of schedule cards, with a **maximum of five visible matching schedule items**. Apply filtering before the five-item cap.
- Each card links to `/trains/:id` and shows a train image (with a local placeholder on missing/broken images), train number, train name, origin → destination, coach count and total seats when summary data is available. The list card does not currently display a price.
- If summary data fails but schedule data succeeds, keep usable schedule results visible and report the missing summary information.
- Keep accessible names and focus states on controls; do not rely on color alone for meaning.

### 5. Train detail and coach presentation

- Read the `id` route parameter, validate it as a positive integer, and fetch the corresponding train details. Handle invalid IDs, loading, API failure, and empty schedules/coaches.
- Show a Back to trains link, image with fallback, train number/name, coach count, total seats, and schedule count.
- Provide accessible **Schedules** and **Coaches** tabs. Schedule rows show origin → destination, departure time (HH:mm), and a Sign in to book action that routes to `/auth/signin`.
- Coach rows show coach number, class, available seat count, and price formatted as currency.
- Style **Business** coach badges blue and **Second** coach badges green. Keep the class text visible so the badge color is not the only indicator.
- The reference implementation’s coach styling uses green for the default class and blue for Business; implement an explicit Second-class rule so only the intended classes receive these colors.

### 6. Authentication and token handling

- Registration form fields: first name, last name, email, password. Sign-in fields: email and password. Validate required fields and email format; show API errors in the form and prevent duplicate submissions while pending.
- Registration calls `POST /api/auth/register`; sign-in calls `POST /api/auth/login`. Both expect a JSON response containing `token`.
- On success, store the token as `auth_token` in `localStorage` (browser only). Add an HTTP interceptor that reads this token and attaches `Authorization: Bearer <token>` to requests for the configured train API origin only. Do not attach credentials to unrelated external origins.
- Provide a clear logout/token-removal path if authenticated navigation is presented. Do not claim server-side authentication guarantees based only on client-side storage.
- The current repository has no auth page components/routes or HTTP interceptor. Add them as part of this target implementation.

### 7. REST API contract and TypeScript models

Use typed models equivalent to:

```ts
interface Station { id: number; name: string; }
interface TrainSchedule {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  trainId: number;
  trainName: string;
  trainNumber: number;
}
interface TrainSummary {
  id: number;
  number: number;
  name: string;
  thumbnail: string;
  coachesCount: number;
  totalSeats: number;
}
interface TrainCoach {
  id: number;
  number: number;
  class: string;
  price: number;
  trainId: number;
  seatCount: number;
}
interface TrainDetails extends TrainSummary {
  schedules: TrainSchedule[];
  coaches: TrainCoach[];
}
interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
interface LoginRequest { email: string; password: string; }
interface AuthResponse { token: string; }
```

Train service endpoints:

| Method and path | Expected data |
|---|---|
| `GET /api/stations` | Station collection |
| `GET /api/trains` | Train-summary collection |
| `GET /api/schedules` | Schedule collection |
| `GET /api/trains/:id` | One train detail, including schedules and coaches |
| `POST /api/auth/register` | Registration request; token response |
| `POST /api/auth/login` | Login request; token response |

Collection responses may wrap records as either `{ data: T[] }` or `{ data: { items: T[] } }`. Detail responses use `{ data: T }`. Validate response shapes and surface malformed responses as errors. The current service uses these endpoints without travel-date query parameters; confirm the API’s supported date-search contract before attempting server-side date filtering.

### 8. Visual system and responsive behavior

Use these palette anchors and CSS custom properties (adjust only if needed for contrast):

```scss
$gold: #c9a84c;
$gold-light: #e2c97e;
$navy: #0d1226;
$navy-deep: #0a0e1a;
$surface: #111827;
$card: #131929;
$border: #2a3350;
$text: #f0e6c8;
$text-muted: #b8a882;
$text-subtle: #8a7f65;
```

Use a centered content width near 1080px (up to 1200px on very wide screens), clear typography hierarchy, visible keyboard focus rings, and sufficient contrast. Keep the header sticky. Home feature cards use four columns on desktop, two at tablet widths, and one on small screens; list filters move above results as the layout narrows; train cards use three, then two, then one column. At mobile widths around 575px and below, stack dense detail rows and search controls cleanly. Support viewport widths down to 320px.

### 9. Suggested project organization

Keep the separation of concerns and naming clear:

```text
src/
  app/
    components/
      header/
      footer/
      hero-search/
      train-card/
    pages/
      home/
      train-list/
      train-detail/
      auth-register/
      auth-signin/
    models/
      train.model.ts
      auth.model.ts
    services/
      train.service.ts
      auth.service.ts
    interceptors/
      auth.interceptor.ts
    app.ts
    app.html
    app.routes.ts
    app.config.ts
  environments/
    environment.ts
  styles.scss
```

Use focused standalone components and typed service methods. Keep filtering and derived UI state in computed signals; keep HTTP data loading in page/service boundaries; avoid putting API logic in templates.

### 10. Verification expectations

Add or update unit tests to cover:

1. Train service endpoint URLs, methods, accepted collection envelopes, detail response validation, and malformed-response errors.
2. Registration and sign-in request bodies and token persistence.
3. The interceptor’s bearer header behavior, including the no-token case and avoiding unrelated origins.
4. Hero form validation and navigation query parameters, including travel date.
5. From/To filters, search term matching, URL synchronization, clear behavior, and the five-item cap.
6. Detail loading/error states, schedule/coach tabs, badge classes, seat counts, and prices.
7. Header navigation and responsive-friendly accessible labels/focus behavior.

Run the project’s build and unit test commands and fix regressions before declaring the recreation complete.

## Workspace implementation notes

The Angular 22 app uses lazy standalone feature pages and is organized under `src/app/features` (`home`, `trains`, and `auth`), with cross-cutting header/footer components under `shared` and the auth interceptor and local seat-reservation service under `core`.

The routes include `/`, `/trains`, `/trains/:id`, `/auth/register`, and `/auth/signin`. Internal auth navigation returns to an allowed train URL, including its query parameters. The auth interceptor attaches the saved bearer token only to requests for the configured train API origin.

The hero search and train-list route filter derive valid destinations from schedules and exclude the selected origin. Search carries its travel date through the URL. The list continues to filter schedule results and display at most five matching entries.

Train detail offers local seat reservations, saves them in browser `localStorage`, and disables already-reserved seats. This is device-local state only; the API contract documented above has no booking endpoint, so reservations are not synchronized or authoritative across users/devices.

The repository includes focused Angular/Vitest tests for service behavior, route filtering, auth return navigation, interceptor origin scoping, and seat reservation uniqueness/persistence.
