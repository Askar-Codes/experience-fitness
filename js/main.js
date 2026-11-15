'use strict';

/* ==========================================================
   main.js - shared data and behaviour for every page.
   Loaded first (defer); page scripts use what is defined here.
   ========================================================== */

// ---------- Shared data ----------
const DEMO_NOTE = 'Front-end demonstration only: no data is sent to a server and no real booking, payment, order or account is created.';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// One place for plan prices: used on the home page and on the purchase page.
// price is null for a single visit because it is paid at the front desk.
const PLANS = [
    { id: 'monthly', name: 'Monthly Membership', price: 14158, months: 1, payOnline: true },
    { id: 'annual', name: 'Annual Membership', price: 149900, months: 12, payOnline: true },
    { id: 'single', name: 'Single Visit', price: null, months: 0, payOnline: false }
];

// Opening hours of the club: used by the home page (live "Open now" status, hours list)
// and by the booking form, so the hours are written in one place only.
const OPENING_HOURS = [
    { day: 'Monday', open: 7, close: 23, isOpen: true },
    { day: 'Tuesday', open: 7, close: 23, isOpen: true },
    { day: 'Wednesday', open: 7, close: 23, isOpen: true },
    { day: 'Thursday', open: 7, close: 23, isOpen: true },
    { day: 'Friday', open: 7, close: 23, isOpen: true },
    { day: 'Saturday', open: 9, close: 22, isOpen: true },
    { day: 'Sunday', open: null, close: null, isOpen: false }
];

// ---------- DOM helpers ----------
function byId(id) {
    return document.getElementById(id);
}

function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) {
        el.classList.add(...className.split(' '));
    }
    if (text !== undefined) {
        el.textContent = text;
    }
    return el;
}

// ---------- Data helpers (parameters + return values) ----------
function formatPrice(amount) {
    return `${amount.toLocaleString('en-US')} KZT`;
}

function findPlan(planId) {
    return PLANS.find(plan => plan.id === planId);
}

function generateReference() {
    // Temporary demo number only. It does not identify any real booking, order or account.
    return `DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getWeekdayName(date) {
    return DAY_NAMES[date.getDay()];
}

function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toISODate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

// Turns "2026-10-27" into a Date, or null when the text is not a real date.
function parseDate(value) {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return null;
    }
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    const isReal = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return isReal ? date : null;
}

// ---------- Validators: return '' when valid, otherwise a specific message ----------
function validateName(value) {
    const name = value.trim();
    if (name === '') {
        return 'Enter your name.';
    }
    if (name.length < 2 || !/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) {
        return 'Use letters only (spaces, dots and hyphens are fine), at least 2 characters.';
    }
    return '';
}

function validateEmail(value) {
    const email = value.trim();
    if (email === '') {
        return 'Enter your email.';
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Enter an email like name@example.com.';
}

// Phone lock: a number is the country code 7 and 10 more digits (11 digits in total) and it must
// start with the locked prefix. PHONE_PREFIX = '777' means "+777": country code 7 and then 77.
// To allow every Kazakhstan mobile number write '77' here (+7 7xx), or '7' for any +7 number.
const PHONE_PREFIX = '777';
const PHONE_LENGTH = 11;

function validatePhone(value, isRequired) {
    const digits = value.replace(/\D/g, '');
    if (digits === '') {
        return isRequired ? 'Enter your phone number.' : '';
    }
    if (!digits.startsWith(PHONE_PREFIX) || digits.length !== PHONE_LENGTH) {
        return `Phone must have ${PHONE_LENGTH} digits and start with +${PHONE_PREFIX}, e.g. +7 777 123 45 67.`;
    }
    return '';
}

// ---------- Input locks (pure functions: text in, text out) ----------
// Keeps only digits, at most maxLength of them.
function keepDigits(value, maxLength) {
    return value.replace(/\D/g, '').slice(0, maxLength);
}

// 1234567890123456 -> "1234 5678 9012 3456" (16 digits at most)
function formatCardNumber(value) {
    return keepDigits(value, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

// 0828 -> "08/28": the slash is added by the code; a month can only be 01-12.
function formatExpiry(value) {
    let digits = keepDigits(value, 4);
    if (digits.length > 0 && digits[0] > '1') {
        digits = `0${digits}`.slice(0, 4); // 5 can only mean 05
    }
    if (digits.length > 1 && digits[0] === '1' && digits[1] > '2') {
        digits = digits[0] + digits.slice(2); // 13-19 do not exist: the extra digit is ignored
    }
    if (digits.slice(0, 2) === '00') {
        digits = `0${digits.slice(2)}`; // there is no month 00
    }
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

// Any typed or pasted number becomes "+7 777 123 45 67". The prefix can not be deleted or changed:
// the visitor's digits always continue after it.
function formatPhone(value) {
    let digits = keepDigits(value, 20);
    if (digits === '') {
        return '';
    }
    if (digits.startsWith('8')) {
        digits = `7${digits.slice(1)}`; // 8 777 ... is how many people write it at home
    }
    let common = 0;
    while (common < PHONE_PREFIX.length && digits[common] === PHONE_PREFIX[common]) {
        common += 1;
    }
    const number = (PHONE_PREFIX + digits.slice(common)).slice(0, PHONE_LENGTH);
    const rest = number.slice(1); // everything after the country code 7
    const groups = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)].filter(group => group !== '');
    return `+7 ${groups.join(' ')}`;
}

// ---------- Form feedback helpers (classes prepared at midterm: error, error-message, hidden) ----------
function clearFieldError(input) {
    const old = byId(`${input.id}-error`);
    if (old !== null) {
        old.remove();
    }
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
}

// host (optional) is the element the message is appended to; by default it goes right after the input.
function setFieldError(input, message, host) {
    clearFieldError(input);
    const error = createEl(host ? 'span' : 'div', 'error-message', `Error: ${message}`);
    error.id = `${input.id}-error`;
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
    if (host) {
        host.appendChild(error);
    } else {
        input.insertAdjacentElement('afterend', error);
    }
}

function clearErrors(form) {
    form.querySelectorAll('.error-message[id$="-error"]').forEach(message => message.remove());
    form.querySelectorAll('.error').forEach(field => {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        field.removeAttribute('aria-describedby');
    });
}

function focusFirstInvalid(form) {
    const first = form.querySelector('[aria-invalid="true"]');
    if (first !== null) {
        first.focus();
    }
}

// type is 'success' or 'error'; rows is a list of [label, value] pairs shown as a summary.
function showConfirmation(box, type, title, rows, note) {
    box.replaceChildren();
    box.classList.remove('hidden');
    box.classList.toggle('error', type === 'error');
    box.append(createEl('strong', '', `${type === 'error' ? 'Error' : 'Success'}: ${title}`));
    if (rows.length > 0) {
        const list = createEl('dl', 'summary-list');
        rows.forEach(([label, value]) => list.append(createEl('dt', '', label), createEl('dd', '', value)));
        box.append(list);
    }
    if (note) {
        box.append(createEl('p', 'form-helper', note));
    }
    box.tabIndex = -1;
    box.focus();
}

function hideConfirmation(box) {
    box.classList.add('hidden');
    box.classList.remove('error');
    box.replaceChildren();
}

// ---------- Site-wide behaviour ----------
// Marks the link of the current page as active (the same nav is copied to every page).
function setActiveNav() {
    const file = window.location.pathname.split('/').pop().toLowerCase();
    const current = file === '' ? 'index.html' : file;
    const links = Array.from(document.querySelectorAll('nav a'));
    const hasMatch = links.some(link => link.getAttribute('href').toLowerCase() === current);
    if (!hasMatch) {
        return;
    }
    links.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href').toLowerCase() === current);
    });
}

// Escape closes the burger menu on small screens.
function handleNavKeydown(event) {
    const toggle = byId('navToggle');
    if (event.key === 'Escape' && toggle !== null && toggle.checked) {
        toggle.checked = false;
    }
}

// Small screens (below 992 px): the desktop menu and the right-hand buttons are hidden by the grid classes
// d-none d-lg-flex, and a "Menu" button opens a pop-up window with the same links. The links are copied
// from the header, so the pages and their names are written in one place only (the HTML).
function buildMobileMenu() {
    const container = document.querySelector('.header-container');
    const pageLinks = document.querySelectorAll('.main-nav a');
    const trial = document.querySelector('.header-actions .btn-trial');
    const login = document.querySelector('.header-actions .btn-login');
    if (container === null || pageLinks.length === 0 || trial === null || login === null) {
        return;
    }

    // d-flex + justify-content-center on a link centres its text (Bootstrap utilities that already exist).
    function copyLink(source, className) {
        const link = createEl('a', `${className} d-flex justify-content-center`, source.textContent.trim());
        link.href = source.getAttribute('href');
        if (source.classList.contains('active')) {
            link.classList.add('selected'); // the page the visitor is on
        }
        return link;
    }

    const menuButton = createEl('button', 'btn btn-outline btn-sm d-lg-none', '\u2630 Menu');
    menuButton.type = 'button';
    menuButton.setAttribute('aria-haspopup', 'dialog');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', 'site-menu');
    container.appendChild(menuButton);

    // Column 1: Home, Trainers, Memberships in three rows. Column 2: Free Trial. Column 3: Log In.
    // On a phone columns 2 and 3 are stacked in the right half; from 576 px all three stand side by side.
    const pagesColumn = createEl('div', 'col-6 col-sm-4');
    const pagesList = createEl('div', 'd-flex flex-column gap-2');
    pageLinks.forEach(source => pagesList.appendChild(copyLink(source, 'btn btn-outline')));
    pagesColumn.appendChild(pagesList);

    const trialColumn = createEl('div', 'col-12 col-sm-6');
    trialColumn.appendChild(copyLink(trial, 'btn'));
    const loginColumn = createEl('div', 'col-12 col-sm-6');
    loginColumn.appendChild(copyLink(login, 'btn btn-outline'));
    const buttonsRow = createEl('div', 'row g-3');
    buttonsRow.append(trialColumn, loginColumn);
    const buttonsColumn = createEl('div', 'col-6 col-sm-8');
    buttonsColumn.appendChild(buttonsRow);

    const grid = createEl('div', 'row g-3');
    grid.append(pagesColumn, buttonsColumn);

    const closeButton = createEl('button', 'tb-close', '\u00d7');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close menu');
    const panel = createEl('div', 'tb-panel');
    panel.append(closeButton, createEl('h2', 'tb-title', 'Menu'), grid);
    const overlay = createEl('div', 'tb-overlay tb-hidden');
    overlay.id = 'site-menu';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Site menu');
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function isOpen() {
        return !overlay.classList.contains('tb-hidden');
    }

    function openMenu() {
        overlay.classList.remove('tb-hidden');
        document.body.classList.add('tb-no-scroll');
        menuButton.setAttribute('aria-expanded', 'true');
        // Focus goes to the link of the page the visitor is on (focus paints it green).
        // On pages that are not in the menu (booking, registration) it goes to the close button,
        // so no wrong link looks selected.
        const current = pagesList.querySelector('a.selected');
        (current !== null ? current : closeButton).focus();
    }

    function closeMenu(restoreFocus) {
        overlay.classList.add('tb-hidden');
        document.body.classList.remove('tb-no-scroll');
        menuButton.setAttribute('aria-expanded', 'false');
        if (restoreFocus) {
            menuButton.focus();
        }
    }

    menuButton.addEventListener('click', openMenu);
    closeButton.addEventListener('click', () => closeMenu(true));
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            closeMenu(true); // a click on the dark background
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen()) {
            closeMenu(true);
        }
    });
    // Tab stays inside the open menu.
    overlay.addEventListener('keydown', event => {
        if (event.key !== 'Tab') {
            return;
        }
        const items = Array.from(overlay.querySelectorAll('a, button'));
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    // If the window becomes wide again, the desktop menu is back and the pop-up is not needed.
    if (typeof window.matchMedia === 'function') {
        window.matchMedia('(min-width: 992px)').addEventListener('change', event => {
            if (event.matches && isOpen()) {
                closeMenu(false);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    buildMobileMenu();
    document.addEventListener('keydown', handleNavKeydown);
});

// Session prices (KZT) shared by the trainers page and the purchase page.
const SESSION_PRICES = { individual: 5000, group: 2000 };