//index.js
'use strict';

/* ==========================================================
   index.js - index.html: membership cost estimator.
   Uses the shared PLANS array from main.js, so prices stay
   the same on the home page and on the purchase page.
   ========================================================== */

const MAX_ESTIMATE_MONTHS = 60;
const estimatorRefs = {};

document.addEventListener('DOMContentLoaded', initEstimator);

// Returns what the visitor would pay for the chosen number of months.
function estimateCost(months) {
    const monthly = findPlan('monthly');
    const annual = findPlan('annual');
    const annualPacks = Math.ceil(months / annual.months);
    return {
        monthlyTotal: monthly.price * months,
        annualPacks: annualPacks,
        annualTotal: annual.price * annualPacks,
        coveredMonths: annualPacks * annual.months
    };
}

function initEstimator() {
    const host = document.querySelector('.pricing');
    if (host === null) {
        return;
    }

    const wrapper = createEl('div', 'mt-4');
    const title = createEl('h3', '', 'Estimate your cost');
    const helper = createEl('p', 'form-helper', 'Enter how many months you plan to train. Prices start from the amounts in the table; the front desk confirms the final price.');

    const form = createEl('form');
    form.noValidate = true;
    const row = createEl('div', 'form-row');
    const label = createEl('label', '', 'Months of training');
    label.htmlFor = 'js-index-months';
    const input = createEl('input');
    input.type = 'number';
    input.id = 'js-index-months';
    input.name = 'months';
    input.min = '1';
    input.max = String(MAX_ESTIMATE_MONTHS);
    input.step = '1';
    input.placeholder = 'e.g. 6';
    row.append(label, input);

    const calcBtn = createEl('button', 'btn btn-sm', 'Calculate');
    calcBtn.type = 'submit';
    const resetBtn = createEl('button', 'btn btn-outline btn-sm', 'Clear');
    resetBtn.type = 'reset';

    const result = createEl('div', 'confirmation-box hidden');
    result.id = 'js-index-estimate';
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');

    form.append(row, calcBtn, resetBtn);
    wrapper.append(title, helper, form, result);
    host.appendChild(wrapper);

    Object.assign(estimatorRefs, { form, input, result });

    form.addEventListener('submit', handleEstimateSubmit);
    input.addEventListener('input', () => clearFieldError(input));
    form.addEventListener('reset', () => {
        clearFieldError(input);
        hideConfirmation(result);
    });
}

function handleEstimateSubmit(event) {
    event.preventDefault();
    const { input, result } = estimatorRefs;
    const months = Number(input.value);

    clearFieldError(input);
    hideConfirmation(result);

    if (input.value.trim() === '') {
        setFieldError(input, 'Enter the number of months.');
        input.focus();
        return;
    }
    if (!Number.isInteger(months) || months < 1 || months > MAX_ESTIMATE_MONTHS) {
        setFieldError(input, `Enter a whole number from 1 to ${MAX_ESTIMATE_MONTHS}.`);
        input.focus();
        return;
    }

    const monthly = findPlan('monthly');
    const annual = findPlan('annual');
    const cost = estimateCost(months);
    const annualText = `${cost.annualPacks} x ${formatPrice(annual.price)} = ${formatPrice(cost.annualTotal)} (covers ${cost.coveredMonths} months)`;

    showConfirmation(result, 'success', `estimate for ${months} month(s).`, [
        ['Monthly plan', `${months} x ${formatPrice(monthly.price)} = ${formatPrice(cost.monthlyTotal)}`],
        ['Annual plan', annualText]
    ], 'This is an estimate based on the starting prices. No order is created.');

    const next = createEl('a', 'btn btn-sm', 'Buy a membership');
    next.href = 'subscribe.html';
    result.appendChild(next);
}
registration.js
'use strict';

/* ==========================================================
   registration.js - registration.html: front-end validation only.
   No account is created and nobody is signed in.
   Passwords are never stored, shown, put in a URL or printed.
   ========================================================== */

const PASSWORD_RULES = [
    { id: 'length', text: 'At least 8 characters', test: value => /^.{8,}$/.test(value) },
    { id: 'upper', text: 'One uppercase letter', test: value => /[A-Z]/.test(value) },
    { id: 'lower', text: 'One lowercase letter', test: value => /[a-z]/.test(value) },
    { id: 'digit', text: 'One digit', test: value => /\d/.test(value) },
    { id: 'special', text: 'One special character', test: value => /[^A-Za-z0-9]/.test(value) }
];

const registrationRefs = {};

document.addEventListener('DOMContentLoaded', initRegistration);

// ---------- Helpers ----------
function isPasswordStrong(value) {
    return PASSWORD_RULES.every(rule => rule.test(value));
}

function createPasswordRow(id, labelText) {
    const row = createEl('div', 'form-row');
    const label = createEl('label', '', labelText);
    label.htmlFor = id;
    const input = createEl('input');
    input.type = 'password';
    input.id = id;
    input.name = id;
    input.autocomplete = 'new-password';
    input.required = true;
    row.append(label, input);
    return { row, input };
}

// Returns an object like { account: 'message' }; an empty object means the form is valid.
function validateRegistration(values) {
    const errors = {};

    const account = values.account.trim();
    if (account === '') {
        errors.account = 'Choose an account name.';
    } else if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(account)) {
        errors.account = 'Use 3-20 letters, digits or underscores, starting with a letter.';
    }

    const nameError = validateName(values.name);
    if (nameError !== '') {
        errors.name = nameError;
    }
    const phoneError = validatePhone(values.phone, true);
    if (phoneError !== '') {
        errors.phone = phoneError;
    }
    const emailError = validateEmail(values.email);
    if (emailError !== '') {
        errors.email = emailError;
    }

    if (!isPasswordStrong(values.password)) {
        errors.password = 'The password must meet every rule in the checklist.';
    }
    if (values.confirm === '') {
        errors.confirm = 'Repeat the password.';
    } else if (values.confirm !== values.password) {
        errors.confirm = 'The passwords do not match.';
    }

    return errors;
}

// ---------- UI ----------
function initRegistration() {
    const form = byId('js-registration-form');
    if (form === null) {
        return;
    }
    form.noValidate = true;

    const helper = form.querySelector('.form-helper');
    helper.textContent = 'Front-end demonstration: no account is created. A summary appears right below.';
    const parent = helper.parentElement;

    const password = createPasswordRow('js-registration-password', 'Password');
    const confirm = createPasswordRow('js-registration-password-confirm', 'Confirm password');

    const checklist = createEl('ul', 'form-helper');
    checklist.id = 'js-registration-checklist';
    checklist.setAttribute('aria-live', 'polite');
    const items = PASSWORD_RULES.map(rule => {
        const item = createEl('li');
        checklist.appendChild(item);
        return item;
    });

    const toggleRow = createEl('div', 'form-row');
    const toggle = createEl('button', 'btn btn-outline btn-sm', 'Show password');
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-controls', `${password.input.id} ${confirm.input.id}`);
    toggleRow.appendChild(toggle);

    [password.row, checklist, confirm.row, toggleRow].forEach(el => parent.insertBefore(el, helper));

    Object.assign(registrationRefs, {
        form,
        box: byId('js-registration-confirmation'),
        password: password.input,
        confirm: confirm.input,
        items,
        toggle,
        inputs: {
            account: byId('js-registration-account'),
            name: byId('js-registration-name'),
            phone: byId('js-registration-phone'),
            email: byId('js-registration-email'),
            password: password.input,
            confirm: confirm.input
        }
    });

    updateChecklist('');

    form.addEventListener('submit', handleRegistrationSubmit);
    form.addEventListener('input', handleRegistrationInput);
    form.addEventListener('reset', handleRegistrationReset);
    toggle.addEventListener('click', togglePasswordVisibility);
}

function updateChecklist(value) {
    PASSWORD_RULES.forEach((rule, index) => {
        const met = rule.test(value);
        const item = registrationRefs.items[index];
        item.textContent = `${met ? '\u2714' : '\u2718'} ${rule.text}`;
        item.classList.toggle('success-message', met);
        item.classList.toggle('error-message', !met);
    });
}

function setPasswordVisibility(isVisible) {
    [registrationRefs.password, registrationRefs.confirm].forEach(input => {
        input.type = isVisible ? 'text' : 'password';
    });
    registrationRefs.toggle.textContent = isVisible ? 'Hide password' : 'Show password';
    registrationRefs.toggle.setAttribute('aria-pressed', String(isVisible));
}

function togglePasswordVisibility() {
    setPasswordVisibility(registrationRefs.password.type === 'password');
}

function handleRegistrationInput(event) {
    clearFieldError(event.target);
    if (event.target === registrationRefs.password) {
        updateChecklist(registrationRefs.password.value);
    }
}

function handleRegistrationReset() {
    clearErrors(registrationRefs.form);
    hideConfirmation(registrationRefs.box);
    updateChecklist('');
    setPasswordVisibility(false);
}

function handleRegistrationSubmit(event) {
    event.preventDefault();
    const { form, box, inputs } = registrationRefs;

    const values = {
        account: inputs.account.value,
        name: inputs.name.value,
        phone: inputs.phone.value,
        email: inputs.email.value,
        password: inputs.password.value,
        confirm: inputs.confirm.value
    };

    clearErrors(form);
    hideConfirmation(box);
    const errors = validateRegistration(values);
    const invalidKeys = Object.keys(errors);

    if (invalidKeys.length > 0) {
        invalidKeys.forEach(key => setFieldError(inputs[key], errors[key]));
        showConfirmation(box, 'error', `please fix ${invalidKeys.length} marked field(s).`, [], '');
        focusFirstInvalid(form);
        return;
    }

    // The password is checked and then wiped: it is not part of the summary.
    inputs.password.value = '';
    inputs.confirm.value = '';
    updateChecklist('');
    setPasswordVisibility(false);

    showConfirmation(box, 'success', `registration form checked for ${values.name.trim()}.`, [
        ['Account name', values.account.trim()],
        ['Name', values.name.trim()],
        ['Telephone', values.phone.trim()],
        ['Email', values.email.trim()],
        ['Demo reference', generateReference()]
    ], `No account was created and you are not signed in. ${DEMO_NOTE}`);
}
subscribe.js
'use strict';

/* ==========================================================
   subscribe.js - subscribe.html: choose items, fill the cart,
   validate the form and show a demonstration summary.
   No payment is taken. Card details are checked in the browser
   only, are never stored or shown, and are cleared after use.
   ========================================================== */

// Items that can be put into the cart. Prices come from main.js (one source of truth).
const CART_ITEMS = [
    { id: 'monthly', name: findPlan('monthly').name, unit: 'month', price: findPlan('monthly').price, maxQty: 12, kind: 'membership' },
    { id: 'annual', name: findPlan('annual').name, unit: 'year', price: findPlan('annual').price, maxQty: 1, kind: 'membership' },
    { id: 'training', name: 'Personal Training Session', unit: 'session', price: SESSION_PRICES.individual, maxQty: 10, kind: 'extra' }
];

const cart = []; // lines like { itemId: 'monthly', qty: 3 }
const subscribeRefs = {};

document.addEventListener('DOMContentLoaded', initSubscribe);

// ---------- Cart logic (no DOM) ----------
function findItem(itemId) {
    return CART_ITEMS.find(item => item.id === itemId);
}

function findLine(itemId) {
    return cart.find(line => line.itemId === itemId);
}

function calcLineTotal(line) {
    return findItem(line.itemId).price * line.qty;
}

function calcCartTotals() {
    return cart.reduce((totals, line) => ({
        quantity: totals.quantity + line.qty,
        total: totals.total + calcLineTotal(line)
    }), { quantity: 0, total: 0 });
}

// Every cart action returns { ok, message } so the page can always tell the visitor what happened.
function addToCart(itemId) {
    const item = findItem(itemId);
    const line = findLine(itemId);
    const otherMembership = cart.find(entry => findItem(entry.itemId).kind === 'membership' && entry.itemId !== itemId);

    if (item.kind === 'membership' && otherMembership !== undefined) {
        return { ok: false, message: `Cannot add: ${findItem(otherMembership.itemId).name} is already in your cart. Remove it first.` };
    }
    if (line !== undefined && line.qty >= item.maxQty) {
        return { ok: false, message: `Cannot add: the maximum for ${item.name} is ${item.maxQty}.` };
    }
    if (line === undefined) {
        cart.push({ itemId: itemId, qty: 1 });
    } else {
        line.qty += 1;
    }
    return { ok: true, message: `Added: ${item.name}.` };
}

function changeQty(itemId, step) {
    const item = findItem(itemId);
    const line = findLine(itemId);
    const newQty = line.qty + step;

    if (newQty < 1 || newQty > item.maxQty) {
        return { ok: false, message: `Quantity of ${item.name} must be from 1 to ${item.maxQty}.` };
    }
    line.qty = newQty;
    return { ok: true, message: `${item.name}: quantity is now ${newQty}.` };
}

function removeLine(itemId) {
    const index = cart.findIndex(line => line.itemId === itemId);
    cart.splice(index, 1);
    return { ok: true, message: `Removed: ${findItem(itemId).name}.` };
}

function clearCart() {
    cart.length = 0;
    return { ok: true, message: 'Cart cleared.' };
}

// Returns an object like { card: 'message' }; an empty object means the form is valid.
function validatePurchase(values) {
    const errors = {};

    const nameError = validateName(values.fullname);
    if (nameError !== '') {
        errors.fullname = nameError;
    }
    const emailError = validateEmail(values.email);
    if (emailError !== '') {
        errors.email = emailError;
    }

    if (!/^\d{16}$/.test(values.card.replace(/\s/g, ''))) {
        errors.card = 'Card number must have 16 digits.';
    }

    const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(values.expiry.trim());
    if (expiry === null) {
        errors.expiry = 'Use MM/YY, for example 08/28.';
    } else if (new Date(2000 + Number(expiry[2]), Number(expiry[1]), 0) < startOfToday()) {
        errors.expiry = 'This card has expired.';
    }

    if (!/^\d{3}$/.test(values.cvc.trim())) {
        errors.cvc = 'CVC must have 3 digits.';
    }

    return errors;
}

// ---------- UI ----------
function initSubscribe() {
    const form = byId('js-subscribe-form');
    if (form === null) {
        return;
    }
    form.noValidate = true;

    const helper = form.querySelector('.form-helper');
    helper.textContent = 'Demonstration: nothing is charged. A summary of your choice appears right below.';

    const planSet = form.querySelector('fieldset');

    // Buttons that put the chosen plan or a training session into the cart.
    const actions = createEl('div', 'cart-actions');
    const addBtn = createEl('button', 'btn btn-sm', 'Add to cart');
    addBtn.type = 'button';
    const trainingItem = findItem('training');
    const trainingBtn = createEl('button', 'btn btn-outline btn-sm', `Add personal training session (${formatPrice(trainingItem.price)})`);
    trainingBtn.type = 'button';
    actions.append(addBtn, trainingBtn);
    planSet.appendChild(actions);

    const feedback = createEl('p', 'form-helper');
    feedback.id = 'js-subscribe-feedback';
    feedback.tabIndex = -1;
    feedback.setAttribute('aria-live', 'polite');
    planSet.appendChild(feedback);

    // The cart panel is created here because the page has no prepared cart container.
    const panel = createEl('section', 'cart-panel');
    panel.setAttribute('aria-labelledby', 'js-subscribe-cart-title');
    const title = createEl('h3', '', 'Your cart');
    title.id = 'js-subscribe-cart-title';
    const empty = createEl('p', 'cart-empty', 'Your cart is empty. Choose a plan above and press "Add to cart"; Confirm Purchase unlocks when the cart has an item.');
    const list = createEl('ul', 'cart-list hidden');
    const footer = createEl('div', 'cart-footer hidden');
    const summary = createEl('strong', 'cart-summary');
    summary.setAttribute('aria-live', 'polite');
    const clearBtn = createEl('button', 'btn btn-outline btn-sm', 'Clear cart');
    clearBtn.type = 'button';
    footer.append(summary, clearBtn);
    panel.append(title, empty, list, footer);
    planSet.after(panel);

    Object.assign(subscribeRefs, {
        form,
        box: byId('js-subscribe-confirmation'),
        submitBtn: byId('js-subscribe-submit-btn'),
        addBtn, trainingBtn, feedback, empty, list, footer, summary, clearBtn,
        planInputs: Array.from(form.querySelectorAll('input[name="plan"]')),
        fullname: byId('js-subscribe-fullname'),
        email: byId('js-subscribe-email'),
        card: byId('js-subscribe-card-number'),
        expiry: byId('js-subscribe-card-expiry'),
        cvc: byId('js-subscribe-card-cvc')
    });

    addBtn.addEventListener('click', handleAddPlan);
    trainingBtn.addEventListener('click', () => runCartAction(addToCart('training'), 'training', 'plus'));
    clearBtn.addEventListener('click', () => runCartAction(clearCart(), null, null));
    form.addEventListener('submit', handleSubscribeSubmit);
    form.addEventListener('input', handleSubscribeInput);
    form.addEventListener('change', handleSubscribeInput);

    refreshPlanView();
    renderCart();
}

function selectedPlanId() {
    const checked = subscribeRefs.form.querySelector('input[name="plan"]:checked');
    return checked !== null ? checked.value : 'annual';
}

// Highlights the chosen plan card and enables or disables "Add to cart" for it.
function refreshPlanView() {
    const plan = findPlan(selectedPlanId());
    subscribeRefs.planInputs.forEach(input => {
        const body = input.closest('.plan-option').querySelector('.plan-option-body');
        body.classList.toggle('selected', input.checked);
    });
    subscribeRefs.addBtn.disabled = !plan.payOnline;
    subscribeRefs.feedback.textContent = plan.payOnline
        ? `${plan.name}: ${formatPrice(plan.price)}. Press "Add to cart" to choose it.`
        : 'A single visit is paid at the front desk, so there is nothing to add to the cart.';
}

function handleAddPlan() {
    const planId = selectedPlanId();
    if (findItem(planId) === undefined) {
        // A single visit is not sold online, so it has no cart item.
        runCartAction({ ok: false, message: 'A single visit is paid at the front desk, so there is nothing to add to the cart.' }, null, null);
        return;
    }
    runCartAction(addToCart(planId), planId, 'plus');
}

// Shows the message, redraws the cart and keeps keyboard focus in a sensible place.
function runCartAction(result, itemId, role) {
    subscribeRefs.feedback.textContent = result.message;
    renderCart();

    const target = itemId !== null
        ? subscribeRefs.list.querySelector(`[data-item="${itemId}"] [data-role="${role}"]`)
        : null;
    if (target !== null && !target.disabled) {
        target.focus();
    } else {
        subscribeRefs.feedback.focus();
    }
}

function renderCart() {
    const { list, empty, footer, summary, submitBtn } = subscribeRefs;
    const isEmpty = cart.length === 0;
    const totals = calcCartTotals();

    list.replaceChildren();
    cart.forEach(line => list.appendChild(renderCartLine(line)));

    empty.classList.toggle('hidden', !isEmpty);
    list.classList.toggle('hidden', isEmpty);
    footer.classList.toggle('hidden', isEmpty);
    summary.textContent = `Items: ${totals.quantity} | Total: ${formatPrice(totals.total)}`;
    submitBtn.disabled = isEmpty;
}

// One function draws every cart line: name, quantity buttons, line subtotal, remove.
function renderCartLine(line) {
    const item = findItem(line.itemId);
    const row = createEl('li', 'cart-line');
    row.dataset.item = item.id;

    const info = createEl('div', 'cart-line-info');
    info.append(createEl('strong', '', item.name), createEl('span', 'cart-line-price', `${formatPrice(item.price)} per ${item.unit}`));

    const minus = createEl('button', 'btn btn-outline btn-sm', '\u2212');
    minus.type = 'button';
    minus.dataset.role = 'minus';
    minus.setAttribute('aria-label', `Decrease quantity of ${item.name}`);
    minus.disabled = line.qty <= 1;
    const plus = createEl('button', 'btn btn-outline btn-sm', '+');
    plus.type = 'button';
    plus.dataset.role = 'plus';
    plus.setAttribute('aria-label', `Increase quantity of ${item.name}`);
    plus.disabled = line.qty >= item.maxQty;
    const qty = createEl('span', 'cart-qty-value', String(line.qty));
    const qtyBox = createEl('div', 'cart-qty');
    qtyBox.append(minus, qty, plus);

    const total = createEl('span', 'cart-line-total', formatPrice(calcLineTotal(line)));

    const remove = createEl('button', 'btn btn-outline btn-sm', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${item.name} from the cart`);

    minus.addEventListener('click', () => runCartAction(changeQty(item.id, -1), item.id, 'minus'));
    plus.addEventListener('click', () => runCartAction(changeQty(item.id, 1), item.id, 'plus'));
    remove.addEventListener('click', () => runCartAction(removeLine(item.id), null, null));

    row.append(info, qtyBox, total, remove);
    return row;
}

function handleSubscribeInput(event) {
    clearFieldError(event.target);
    if (event.target.name === 'plan') {
        refreshPlanView();
    }
}

function handleSubscribeSubmit(event) {
    event.preventDefault();
    const { form, box } = subscribeRefs;

    clearErrors(form);
    hideConfirmation(box);

    if (cart.length === 0) {
        showConfirmation(box, 'error', 'your cart is empty. Add an item first.', [], '');
        return;
    }

    const values = {
        fullname: subscribeRefs.fullname.value,
        email: subscribeRefs.email.value,
        card: subscribeRefs.card.value,
        expiry: subscribeRefs.expiry.value,
        cvc: subscribeRefs.cvc.value
    };
    const errors = validatePurchase(values);
    const invalidKeys = Object.keys(errors);

    if (invalidKeys.length > 0) {
        invalidKeys.forEach(key => setFieldError(subscribeRefs[key], errors[key]));
        showConfirmation(box, 'error', `please fix ${invalidKeys.length} marked field(s).`, [], '');
        focusFirstInvalid(form);
        return;
    }

    const totals = calcCartTotals();
    const rows = cart.map(line => {
        const item = findItem(line.itemId);
        return [item.name, `${line.qty} x ${formatPrice(item.price)} = ${formatPrice(calcLineTotal(line))}`];
    });
    rows.push(
        ['Total', `${formatPrice(totals.total)} (${totals.quantity} item(s))`],
        ['Name', values.fullname.trim()],
        ['Email', values.email.trim()],
        ['Demo reference', generateReference()]
    );

    // Card details are wiped right after the check; they are never shown or kept.
    subscribeRefs.card.value = '';
    subscribeRefs.expiry.value = '';
    subscribeRefs.cvc.value = '';
    clearCart();
    renderCart();
    subscribeRefs.feedback.textContent = 'The cart was emptied after the demonstration request.';

    showConfirmation(box, 'success', `purchase request prepared for ${values.fullname.trim()}.`, rows,
        `Nothing was charged. Card details were checked in your browser only and have been cleared. ${DEMO_NOTE}`);
}