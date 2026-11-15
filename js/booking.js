'use strict';

/* ==========================================================
   booking.js - booking.html: trial session request.
   Validation, live summary and a demonstration confirmation.
   ========================================================== */

// OPENING_HOURS (the opening hours of the club) is defined once in main.js.

const GOAL_LABELS = { 'weight-loss': 'Weight loss', muscle: 'Muscle gain', fitness: 'General fitness' };
const TRIAL_MINUTES = 45;
const LAST_START_BEFORE_CLOSE = 60; // minutes: the session must fit before closing

const bookingRefs = { fields: {} };
const sentRequests = []; // "date time" keys sent in this visit, to catch repeated requests

document.addEventListener('DOMContentLoaded', initBooking);

// ---------- Helpers ----------
function findHours(dayName) {
    return OPENING_HOURS.find(entry => entry.day === dayName);
}

function parseTime(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (match === null) {
        return null;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
}

function formatClock(totalMinutes) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function readBookingValues() {
    return {
        name: byId('js-booking-name').value,
        email: byId('js-booking-email').value,
        phone: byId('js-booking-phone').value,
        age: byId('js-booking-age').value,
        date: byId('js-booking-visit-date').value,
        time: bookingRefs.time.value,
        goal: byId('js-booking-goal').value,
        comment: byId('js-booking-comment').value
    };
}

function summarizeRequest(values) {
    const date = parseDate(values.date);
    const dateText = date !== null ? `${getWeekdayName(date)} ${values.date}` : 'date not chosen';
    const timeText = values.time !== '' ? values.time : 'time not chosen';
    const goalText = values.goal !== '' ? GOAL_LABELS[values.goal] : 'no goal selected';
    return `Your request: ${dateText}, ${timeText} | about ${TRIAL_MINUTES} minutes | ${goalText}`;
}

// Returns an object like { date: 'message' }; an empty object means the form is valid.
function validateTrial(values) {
    const errors = {};

    const nameError = validateName(values.name);
    if (nameError !== '') {
        errors.name = nameError;
    }
    const emailError = validateEmail(values.email);
    if (emailError !== '') {
        errors.email = emailError;
    }
    const phoneError = validatePhone(values.phone, false);
    if (phoneError !== '') {
        errors.phone = phoneError;
    }

    const age = Number(values.age);
    if (values.age.trim() === '') {
        errors.age = 'Enter your age.';
    } else if (!Number.isInteger(age) || age < 14 || age > 90) {
        errors.age = 'Age must be a whole number from 14 to 90.';
    }

    const today = startOfToday();
    const date = parseDate(values.date);
    let hours = null;
    if (values.date === '') {
        errors.date = 'Choose a visit date.';
    } else if (date === null) {
        errors.date = 'Enter a valid date.';
    } else if (date < today) {
        errors.date = 'The date cannot be in the past.';
    } else {
        hours = findHours(getWeekdayName(date));
        if (!hours.isOpen) {
            errors.date = `The club is closed on ${hours.day}. Pick another day.`;
        }
    }

    const minutes = parseTime(values.time);
    if (values.time === '') {
        errors.time = 'Choose a start time.';
    } else if (minutes === null) {
        errors.time = 'Enter a valid time.';
    } else if (hours !== null && hours.isOpen) {
        const first = hours.open * 60;
        const last = hours.close * 60 - LAST_START_BEFORE_CLOSE;
        const now = new Date();
        const isToday = date.getTime() === today.getTime();
        if (minutes < first || minutes > last) {
            errors.time = `On ${hours.day} start between ${formatClock(first)} and ${formatClock(last)}.`;
        } else if (isToday && minutes <= now.getHours() * 60 + now.getMinutes()) {
            errors.time = 'This time has already passed today.';
        } else if (sentRequests.includes(`${values.date} ${values.time}`)) {
            errors.time = 'You already sent a request for this date and time.';
        }
    }

    return errors;
}

// ---------- UI ----------
function initBooking() {
    const form = byId('js-booking-form');
    if (form === null) {
        return;
    }
    form.noValidate = true;

    // Phone lock: the locked prefix appears on focus, only digits are accepted, 11 digits at most.
    const phoneInput = byId('js-booking-phone');
    phoneInput.maxLength = 16;
    phoneInput.inputMode = 'tel';
    phoneInput.addEventListener('focus', () => {
        if (phoneInput.value === '') {
            phoneInput.value = formatPhone(PHONE_PREFIX);
        }
    });
    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhone(phoneInput.value);
    });
    phoneInput.addEventListener('blur', () => {
        if (keepDigits(phoneInput.value, 20).length <= PHONE_PREFIX.length) {
            phoneInput.value = ''; // only the prefix is left: the phone is optional here
        }
    });

    bookingRefs.form = form;
    bookingRefs.box = byId('js-booking-confirmation');

    // Start time field (created with DOM methods, next to the date field).
    const dateInput = byId('js-booking-visit-date');
    dateInput.min = toISODate(new Date());
    const timeCol = createEl('div', 'col-12');
    const timeLabel = createEl('label', '', 'Start Time');
    timeLabel.htmlFor = 'js-booking-time';
    const timeInput = createEl('input');
    timeInput.type = 'time';
    timeInput.id = 'js-booking-time';
    timeInput.name = 'visit-time';
    timeInput.required = true;
    timeCol.append(timeLabel, timeInput);
    dateInput.closest('.row').appendChild(timeCol);
    bookingRefs.time = timeInput;

    // Live summary and honest helper text.
    const helper = form.querySelector('.form-helper');
    helper.textContent = 'Demonstration: nothing is booked. A summary of your request appears right below.';
    const live = createEl('p', 'form-helper');
    live.id = 'js-booking-live';
    live.setAttribute('aria-live', 'polite');
    helper.parentElement.insertBefore(live, helper);
    bookingRefs.live = live;

    // Where each error message is shown.
    bookingRefs.fields = {
        name: { input: byId('js-booking-name') },
        email: { input: byId('js-booking-email') },
        phone: { input: byId('js-booking-phone') },
        age: { input: byId('js-booking-age') },
        date: { input: dateInput },
        time: { input: timeInput }
    };

    form.addEventListener('submit', handleBookingSubmit);
    form.addEventListener('input', handleBookingChange);
    form.addEventListener('change', handleBookingChange);
    form.addEventListener('reset', handleBookingReset);

    updateLive();
}

function updateLive() {
    bookingRefs.live.textContent = summarizeRequest(readBookingValues());
}

function fieldKeyFor(target) {
    const fields = bookingRefs.fields;
    return Object.keys(fields).find(key => fields[key].input === target);
}

function handleBookingChange(event) {
    const key = fieldKeyFor(event.target);
    if (key !== undefined) {
        clearFieldError(bookingRefs.fields[key].input);
    }
    updateLive();
}

function handleBookingReset() {
    clearErrors(bookingRefs.form);
    hideConfirmation(bookingRefs.box);
    bookingRefs.live.textContent = summarizeRequest({ date: '', time: '', goal: '' });
}

function handleBookingSubmit(event) {
    event.preventDefault();
    const form = bookingRefs.form;
    const values = readBookingValues();

    clearErrors(form);
    hideConfirmation(bookingRefs.box);
    const errors = validateTrial(values);
    const invalidKeys = Object.keys(errors);

    if (invalidKeys.length > 0) {
        invalidKeys.forEach(key => {
            const field = bookingRefs.fields[key];
            setFieldError(field.input, errors[key], field.host);
        });
        focusFirstInvalid(form);
        showConfirmation(bookingRefs.box, 'error', `please fix ${invalidKeys.length} marked field(s).`, [], '');
        focusFirstInvalid(form);
        return;
    }

    sentRequests.push(`${values.date} ${values.time}`);
    const date = parseDate(values.date);
    const phone = values.phone.trim();
    const rows = [
        ['Date', `${getWeekdayName(date)}, ${values.date}`],
        ['Start time', values.time],
        ['Duration', `About ${TRIAL_MINUTES} minutes`],
        ['Goal', values.goal !== '' ? GOAL_LABELS[values.goal] : 'Not specified'],
        ['Name', values.name.trim()],
        ['Email', values.email.trim()],
        ['Phone', phone !== '' ? phone : 'Not given']
    ];
    if (values.comment.trim() !== '') {
        rows.push(['Comment', values.comment.trim()]);
    }
    rows.push(['Demo reference', generateReference()]);

    showConfirmation(bookingRefs.box, 'success', `trial session request prepared for ${values.name.trim()}.`, rows, DEMO_NOTE);
}