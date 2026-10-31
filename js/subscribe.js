'use strict';

/* ==========================================================
   subscribe.js (jQuery) - subscribe.html: cart and validation.
   jQuery 3.7.1 is linked in subscribe.html before this file.

   REWRITTEN FEATURE 2 - the list built in code (the cart).
   Replaced: createElement + append + replaceChildren + per-button addEventListener
   -> $('<li>', {...}) + .appendTo() + .empty() + ONE delegated .on('click', '.cart-plus', ...).
   ========================================================== */

const CART_ITEMS = [
    { id: 'monthly', name: findPlan('monthly').name, unit: 'month', price: findPlan('monthly').price, maxQty: 12, kind: 'membership' },
    { id: 'annual', name: findPlan('annual').name, unit: 'year', price: findPlan('annual').price, maxQty: 1, kind: 'membership' },
    { id: 'training', name: 'Personal Training Session', unit: 'session', price: SESSION_PRICES.individual, maxQty: 10, kind: 'extra' }
];

const cart = [];

function findItem(itemId) { return CART_ITEMS.find(item => item.id === itemId); }
function findLine(itemId) { return cart.find(line => line.itemId === itemId); }
function calcLineTotal(line) { return findItem(line.itemId).price * line.qty; }
function calcCartTotals() {
    return cart.reduce((totals, line) => ({
        quantity: totals.quantity + line.qty,
        total: totals.total + calcLineTotal(line)
    }), { quantity: 0, total: 0 });
}

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
    return { ok: true, isNew: line === undefined, message: `Added: ${item.name}.` };
}

function changeQty(itemId, step) {
    const item = findItem(itemId);
    const line = findLine(itemId);
    const newQty = line.qty + step;

    if (newQty < 1 || newQty > item.maxQty) return { ok: false, message: `Quantity of ${item.name} must be from 1 to ${item.maxQty}.` };
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

function validatePurchase(values) {
    const errors = {};
    const nameError = validateName(values.fullname);
    if (nameError !== '') errors.fullname = nameError;
    const emailError = validateEmail(values.email);
    if (emailError !== '') errors.email = emailError;

    if (!/^\d{16}$/.test(values.card.replace(/\s/g, ''))) errors.card = 'Card number must have 16 digits.';

    const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(values.expiry);
    if (expiry === null) {
        errors.expiry = 'Use MM/YY, for example 08/28.';
    } else if (new Date(2000 + Number(expiry[2]), Number(expiry[1]), 0) < startOfToday()) {
        errors.expiry = 'This card has expired.';
    }

    if (!/^\d{3}$/.test(values.cvc)) errors.cvc = 'CVC must have 3 digits.';
    return errors;
}

$(function () {
    const $form = $('#js-subscribe-form');
    if ($form.length === 0) return;

    const $box = $('#js-subscribe-confirmation');
    const $submit = $('#js-subscribe-submit-btn');
    const $plans = $form.find('input[name="plan"]');
    const $fields = {
        fullname: $('#js-subscribe-fullname'),
        email: $('#js-subscribe-email'),
        card: $('#js-subscribe-card-number'),
        expiry: $('#js-subscribe-card-expiry'),
        cvc: $('#js-subscribe-card-cvc')
    };

    $form.find('.form-helper').text('Demonstration: nothing is charged. A summary of your choice appears right below.');

    const $addBtn = $('<button>', { type: 'button', class: 'btn btn-sm', text: 'Add to cart' });
    const $trainingBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: `Add personal training session (${formatPrice(findItem('training').price)})` });
    const $feedback = $('<p>', { id: 'js-subscribe-feedback', class: 'form-helper', tabindex: -1, 'aria-live': 'polite' });

    const $empty = $('<p>', { class: 'cart-empty', text: 'Your cart is empty. Choose a plan above and press "Add to cart"; Confirm Purchase unlocks when the cart has an item.' });
    const $list = $('<ul>', { class: 'cart-list hidden' });
    const $summary = $('<strong>', { class: 'cart-summary', 'aria-live': 'polite' });
    const $clearBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Clear cart' });
    const $footer = $('<div>', { class: 'cart-footer hidden' }).append($summary, $clearBtn);
    const $panel = $('<section>', { class: 'cart-panel', 'aria-labelledby': 'js-subscribe-cart-title' }).append(
        $('<h3>', { id: 'js-subscribe-cart-title', text: 'Your cart' }), $empty, $list, $footer
    );

    $form.find('fieldset').first().append($('<div>', { class: 'cart-actions' }).append($addBtn, $trainingBtn), $feedback).after($panel);

    function selectedPlanId() {
        const id = $form.find('input[name="plan"]:checked').val();
        return id !== undefined ? id : 'annual';
    }

    function refreshPlanView() {
        const plan = findPlan(selectedPlanId());
        $plans.each(function () {
            $(this).closest('.plan-option').find('.plan-option-body').toggleClass('selected', $(this).prop('checked'));
        });
        $addBtn.prop('disabled', !plan.payOnline);
        $feedback.text(plan.payOnline
            ? `${plan.name}: ${formatPrice(plan.price)}. Press "Add to cart" to choose it.`
            : 'A single visit is paid at the front desk, so there is nothing to add to the cart.');
    }

    function renderCartLine(line) {
        const item = findItem(line.itemId);
        const $info = $('<div>', { class: 'cart-line-info' }).append(
            $('<strong>').text(item.name),
            $('<span>', { class: 'cart-line-price', text: `${formatPrice(item.price)} per ${item.unit}` })
        );
        const $minus = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm cart-minus', text: '\u2212' })
            .attr('aria-label', `Decrease quantity of ${item.name}`).prop('disabled', line.qty <= 1);
        const $plus = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm cart-plus', text: '+' })
            .attr('aria-label', `Increase quantity of ${item.name}`).prop('disabled', line.qty >= item.maxQty);
        const $qty = $('<div>', { class: 'cart-qty' }).append($minus, $('<span>', { class: 'cart-qty-value', text: String(line.qty) }), $plus);
        const $total = $('<span>', { class: 'cart-line-total', text: formatPrice(calcLineTotal(line)) });
        const $remove = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm cart-remove', text: 'Remove' })
            .attr('aria-label', `Remove ${item.name} from the cart`);

        return $('<li>', { class: 'cart-line' }).attr('data-item', item.id).append($info, $qty, $total, $remove);
    }

    function renderCart(newItemId) {
        const isEmpty = cart.length === 0;
        const totals = calcCartTotals();

        $empty.toggleClass('hidden', !isEmpty);
        $list.add($footer).toggleClass('hidden', isEmpty);
        $summary.text(`Items: ${totals.quantity} | Total: ${formatPrice(totals.total)}`);
        $submit.prop('disabled', isEmpty);

        $list.empty();
        $.each(cart, function (index, line) {
            const $line = renderCartLine(line).appendTo($list);
            if (line.itemId === newItemId) $line.hide().slideDown(200);
        });
    }

    function runAction(result, itemId, role, newItemId) {
        $feedback.text(result.message);
        renderCart(newItemId);
        const $target = itemId === null ? $() : $list.find(`[data-item="${itemId}"] .cart-${role}`);
        ($target.length > 0 && !$target.prop('disabled') ? $target : $feedback).trigger('focus');
    }

    function addFromButton(itemId) {
        if (findItem(itemId) === undefined) {
            runAction({ ok: false, message: 'A single visit is paid at the front desk, so there is nothing to add to the cart.' }, null, null);
            return;
        }
        const result = addToCart(itemId);
        runAction(result, itemId, 'plus', result.isNew ? itemId : undefined);
    }

    $addBtn.on('click', function () { addFromButton(selectedPlanId()); });
    $trainingBtn.on('click', function () { addFromButton('training'); });
    $clearBtn.on('click', function () { runAction(clearCart(), null, null); });
    $form.on('change', 'input[name="plan"]', refreshPlanView);

    $list.on('click', '.cart-plus, .cart-minus', function () {
        const itemId = $(this).closest('.cart-line').data('item');
        const isPlus = $(this).hasClass('cart-plus');
        runAction(changeQty(itemId, isPlus ? 1 : -1), itemId, isPlus ? 'plus' : 'minus');
    });
    $list.on('click', '.cart-remove', function () {
        const $line = $(this).closest('.cart-line');
        const itemId = $line.data('item');
        $line.fadeOut(200, function () { runAction(removeLine(itemId), null, null); });
    });

    $form.on('input change', 'input', function () { jqClearFieldError($(this)); });

    $form.on('submit', function (event) {
        event.preventDefault();
        jqClearErrors($form);

        if (cart.length === 0) {
            jqShowBox($box, 'error', 'your cart is empty. Add an item first.', [], '');
            return;
        }

        const values = {
            fullname: $fields.fullname.val().trim(),
            email: $fields.email.val().trim(),
            card: $fields.card.val().trim(),
            expiry: $fields.expiry.val().trim(),
            cvc: $fields.cvc.val().trim()
        };
        const errors = validatePurchase(values);
        const keys = Object.keys(errors);

        if (keys.length > 0) {
            $.each(keys, function (index, key) { jqFieldError($fields[key], errors[key]); });
            jqShowBox($box, 'error', `please fix ${keys.length} marked field(s).`, [], '');
            jqFocusFirstInvalid($form);
            return;
        }

        const totals = calcCartTotals();
        const rows = $.map(cart, function (line) {
            const item = findItem(line.itemId);
            return [[item.name, `${line.qty} x ${formatPrice(item.price)} = ${formatPrice(calcLineTotal(line))}`]];
        });
        rows.push(
            ['Total', `${formatPrice(totals.total)} (${totals.quantity} item(s))`],
            ['Name', values.fullname],
            ['Email', values.email],
            ['Demo reference', generateReference()]
        );

        $fields.card.add($fields.expiry).add($fields.cvc).val('');
        clearCart();
        renderCart();
        $feedback.text('The cart was emptied after the demonstration request.');

        jqShowBox($box, 'success', `purchase request prepared for ${values.fullname}.`, rows,
            `Nothing was charged. Card details were checked in your browser only and have been cleared. ${DEMO_NOTE}`);
    });

    refreshPlanView();
    renderCart();
});