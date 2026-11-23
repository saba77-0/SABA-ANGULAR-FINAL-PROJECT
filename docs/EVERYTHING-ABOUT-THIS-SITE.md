# STEP Trains: Everything About This Site

## What is this website?

STEP Trains is a train booking website. It helps a person:

- Search for train routes.
- Look at train schedules.
- See available coaches and seats.
- Choose a travel date.
- Create an account.
- Sign in and manage a profile.
- Create, view, change, and delete bookings.
- Change an account password.

The website has a dark blue and gold design. It works on computers, tablets, and phones.

## What can you do on the home page?

The home page is the first page visitors see.

At the top, it shows:

- The STEP TRAINS name.
- The message: "Travel Smarter, Journey Farther."
- A journey search form.

The search form asks for:

1. **From:** the station where the journey starts.
2. **To:** the station where the journey ends.
3. **Travel date:** the date for the trip.

After searching, the website opens the train list and keeps the selected information in the page address. It warns the visitor if a station is missing or if "From" and "To" are the same.

The home page also explains four main features:

- Multiple coach classes.
- Flexible travel dates.
- Seat selection.
- Booking confirmation.

## How do you find a train?

Open the **Trains** page from the main navigation.

The page shows available train schedules and has two kinds of search controls:

### Search by train

You can enter a train name or train number.

### Filter by route

You can choose:

- A starting station.
- A destination station.
- Any combination of origin and destination.

The selected filters are kept in the website address, so refreshing or copying the link preserves the search. You can use **Clear** to remove the filters.

If no trains match, the page says that no trains were found. Loading and connection errors are also shown clearly.

The train list displays only the first five matching schedules.

## What is on a train details page?

Selecting a train opens its train details page.

The page shows:

- Train image.
- Train number.
- Train name.
- Number of coaches.
- Total number of seats.
- Number of schedules.

The details page has two tabs:

### Schedules

This tab shows each route and its departure time.

- "Sign in to book" appears for visitors who are not signed in.
- "Book" appears for signed-in visitors.

### Coaches

This tab shows:

- Coach number.
- Coach class.
- Number of seats.
- Coach price.

Business coaches are marked in blue, while other coaches are marked in green.

## How does booking work?

Booking is a guided process with four steps:

1. **Coach:** Choose a coach or coach class.
2. **Date:** Choose a travel date.
3. **Seats:** Choose one or more available seats.
4. **Confirm:** Review the route, date, coach, seats, and total price.

After confirmation, the website sends the booking to the connected train service. A successful booking opens the user's bookings page.

If signed-in visitors use the "Book" button, the booking page opens directly. Visitors who are not signed in are sent to the sign-in page and returned to booking after signing in.

## Accounts and signing in

Visitors can create an account or sign in.

### Create account

Registration asks for:

- First name.
- Last name.
- Email address.
- Password.

The website performs basic validation, such as requiring a password of at least six characters and checking the email format.

Some accounts may need email verification. The verification page accepts and resends a verification code.

### Sign in

Sign-in asks for:

- Email address.
- Password.

There is also a **Remember me** option and a **Forgot password** link.

After successful sign-in:

- The account session is saved in the browser.
- The sign-in and registration buttons are replaced by profile navigation.
- Protected pages become available.

Signing out removes the saved account session.

## Password recovery

The account area includes:

- Forgot password.
- Reset password.
- Password verification steps.
- Back-to-sign-in navigation.

The actual password email and reset process depend on the connected backend API.

## The profile area

After signing in, a visitor can open **My Profile**.

The profile area has a left navigation menu with:

- My Profile.
- My Bookings.
- Settings.
- Sign Out.

### Personal information

This page allows a signed-in user to view and update:

- Profile picture URL.
- First name.
- Last name.
- Email address.
- Phone number.
- Address.
- Date of birth.

The email address is displayed but is read-only.

### My bookings

This page lists the user's bookings.

The list can be filtered by:

- From date.
- To date.

Each booking shows available route, train, travel date, departure time, coach, seat, and price information.

A booking can be opened to see more details.

### Booking details

The booking details page allows the user to:

- View route and train information.
- View departure time and coach.
- View seat and price information.
- Change the travel date.
- Delete the booking.

Deleting or changing a booking is sent to the backend; it is not only a change on the screen.

### Account settings

The settings page allows the user to:

- Change the account password.
- Delete the account.

Account deletion is protected by a confirmation step.

## Main pages and addresses

| Address | Page |
|---|---|
| `/` | Home and journey search |
| `/trains` | Train search and filters |
| `/trains/:id` | Details for one train |
| `/auth/register` | Create account |
| `/auth/signin` | Sign in |
| `/auth/forgot-password` | Request a password reset |
| `/auth/reset-password` | Set a new password |
| `/auth/verification/:email` | Verify an account |
| `/profile` | Personal information |
| `/profile/bookings` | User bookings |
| `/profile/bookings/:id` | Booking details |
| `/profile/settings` | Password and account settings |
| `/book` | Four-step booking page |

An unknown address sends the visitor back to the home page.

## What happens behind the screen?

For a person without a coding background, the website can be understood as three connected parts:

1. **What the visitor sees:** buttons, forms, train cards, account pages, and messages.
2. **Where decisions happen:** validation, filters, selected seats, booking steps, and navigation.
3. **Where information comes from:** the STEP Trains API.

The website connects to:

```text
https://trainsapi.stepacademy.ge
```

That service provides:

- Stations.
- Trains.
- Schedules.
- Coaches.
- Seats and availability.
- Accounts.
- Profiles.
- Bookings.

Because this external service supplies live information, an unavailable internet connection or API problem can prevent a page or action from loading.

## How are users and information protected?

The website:

- Stores the account login session in the browser.
- Adds the login token to API requests that use the configured STEP Trains service.
- Does not add the login token to unrelated websites.
- Protects profile and booking addresses with an account guard.
- Shows validation and API errors instead of pretending that an action succeeded.

Browser storage is for the user's session on that browser and device. It does not by itself prove that the connected backend has verified every action. Important verification still comes from the API.

## Important behavior to remember

- This is a real Angular website connected to a live API, not a collection of isolated demo screens.
- Train and station information depends on the API.
- Signing in is required for protected profile, account settings, and booking actions.
- If the API is unavailable, the website shows an error or loading state.
- Travel dates may not be in the past.
- Available seats are checked for the selected schedule, coach, and travel date.
- The connected API is responsible for authoritative booking records.
- A browser-based seat reservation service also exists in the project, but it is only device-local backup/state logic. It does not replace server-side booking records or share reservations across devices.
- The design includes responsive layouts for mobile, tablet, and desktop screens.

## What technology is used?

This project is built with Angular.

The main technologies and concepts are:

- **Angular:** builds the website and handles page navigation.
- **TypeScript:** makes the JavaScript code more structured and easier to validate.
- **Angular Signals:** stores changing information such as loading state, selected seats, and profile data.
- **Angular Router:** moves between pages.
- **Angular Forms:** supports forms and user input.
- **HttpClient:** communicates with the train API.
- **RxJS:** manages API request responses and route changes.
- **CSS:** controls layout and visual styling.
- **Bootstrap:** provides some common layout and form utilities.
- **Vitest:** runs automated tests.
- **Angular SSR:** can render pages on the server as well as in the browser.

You do not need to understand these technologies to use the website.

## How do you run the project?

Requirements:

- Node.js and npm should be installed.

From the project folder, start the website with:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:4200/
```

Other useful commands:

```powershell
npm run build
npm test
```

## Simple summary

STEP Trains lets someone search for train routes, review schedules and coach options, sign in, select seats, and create a real booking through the connected train service. It also lets signed-in users manage their profile, bookings, password, and account.
