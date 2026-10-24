'use strict';

/* ==========================================================
   trainers.js - trainers page: schedule data, slot search/filter/sort,
   booking form with validation and a demonstration summary.
   No data is sent anywhere. No real booking is created.
   ========================================================== */

// ---------- 1. Data ----------
const trainersConfig = [
    {
        id: 'Mateo',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startHour: 8, endHour: 16,
        trainings: [
            { name: 'Powerlifting', type: 'individual', price: SESSION_PRICES.individual, capacity: 1 },
            { name: 'Muscle Building', type: 'group', price: SESSION_PRICES.group, capacity: 5 },
            { name: 'Barbell Basics', type: 'group', price: SESSION_PRICES.group, capacity: 5 }
        ]
    },
    {
        id: 'David',
        days: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        startHour: 14, endHour: 22,
        trainings: [
            { name: 'Body Recomposition', type: 'individual', price: SESSION_PRICES.individual, capacity: 1 },
            { name: 'Contest Prep', type: 'individual', price: SESSION_PRICES.individual, capacity: 1 },
            { name: 'Weight Loss', type: 'group', price: SESSION_PRICES.group, capacity: 5 }
        ]
    },
    {
        id: 'Aigerim',
        days: ['Monday', 'Wednesday', 'Friday'],
        startHour: 7, endHour: 15,
        trainings: [
            { name: 'HIIT', type: 'group', price: SESSION_PRICES.group, capacity: 5 },
            { name: 'Core Stability', type: 'group', price: SESSION_PRICES.group, capacity: 5 },
            { name: 'Mobility & Stretching', type: 'individual', price: SESSION_PRICES.individual, capacity: 1 }
        ]
    }
];

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_FILTERS = { search: '', day: 'all', type: 'all', sort: 'time' };

// ---------- 2. Reusable helpers (parameters + return values) ----------
function formatTime(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
}

function buildSchedule(config) {
    const result = [];
    config.forEach(trainer => {
        trainer.days.forEach(day => {
            for (let hour = trainer.startHour; hour < trainer.endHour; hour++) {
                const training = trainer.trainings[hour % trainer.trainings.length];
                result.push({
                    id: `${trainer.id}-${day}-${hour}`,
                    trainerId: trainer.id,
                    day: day,
                    hour: hour,
                    time: formatTime(hour),
                    trainingName: training.name,
                    type: training.type,
                    capacity: training.capacity,
                    booked: 0,
                    price: training.price
                });
            }
        });
    });
    return result;
}

const scheduleData = buildSchedule(trainersConfig);

function typeLabel(slot) {
    return slot.type === 'group' ? 'Group Class' : 'Personal Training';
}

function calcTotal(price, qty) {
    const safeQty = Number.isInteger(qty) && qty > 0 ? qty : 1;
    return price * safeQty;
}

function compareSlots(a, b) {
    return WEEK_ORDER.indexOf(a.day) - WEEK_ORDER.indexOf(b.day) || a.hour - b.hour;
}

function sortSlots(slots, mode) {
    const copy = [...slots];
    switch (mode) {
        case 'price-asc':
            return copy.sort((a, b) => a.price - b.price || compareSlots(a, b));
        case 'price-desc':
            return copy.sort((a, b) => b.price - a.price || compareSlots(a, b));
        default:
            return copy.sort(compareSlots);
    }
}

function filterSlots(slots, filters) {
    const query = filters.search.trim().toLowerCase();
    return slots.filter(slot => {
        const matchesSearch = query === '' || slot.trainingName.toLowerCase().includes(query);
        const matchesDay = filters.day === 'all' || slot.day === filters.day;
        const matchesType = filters.type === 'all' || slot.type === filters.type;
        return matchesSearch && matchesDay && matchesType;
    });
}

// Returns an object like { name: 'message', date: 'message' }; empty object means valid.
function validateBooking(values, slot) {
    const errors = {};

    const nameError = validateName(values.name);
    if (nameError !== '') {
        errors.name = nameError;
    }

    const phoneError = validatePhone(values.phone, true);
    if (phoneError !== '') {
        errors.phone = phoneError;
    }

    const today = startOfToday();
    const date = parseDate(values.date);
    if (values.date === '') {
        errors.date = 'Choose a visit date.';
    } else if (date === null) {
        errors.date = 'Enter a valid date.';
    } else if (date < today) {
        errors.date = 'The date cannot be in the past.';
    } else if (getWeekdayName(date) !== slot.day) {
        errors.date = `This slot runs on ${slot.day}. Pick a ${slot.day}.`;
    } else if (date.getTime() === today.getTime() && slot.hour <= new Date().getHours()) {
        errors.date = 'This time has already passed today.';
    }

    if (slot.type === 'group') {
        const qty = Number(values.qty);
        const available = slot.capacity - slot.booked;
        if (!Number.isInteger(qty) || qty < 1) {
            errors.qty = 'Enter a whole number of at least 1.';
        } else if (qty > available) {
            errors.qty = `Only ${available} spot(s) left.`;
        }
    }

    return errors;
}

// ---------- 3. State and element references ----------
const state = {
    trainerName: null,
    slot: null,
    opener: null,
    filters: { ...DEFAULT_FILTERS }
};
const refs = {};

// ---------- 4. Init ----------
document.addEventListener('DOMContentLoaded', () => {
    const added = injectBookButtons();
    if (added === 0) {
        return; // not a page with trainer cards
    }
    buildSlotsOverlay();
    buildBookingOverlay();
    document.addEventListener('keydown', handleKeydown);
});

function injectBookButtons() {
    const names = trainersConfig.map(trainer => trainer.id);
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
    let added = 0;

    headings.forEach(heading => {
        const card = heading.parentElement;
        if (card === null || card === document.body || card.tagName === 'MAIN') {
            return;
        }
        names.forEach(name => {
            const hasName = heading.textContent.includes(name);
            const hasButton = card.querySelector('.tb-book-btn') !== null;
            if (!hasName || hasButton) {
                return;
            }
            const button = createEl('button', 'tb-book-btn', 'View Schedule & Book');
            button.type = 'button';
            button.addEventListener('click', () => openSlotsOverlay(name, button));
            card.appendChild(button);
            added += 1;
        });
    });
    return added;
}

// ---------- 5. Form-building helpers ----------
function createLabeled(id, labelText, input) {
    const wrapper = createEl('div', 'tb-field');
    const label = createEl('label', 'tb-label', labelText);
    label.htmlFor = id;
    input.id = id;
    wrapper.append(label, input);
    return wrapper;
}

function createField(id, labelText, input) {
    const wrapper = createLabeled(id, labelText, input);
    const error = createEl('span', 'tb-error-text');
    error.id = `${id}-error`;
    input.name = id;
    input.setAttribute('aria-describedby', error.id);
    wrapper.append(error);
    return { wrapper, input, error };
}

function fillSelect(select, options) {
    select.replaceChildren();
    options.forEach(([value, label]) => {
        const option = createEl('option', '', label);
        option.value = value;
        select.appendChild(option);
    });
}

function showOverlay(overlay) {
    overlay.classList.remove('tb-hidden');
    document.body.classList.add('tb-no-scroll');
}

function hideOverlay(overlay) {
    overlay.classList.add('tb-hidden');
}

// ---------- 6. Slots menu (search / filter / sort) ----------
function buildSlotsOverlay() {
    const overlay = createEl('div', 'tb-overlay tb-hidden');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tb-slots-title');

    const panel = createEl('div', 'tb-panel');

    const closeBtn = createEl('button', 'tb-close', '\u00d7');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close schedule');
    closeBtn.addEventListener('click', closeAll);

    const title = createEl('h2', 'tb-title');
    title.id = 'tb-slots-title';
    const subtitle = createEl('p', 'tb-subtitle');

    const controls = createEl('div', 'tb-controls');

    const search = createEl('input', 'tb-input');
    search.type = 'search';
    search.placeholder = 'e.g. HIIT';
    const day = createEl('select', 'tb-input');
    const type = createEl('select', 'tb-input');
    fillSelect(type, [['all', 'All formats'], ['group', 'Group Class'], ['individual', 'Personal Training']]);
    const sort = createEl('select', 'tb-input');
    fillSelect(sort, [['time', 'Day and time'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']]);

    const resetBtn = createEl('button', 'tb-secondary-btn', 'Reset filters');
    resetBtn.type = 'button';

    controls.append(
        createLabeled('tb-search', 'Search training', search),
        createLabeled('tb-day', 'Day', day),
        createLabeled('tb-type', 'Format', type),
        createLabeled('tb-sort', 'Sort by', sort),
        resetBtn
    );

    const count = createEl('p', 'tb-count');
    count.setAttribute('aria-live', 'polite');
    const grid = createEl('div', 'tb-grid');
    const empty = createEl('p', 'tb-empty tb-hidden', 'No slots match your filters. Try another day or press "Reset filters".');

    panel.append(closeBtn, title, subtitle, controls, count, grid, empty);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    search.addEventListener('input', () => { state.filters.search = search.value; refreshSlots(); });
    day.addEventListener('change', () => { state.filters.day = day.value; refreshSlots(); });
    type.addEventListener('change', () => { state.filters.type = type.value; refreshSlots(); });
    sort.addEventListener('change', () => { state.filters.sort = sort.value; refreshSlots(); });
    resetBtn.addEventListener('click', resetFilters);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            closeAll();
        }
    });

    Object.assign(refs, { slotsOverlay: overlay, slotsTitle: title, slotsSubtitle: subtitle, search, day, type, sort, count, grid, empty, slotsClose: closeBtn });
}

function openSlotsOverlay(trainerName, opener) {
    const config = trainersConfig.find(trainer => trainer.id === trainerName);
    const trainerSlots = scheduleData.filter(slot => slot.trainerId === trainerName);

    state.trainerName = trainerName;
    state.opener = opener;
    state.slot = null;
    state.filters = { ...DEFAULT_FILTERS };

    refs.slotsTitle.textContent = `Available slots: ${trainerName}`;
    refs.slotsSubtitle.textContent = `${config.days.length} days a week, ${formatTime(config.startHour)}-${formatTime(config.endHour)}`;

    const days = WEEK_ORDER.filter(dayName => trainerSlots.some(slot => slot.day === dayName));
    fillSelect(refs.day, [['all', 'All days'], ...days.map(dayName => [dayName, dayName])]);
    syncControls();

    refreshSlots();
    showOverlay(refs.slotsOverlay);
    refs.slotsClose.focus();
}

function syncControls() {
    refs.search.value = state.filters.search;
    refs.day.value = state.filters.day;
    refs.type.value = state.filters.type;
    refs.sort.value = state.filters.sort;
}

function resetFilters() {
    state.filters = { ...DEFAULT_FILTERS };
    syncControls();
    refreshSlots();
    refs.search.focus();
}

function refreshSlots() {
    const all = scheduleData.filter(slot => slot.trainerId === state.trainerName);
    const visible = sortSlots(filterSlots(all, state.filters), state.filters.sort);
    renderSlots(visible, all.length);
}

function renderSlots(list, totalCount) {
    refs.grid.replaceChildren();
    list.forEach(slot => refs.grid.appendChild(renderSlotCard(slot)));

    const freeSpots = list.reduce((sum, slot) => sum + (slot.capacity - slot.booked), 0);
    refs.count.textContent = `Showing ${list.length} of ${totalCount} slots, ${freeSpots} free spots`;
    refs.empty.classList.toggle('tb-hidden', list.length !== 0);
}

function renderSlotCard(slot) {
    const spotsLeft = slot.capacity - slot.booked;
    const isFull = spotsLeft <= 0;
    const isSelected = state.slot !== null && state.slot.id === slot.id;

    const card = createEl('button', 'tb-slot');
    card.type = 'button';
    card.classList.toggle('tb-slot-full', isFull);
    card.classList.toggle('tb-selected', isSelected);
    card.disabled = isFull;

    card.append(
        createEl('span', 'tb-slot-when', `${slot.day} | ${slot.time}`),
        createEl('span', 'tb-slot-name', slot.trainingName),
        createEl('span', 'tb-slot-type', typeLabel(slot)),
        createEl('span', 'tb-slot-meta', `Price: ${formatPrice(slot.price)}`),
        createEl('span', 'tb-slot-meta', `Spots left: ${spotsLeft} / ${slot.capacity}${isFull ? ' (fully booked)' : ''}`)
    );

    card.addEventListener('click', () => openBookingOverlay(slot));
    return card;
}

// ---------- 7. Booking form ----------
function buildBookingOverlay() {
    const overlay = createEl('div', 'tb-overlay tb-overlay-booking tb-hidden');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tb-booking-title');

    const panel = createEl('div', 'tb-panel tb-panel-booking');

    const closeBtn = createEl('button', 'tb-close', '\u00d7');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close booking form');
    closeBtn.addEventListener('click', closeAll);

    const title = createEl('h2', 'tb-title', 'Complete Booking');
    title.id = 'tb-booking-title';
    const info = createEl('p', 'tb-subtitle');

    const form = createEl('form', 'tb-form');
    form.noValidate = true;

    const nameInput = createEl('input', 'tb-input');
    nameInput.type = 'text';
    nameInput.autocomplete = 'name';
    const phoneInput = createEl('input', 'tb-input');
    phoneInput.type = 'tel';
    phoneInput.autocomplete = 'tel';
    phoneInput.placeholder = '+7 700 000 0000';
    const dateInput = createEl('input', 'tb-input');
    dateInput.type = 'date';
    const qtyInput = createEl('input', 'tb-input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.step = '1';
    qtyInput.value = '1';

    const fields = {
        name: createField('tb-name', 'Full name', nameInput),
        phone: createField('tb-phone', 'Phone', phoneInput),
        date: createField('tb-date', 'Visit date', dateInput),
        qty: createField('tb-qty', 'Participants', qtyInput)
    };

    const live = createEl('p', 'tb-live');
    live.setAttribute('aria-live', 'polite');

    const submitBtn = createEl('button', 'tb-submit-btn', 'Confirm Booking');
    submitBtn.type = 'submit';
    const backBtn = createEl('button', 'tb-secondary-btn', 'Back to slots');
    backBtn.type = 'button';
    backBtn.addEventListener('click', backToSlots);

    const message = createEl('p', 'tb-msg');
    message.setAttribute('aria-live', 'polite');

    form.append(fields.name.wrapper, fields.phone.wrapper, fields.date.wrapper, fields.qty.wrapper, live, submitBtn, backBtn, message);

    const summary = createEl('div', 'tb-summary tb-hidden');
    const summaryTitle = createEl('h3', 'tb-title', 'Request summary');
    summaryTitle.tabIndex = -1;
    const summaryStatus = createEl('p', 'tb-msg tb-msg-success');
    const summaryList = createEl('dl', 'tb-summary-list');
    const summaryNote = createEl('p', 'tb-note', DEMO_NOTE);
    const anotherBtn = createEl('button', 'tb-secondary-btn', 'Book another slot');
    anotherBtn.type = 'button';
    anotherBtn.addEventListener('click', backToSlots);
    const doneBtn = createEl('button', 'tb-submit-btn', 'Close');
    doneBtn.type = 'button';
    doneBtn.addEventListener('click', closeAll);
    summary.append(summaryTitle, summaryStatus, summaryList, summaryNote, anotherBtn, doneBtn);

    panel.append(closeBtn, title, info, form, summary);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    form.addEventListener('submit', handleFormSubmit);
    Object.keys(fields).forEach(key => {
        fields[key].input.addEventListener('input', () => {
            clearSlotFieldError(key);
            updateLivePreview();
        });
    });
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            closeAll();
        }
    });

    Object.assign(refs, { bookingOverlay: overlay, bookInfo: info, form, fields, live, message, summary, summaryTitle, summaryStatus, summaryList });
}

function openBookingOverlay(slot) {
    const available = slot.capacity - slot.booked;
    state.slot = slot;

    refs.form.reset();
    clearSlotErrors();
    refs.message.textContent = '';
    refs.message.classList.remove('tb-msg-error');
    refs.summary.classList.add('tb-hidden');
    refs.form.classList.remove('tb-hidden');

    refs.bookInfo.textContent = `${slot.trainingName} with ${slot.trainerId}, ${slot.day} ${slot.time} (${typeLabel(slot)})`;
    refs.fields.qty.wrapper.classList.toggle('tb-hidden', slot.type === 'individual');
    refs.fields.qty.input.max = String(available);
    refs.fields.qty.input.value = '1';
    refs.fields.date.input.min = toISODate(new Date());

    updateLivePreview();
    hideOverlay(refs.slotsOverlay);
    showOverlay(refs.bookingOverlay);
    refs.fields.name.input.focus();
}

function getQty(slot) {
    if (slot.type === 'individual') {
        return 1;
    }
    const raw = parseInt(refs.fields.qty.input.value, 10);
    return Number.isInteger(raw) && raw > 0 ? raw : 1;
}

function updateLivePreview() {
    const slot = state.slot;
    if (slot === null) {
        return;
    }
    const qty = getQty(slot);
    const total = calcTotal(slot.price, qty);
    const dateValue = refs.fields.date.input.value;
    const dateText = dateValue !== '' ? dateValue : 'date not chosen';
    refs.live.textContent = `${slot.day} ${slot.time} | ${dateText} | ${qty} participant(s) | Total: ${formatPrice(total)}`;
}

function clearSlotFieldError(key) {
    const field = refs.fields[key];
    field.error.textContent = '';
    field.input.classList.remove('tb-input-error');
    field.input.removeAttribute('aria-invalid');
}

function clearSlotErrors() {
    Object.keys(refs.fields).forEach(clearSlotFieldError);
}

function showErrors(errors) {
    const order = ['name', 'phone', 'date', 'qty'];
    const invalidKeys = order.filter(key => errors[key] !== undefined);

    invalidKeys.forEach(key => {
        const field = refs.fields[key];
        field.error.textContent = `Error: ${errors[key]}`;
        field.input.classList.add('tb-input-error');
        field.input.setAttribute('aria-invalid', 'true');
    });
    if (invalidKeys.length > 0) {
        refs.fields[invalidKeys[0]].input.focus();
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    const slot = state.slot;
    if (slot === null) {
        return;
    }

    const values = {
        name: refs.fields.name.input.value,
        phone: refs.fields.phone.input.value,
        date: refs.fields.date.input.value,
        qty: refs.fields.qty.input.value
    };

    clearSlotErrors();
    const errors = validateBooking(values, slot);

    if (Object.keys(errors).length > 0) {
        refs.message.classList.add('tb-msg-error');
        refs.message.textContent = 'Error: please fix the marked fields.';
        showErrors(errors);
        return;
    }

    const qty = getQty(slot);
    const total = calcTotal(slot.price, qty);
    slot.booked += qty; // in-memory only, resets on page reload

    showSummary([
        ['Trainer', slot.trainerId],
        ['Training', `${slot.trainingName} (${typeLabel(slot)})`],
        ['Date', values.date],
        ['Time', slot.time],
        ['Participants', String(qty)],
        ['Total price', formatPrice(total)],
        ['Name', values.name.trim()],
        ['Phone', values.phone.trim()],
        ['Demo reference', generateReference()]
    ], values.name.trim());
}

function showSummary(rows, name) {
    refs.summaryList.replaceChildren();
    rows.forEach(([label, value]) => {
        refs.summaryList.append(createEl('dt', '', label), createEl('dd', '', value));
    });
    refs.summaryStatus.textContent = `Success: demonstration request prepared for ${name}.`;
    refs.message.textContent = '';
    refs.message.classList.remove('tb-msg-error');

    refs.form.classList.add('tb-hidden');
    refs.summary.classList.remove('tb-hidden');
    refs.summaryTitle.focus();
}

// ---------- 8. Navigation between layers ----------
function backToSlots() {
    hideOverlay(refs.bookingOverlay);
    refreshSlots();
    showOverlay(refs.slotsOverlay);
    const selected = refs.grid.querySelector('.tb-selected');
    (selected !== null ? selected : refs.slotsClose).focus();
}

function closeAll() {
    hideOverlay(refs.slotsOverlay);
    hideOverlay(refs.bookingOverlay);
    document.body.classList.remove('tb-no-scroll');
    refs.form.reset();
    clearSlotErrors();
    state.slot = null;
    if (state.opener !== null) {
        state.opener.focus();
    }
}

function handleKeydown(event) {
    const isOpen = !refs.slotsOverlay.classList.contains('tb-hidden') || !refs.bookingOverlay.classList.contains('tb-hidden');
    if (event.key === 'Escape' && isOpen) {
        closeAll();
    }
}