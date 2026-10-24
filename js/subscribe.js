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