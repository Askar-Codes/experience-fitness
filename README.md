# Experience Fitness — Website Project

This is a trimester project for the Introduction to Web Technologies course. The site is built for Experience Fitness, a real gym in Astana.

## About the project

Experience Fitness offers martial arts, yoga, pilates, stretching, personal training, and more. The site lets a visitor learn about the club, compare membership plans and buy one, book a trial session, or register for an account.

Assignment 1 built the HTML structure. Assignment 2 added hand-written CSS. Assignment 3 rebuilt the layout with Bootstrap's grid system only (no other Bootstrap components). The midterm finished the logic across all pages, added confirmation areas and state classes (`hidden`, `selected`, `error`), and prepared `id`s for the JavaScript that comes next. No JavaScript yet, and no server: forms don't submit anywhere real.

## Author

Balakhazy Askar — working individually.

## Pages

- `index.html` — home page: about the club, photo gallery, membership pricing table, contacts
- `registration.html` — create an account
- `booking.html` — trial session info, opening hours, booking form
- `subscribe.html` — club perks, plan comparison, purchase form
- `css/base.css` — shared styles: colors, fonts, header/nav/footer, state classes
- `css/askar.css` — personal corrections and page-specific components
- `images/` — real photos of the club

## Three user journeys

**1. Find the opening hours and book a trial session**
Start: home page (`index.html`).
Steps: open the nav menu → click "Book a Trial Session" → read the three info cards (duration, guided tour, one class) → check the opening hours → fill in name and email in the booking form → pick a fitness level → click "Send Request".
End: the confirmation area directly below the form — currently empty and hidden, ready for JavaScript to fill in once it's added.

**2. Compare membership plans and buy one**
Start: home page (`index.html`).
Steps: scroll to the Membership Plans table and compare Monthly / Annual / Single Visit prices → open the nav menu → click "Buy a Membership" → compare the same three plans as selectable cards on `subscribe.html` → pick the Annual plan (pre-selected as "Best value") → fill in full name and email → fill in payment details → click "Confirm Purchase".
End: the confirmation area below the purchase form.

**3. Create an account and find the club's contact details**
Start: home page (`index.html`).
Steps: read the About section → check the Contacts box (address, email, two phone numbers) → open the nav menu → click "Registration" → fill in account name, name, phone, and email → click "Register".
End: the confirmation area below the registration form.

All three journeys are reachable from the home page nav, and from any other page's nav, since the navigation is identical across all four pages.

## Quality pass

Checked the site on a phone (real device, not just DevTools emulation) and in a
second browser, clicked every nav link on every page, and submitted every form.

1. **Found:** the logic never finished — a visitor could compare membership
   plans on the home page and could book a trial session, but there was no
   actual page to buy a specific plan.
   **Fixed:** added `subscribe.html` with the three plans as selectable cards
   and a purchase form, linked from the nav on all four pages.
2. **Found:** forms gave no indication of what would happen after submitting,
   and had nowhere for a result to appear.
   **Fixed:** added a one-line helper above every submit button and an empty,
   hidden confirmation container below every form, ready for JavaScript.
3. **Found:** on `registration.html`, the form card sometimes collapsed to a
   single narrow column, wrapping the helper text word by word instead of
   staying readable.
   **Fixed:** gave `.registration-card` an explicit `width`/`max-width`
   instead of relying on it shrinking correctly inside the grid on its own.
4. **Found:** ids on form fields were inconsistent page to page (some named
   after the field, some not prefixed at all), which would make them harder
   to find once JavaScript needs to reference them.
   **Fixed:** renamed every form-related id to one pattern,
   `js-<page>-<field>`, across all four pages.
5. **Found:** on a real phone, the burger menu icon was too small a tap
   target to hit reliably with a thumb.
   **Fixed:** added padding around `.nav-toggler` so the actual clickable
   area is bigger than just the character itself.

## How to view the site

No server or installation needed. Open `index.html` directly in a browser and use the navigation menu to move between pages. Bootstrap's grid CSS is loaded from a CDN, so an internet connection is needed for the responsive layout to render correctly.

## Validation

Every page was checked with the W3C Markup Validation Service.