# Experience Fitness — Website Project

This is a trimester project for the Introduction to Web Technologies course. The site is built for Experience Fitness, a real gym in Astana.

## About the project

Experience Fitness offers martial arts, yoga, pilates, stretching, personal training, and more. The site lets a visitor learn about the club, meet the trainers and book a slot with one of them, compare membership plans and buy one, book a trial session, or register for an account.

Assignment 1 built the HTML structure. Assignment 2 added hand-written CSS. Assignment 3 rebuilt the layout with Bootstrap's grid system only (no other Bootstrap components). The midterm finished the logic across all pages, added confirmation areas and state classes (`hidden`, `selected`, `error`), and prepared `id`s for JavaScript. Assignments 4 and 5 add JavaScript: data and logic (Assignment 4), then DOM, events and form validation (Assignment 5).

There is no server and no database. Every form is checked in the browser only, and every confirmation says that nothing was really booked, paid for or created.
**Final Defense Update:** For the final defense, three features were rewritten using **jQuery** (linked via CDN):
1. **Form Validation:** Registration page (`registration.js`).
2. **List Built in Code (Cart):** Subscribe page (`subscribe.js`).
3. **Show/Hide Block (Cost Estimator):** Home page (`index.js`).
   The original plain JavaScript versions of these three features are preserved in
`js/old-js-version.js` for comparison. Shared jQuery helpers were moved to `js/jquery-common.js`.
## Author

Balakhazy Askar — working individually.

## Pages

- `index.html` — home page: about the club, photo gallery, membership pricing table with a cost estimator, contacts
- `trainers.html` — the three trainers, with a schedule and booking window for each
- `registration.html` — create an account
- `booking.html` — trial session info, opening hours, booking form
- `subscribe.html` — club perks, plan cards, cart and purchase form
- `css/base.css` — shared styles: colors, fonts, header/nav/footer, state classes
- `css/askar.css` — personal corrections and page-specific components (including the `.tb-*` classes used by the trainer booking window)
- `js/main.js` — shared data and behaviour (see below)
- `js/index.js`, `js/trainers.js`, `js/registration.js`, `js/booking.js`, `js/subscribe.js` — one script per page
- `images/` — real photos of the club

## Three user journeys

**1. Find the opening hours and book a trial session**
Start: home page (`index.html`).
Steps: open the nav menu → click "Book a Trial Session" → read the three info cards (duration, guided tour, one class) → check the opening hours → fill in name, email, age, visit date, start time and fitness level → click "Send Request".
End: the confirmation area directly below the form. It shows a summary of the request, or specific errors next to the fields that need fixing.

**2. Compare membership plans and buy one**
Start: home page (`index.html`).
Steps: look at the Membership Plans table and enter the number of months in the cost estimator → open the nav menu → click "Buy a Membership" → pick a plan card (the chosen card grows) and press "Add to cart" → in the cart change quantities, add a personal training session or remove items → fill in full name and email → fill in payment details → click "Confirm Purchase" (it stays disabled while the cart is empty).
End: the confirmation area below the purchase form, with a summary and a demonstration reference number.

**3. Create an account and find the club's contact details**
Start: home page (`index.html`).
Steps: read the About section → check the Contacts box (address, email, two phone numbers) → open the nav menu → click "Registration" → fill in account name, name, phone, email, password and password confirmation (a live checklist shows which password rules are met) → click "Register".
End: the confirmation area below the registration form.

**4. Book a training slot with a trainer** (added in Assignment 5)
Start: any page → nav menu → "Trainers".
Steps: pick a trainer → click "View Schedule & Book" → search or filter the slots by day and format, sort by time or price → choose a slot → enter name, phone, visit date (it must be a future date on the weekday of the slot) and the number of participants for group classes → click "Confirm Booking".
End: a request summary with the total price and a demonstration reference number.

All journeys are reachable from the nav of every page, since the navigation is identical on all five pages.

## JavaScript

Every script starts with `'use strict'`, is loaded with `defer`, and follows these rules: `const` by default and `let` only for changing values; no `var`, `==`, `!=`, inline event attributes, `eval()` or `document.write()`; no `element.style`; no `innerHTML`. Interface elements are created and removed with DOM methods and states are changed with `classList`. User text is always put on the page with `textContent`. Nothing is saved: there is no `localStorage` or `sessionStorage`, and passwords and card details are never stored, printed or sent anywhere.

Each page loads `js/main.js` first, then its own script:

| Page | Scripts |
|------|---------|
| `index.html` | `js/main.js`, `js/index.js` |
| `trainers.html` | `js/main.js`, `js/trainers.js` |
| `registration.html` | `js/main.js`, `js/registration.js` |
| `booking.html` | `js/main.js`, `js/booking.js` |
| `subscribe.html` | `js/main.js`, `js/subscribe.js` |

`js/main.js` holds what several pages share: the `PLANS` array (the one place where plan prices live, used by the home page and the purchase page), the validators for name, email and phone, the helpers that show field errors and confirmation boxes, the date helpers, and one site-wide feature: the nav link of the current page is marked `active` automatically (the same nav is copied to every page), and Escape closes the burger menu.

## Functionality Plan

Responsible student for every row: Balakhazy Askar (individual project).

| Page | Visitor goal | Function | Expected result |
|------|--------------|----------|-----------------|
| All pages | Know which page I am on; same prices everywhere | `main.js`: active nav link, shared `PLANS` array and validators | The current page is highlighted; a price changed in one place changes everywhere |
| `index.html` | See what training would cost over time | Cost estimator: months entered, validated (1-60), monthly and annual totals calculated from `PLANS` | A result box with both totals, a note that these are starting prices, and a link to the purchase page |
| `trainers.html` | Find and request a time slot with a trainer | Search by training name, filter by day and format, sort by time or price, result count, no-results state, reset; booking form with validation and live price | A request summary with total price and a `DEMO-` number, nothing is really booked |
| `registration.html` | Create an account | Six validated fields, live password checklist, exact confirmation, Show/Hide Password | Specific errors beside fields, first invalid field focused, a message that no account was created |
| `booking.html` | Request a trial session | Validation of name, email, optional phone, age, date (no past dates, no Sunday), start time (inside opening hours of that day), level and rules; live summary; repeated request check | A request summary and a message that nothing is booked |
| `subscribe.html` | Choose a plan and see what I pay | Plan cards (the chosen one grows); cart with add, quantity +/-, remove and clear, line subtotals, total quantity and total, empty state, checkout disabled when empty; validation of name, email and card including expiry | A purchase summary with every cart line and the total; card details are cleared; the cart is emptied; a message that nothing was charged |

## Theme modules

| Module | Status | Where |
|--------|--------|-------|
| Menu/catalogue | Implemented | The trainer slots on `trainers.html`: rendered from an array, search plus day, format and sort controls, result count, no-results state, reset, and booking as the next action |
| Cart/order | Implemented | The cart on `subscribe.html`: add, quantity +/-, remove, clear, subtotals, total, empty state, checkout disabled when empty, demonstration summary |
| Booking/appointment | Implemented | `booking.html` (trial session) and the booking window on `trainers.html` |
| Login/registration | Implemented | `registration.html`, front-end validation only |
| Reviews/comments | Not used | The site has no reviews section and none of the visitor journeys needs one |

## Midterm corrections

Corrections to midterm files receive no points. Each one was needed because JavaScript may not use `element.style` or edit HTML elements directly.

| # | File | Correction | Reason |
|---|------|------------|--------|
| 1 | `css/askar.css` | Added the `.tb-*` block (trainer booking window: overlay, slot cards, form errors, summary) | The window is built by JavaScript, so its look has to come from classes |
| 2 | `css/askar.css` | Added `.trainer-details`, `.confirmation-box .summary-list` rules and `#js-registration-checklist` | Schedule and trainings were running together on one line on `trainers.html`; JavaScript-built summaries and the password checklist needed layout |
| 3 | `subscribe.html` | The burger toggle `id="nav-toggle"` was changed to `id="navToggle"`, its label `for` to `navToggle`, and `aria-controls="nav-menu"` to `aria-controls="navMenu"` | The CSS opens the menu with `#navToggle:checked`, so on this page the burger menu never opened on phones |
| 4 | `css/askar.css` | `.plan-option` and `.plan-option-body` now stretch to equal height, and `.plan-option-body.selected` scales the chosen plan card; added `.btn:disabled` | The Annual card was taller than the others because of its badge, so it always looked "big"; the chosen card should be the one that stands out; disabled buttons needed a visible state |
| 5 | `css/askar.css` | Added the `.cart-*` rules (cart panel, lines, quantity buttons, footer) | The cart is built by JavaScript inside the purchase form, so its look has to come from classes |

Script links (`<script src="js/..." defer>`) were added to every page, which the freeze allows.

## Quality pass

Checked the site on a phone (real device, not just DevTools emulation) and in a
second browser, clicked every nav link on every page, and submitted every form.

1. **Found:** the logic never finished — a visitor could compare membership
   plans on the home page and could book a trial session, but there was no
   actual page to buy a specific plan.
   **Fixed:** added `subscribe.html` with the three plans as selectable cards
   and a purchase form, linked from the nav on all pages.
2. **Found:** forms gave no indication of what would happen after submitting,
   and had nowhere for a result to appear.
   **Fixed:** added a one-line helper above every submit button and an empty,
   hidden confirmation container below every form; JavaScript now fills it.
3. **Found:** on `registration.html`, the form card sometimes collapsed to a
   single narrow column, wrapping the helper text word by word instead of
   staying readable.
   **Fixed:** gave `.registration-card` an explicit `width`/`max-width`
   instead of relying on it shrinking correctly inside the grid on its own.
4. **Found:** ids on form fields were inconsistent page to page (some named
   after the field, some not prefixed at all), which would make them harder
   to find once JavaScript needs to reference them.
   **Fixed:** renamed every form-related id to one pattern,
   `js-<page>-<field>`, across the pages.
5. **Found:** on a real phone, the burger menu icon was too small a tap
   target to hit reliably with a thumb.
   **Fixed:** added padding around `.nav-toggler` so the actual clickable
   area is bigger than just the character itself.
6. **Found:** the helper texts above the submit buttons promised "we'll create
   your account" and "we'll charge the selected plan", which the site cannot do.
   **Fixed:** JavaScript replaces them with honest demonstration texts.

## JavaScript checklist

Line numbers match the current files. Recheck them after every edit.

| Requirement | Where |
|-------------|-------|
| `'use strict'` | line 1 of every file in `js/` |
| Scripts in `js/`, `main.js` for shared code, page files named by page; loaded with `defer` | `js/main.js`, `js/index.js`, `js/trainers.js`, `js/registration.js`, `js/booking.js`, `js/subscribe.js` |
| `const` by default, `let` only for changing values; no `var`, `==`, `!=` | `let` only for values that change: `trainers.js` 55 (loop counter) and 176 (`added`), `booking.js` 102 (`hours`); the forbidden forms were searched for and none were found |
| Array of 6+ objects with 4+ properties | `scheduleData`, 40+ slot objects with 10 properties each (id, trainerId, day, hour, time, trainingName, type, capacity, booked, price): `trainers.js` 75, built from `trainersConfig` 10-41; `OPENING_HOURS`, 7 objects with 4 properties: `booking.js` 9-17 |
| Loop / traversal | `buildSchedule` `trainers.js` 51-73 (`forEach` and `for`); `renderSlots` 341; `PASSWORD_RULES.map` `registration.js` 94 |
| Filter / find / transform / total | `filter` `trainers.js` 104, 302, 336; `find` `trainers.js` 301, `main.js` 42, `booking.js` 31; `map` `trainers.js` 174, 313; `reduce` (free spots total) `trainers.js` 345; `every` `registration.js` 23; cost totals `index.js` 15-25; cart: `find` `subscribe.js` 24, 28, 46, `findIndex` 75, `reduce` 36, `map` 317 |
| 4+ reusable functions with parameters and return values | `formatPrice` `main.js` 37, `validateName` 78, `validateEmail` 89, `validatePhone` 97, `calcLineTotal` `subscribe.js` 31, `calcCartTotals` 35, `estimateCost` `index.js` 15, `filterSlots` `trainers.js` 102, `sortSlots` 90 |
| At least one function calls another | `validateBooking` `trainers.js` 113 calls `validateName`, `validatePhone`, `parseDate`, `getWeekdayName`; `calcCartTotals` `subscribe.js` 35 calls `calcLineTotal`; `addToCart` 43 calls `findItem` and `findLine`; `sortSlots` calls `compareSlots` 86 |
| Arithmetic | `calcLineTotal` `subscribe.js` 31-33; `estimateCost` `index.js` 15-25; free spots `capacity - booked` `trainers.js` 345 |
| `if/else` and `switch` | `if/else if` chains in `validateBooking` `trainers.js` 113-151, `validateTrial` `booking.js` 77-143; `switch` in `sortSlots` `trainers.js` 92 |
| 2+ logical operators | `&&` `trainers.js` 136; `\|\|` `trainers.js` 105; `&&` `main.js` 189; `&&` `subscribe.js` 46, 48; `!` `subscribe.js` 236 |
| `===` and `!==` | `===` `trainers.js` 106-107; `!==` `trainers.js` 134, `registration.js` 69, `booking.js` 70-72 |
| `Math.random()` | `generateReference` `main.js` 45-47: a temporary `DEMO-` number, not a real booking, order or account number |
| Repeated items rendered through one function and DOM methods | `renderSlotCard` `trainers.js` 350, called from `renderSlots` 341; `showConfirmation` `main.js` 148 builds every summary on every page |
| `textContent` for user text | `createEl` `main.js` 25-35 sets text with `textContent`; summaries use it for names, emails and comments; no `innerHTML` anywhere |
| Search / filter / sort, result count, no-results state, reset | controls `trainers.js` 286-290; count and empty state `renderSlots` 341-348; reset `resetFilters` 328 |
| Calculation or selection flow | slot price × participants `trainers.js` 81-84; cart: line subtotals and totals `subscribe.js` 31-41, redrawn by `renderCart` 228-241; months estimate `index.js` 15-25 |
| 3+ event types | `submit` `registration.js` 128, `booking.js` 191, `subscribe.js` 177, `index.js` 68, `trainers.js` 448; `click` `trainers.js` 191, 249, 290, `registration.js` 131, `subscribe.js` 174-176, 272-274; `input` `registration.js` 129, `booking.js` 192, `trainers.js` 286; `change` `trainers.js` 287-289, `subscribe.js` 178-179; `keydown` `main.js` 196, `trainers.js` 170; `reset` `registration.js` 130, `booking.js` 194 |
| DOM creation/removal | creating: `createEl` `main.js` 25; removing: `clearFieldError` `main.js` 106, `clearErrors` 131, `hideConfirmation` 165 |
| `classList` states | `hidden` `main.js` 150, 166 and `subscribe.js` 236-238; `selected` `subscribe.js` 195; `error` `main.js` 111, 121, 151; `error-message` / `success-message` `registration.js` 139-140; `tb-hidden` `trainers.js` 229, 234, 347; `tb-selected` `trainers.js` 358 |
| Forms: input → field validation → invalid/valid state → confirmation | registration `validateRegistration` `registration.js` 41-74 and `handleRegistrationSubmit` 170; booking `validateTrial` `booking.js` 77-143 and `handleBookingSubmit` 222; purchase `validatePurchase` `subscribe.js` 86-114 and `handleSubscribeSubmit` 287; trainer slot `validateBooking` `trainers.js` 113-151 and `handleFormSubmit` 533 |
| 4+ validated fields, including a rule that combines fields | registration: six fields, password must equal confirmation (`registration.js` 67-70); booking: date and start time are checked against the opening hours of that weekday (`booking.js` 117-133); purchase: expiry month and year are combined and compared with today (`subscribe.js` 102-107); trainer slot: date must fall on the weekday of the slot (`trainers.js` 134) |
| Errors beside fields, first invalid field focused, outdated errors cleared | `setFieldError` `main.js` 117, `focusFirstInvalid` 140, `clearFieldError` 106; clearing on typing `registration.js` 156, `booking.js` 208, `subscribe.js` 281; the trainer window has its own version `trainers.js` 507-531 |
| No `alert()` | feedback is always on the page |
| Success summary and the "no server, nothing created" statement | `showConfirmation` `main.js` 148 with `DEMO_NOTE` `main.js` 9; `trainers.js` `showSummary` 574 |
| Login/registration rules | regular expressions for 8+ characters, uppercase, lowercase, digit and special character: `PASSWORD_RULES` `registration.js` 9-15; live checklist `updateChecklist` 134; exact confirmation 67-70; Show/Hide Password button `registration.js` 144-153; passwords are wiped after the check and never shown, stored or put in a URL |
| Booking rules | past dates rejected, closed day rejected, start time inside opening hours, repeated request caught: `booking.js` 102-133; live summary `summarizeRequest` 67, `updateLive` 199 |
| Cart/order | cart data and logic `subscribe.js` 11-83 (`addToCart` 43, `changeQty` 62, `removeLine` 74, `clearCart` 80); the page has no prepared cart container, so `initSubscribe` 117-183 builds the cart panel with DOM methods; one function draws every line, `renderCartLine` 244-278; line subtotals, total quantity, total and empty state in `renderCart` 228-241; checkout disabled when the cart is empty (240) and guarded in `handleSubscribeSubmit` 294-297; conflict rule: monthly and annual cannot be in the cart together (48-50); a demonstration summary with a `DEMO-` number (287-338) |
| Keyboard and real buttons | every action is a `<button>`, slot cards are `<button>` (`trainers.js` 350-370); Escape closes the trainer window `handleKeydown` `trainers.js` 609 |
| No false promises | helper texts replaced by honest ones in `registration.js` 84-85, `booking.js` 172, `subscribe.js` 125 |



## How to view the site

No server or installation needed. Open `index.html` directly in a browser and use the navigation menu to move between pages. Bootstrap's grid CSS is loaded from a CDN, so an internet connection is needed for the responsive layout to render correctly.

## Validation

Every page was checked with the W3C Markup Validation Service by uploading it directly, one page at a time. The CSS was checked with the W3C CSS Validation Service. The JavaScript files were checked for syntax with `node --check` and searched for the forbidden constructs (`var`, `==`, `!=`, `innerHTML`, `.style`, `alert(`, `document.write`, `eval(`, `localStorage`).


## Git

- Midterm tag: unchanged.
- `assignment-4`: data and logic (`js/main.js`, data arrays, calculations, filters).
- `assignment-5`: DOM, events and validation (all page scripts, confirmation areas, README and evidence).
- At least six meaningful commits across three days.