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
const PHONE_PREFIX = '77';
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

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    document.addEventListener('keydown', handleNavKeydown);
});

// Session prices (KZT) shared by the trainers page and the purchase page.
const SESSION_PRICES = { individual: 5000, group: 2000 };