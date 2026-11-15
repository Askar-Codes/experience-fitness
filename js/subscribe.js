'use strict';

/* ==========================================================
   subscribe.js (jQuery) - subscribe.html: purchase in two steps.
   Step 1 (on the page): the visitor chooses a plan and presses "Buy".
   Step 2 (a pop-up window): the order (cart), personal details and payment
   details; "Confirm Purchase" is inside the window.

   jQuery 3.7.1 is linked in subscribe.html before this file. Our code cannot call
   a library that has not loaded yet, so the order of the <script> tags matters:
   jQuery -> main.js -> jquery-common.js -> subscribe.js.

   No payment is taken. Card details are checked in the browser only, are never
   stored or shown, and are cleared after use.

   REWRITTEN FEATURE - the list built in code (the order / cart).
   Replaced: createElement + append + replaceChildren + an addEventListener on every button
   -> $('<li>', {...}) + .appendTo() + .empty() + ONE delegated .on('click', '.cart-plus', ...).
   The old code attached new listeners to every button after every redraw; now three listeners
   on the list are enough, so the code is shorter and easier to follow. The cart rules (add,
   change, remove) are plain functions over an array and did not change: jQuery is for the page,
   not for arrays. The old version is kept in old-js-version.js.
   ========================================================== */

// Items that can be put into the order. Prices come from main.js (one source of truth).
const CART_ITEMS = [
    { id: 'monthly', name: findPlan('monthly').name, unit: 'month', price: findPlan('monthly').price, maxQty: 12, kind: 'membership' },
    { id: 'annual', name: findPlan('annual').name, unit: 'year', price: findPlan('annual').price, maxQty: 1, kind: 'membership' },
    { id: 'training', name: 'Personal Training Session', unit: 'session', price: SESSION_PRICES.individual, maxQty: 10, kind: 'extra' }
];

const cart = []; // lines like { itemId: 'monthly', qty: 3 }
const SINGLE_VISIT_MESSAGE = 'A single visit is paid at the front desk, so there is nothing to buy online.';

// ---------- Cart logic (no page access, plain functions over the array) ----------
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

// "Buy": the order holds exactly one membership, the chosen one. An earlier choice is replaced,
// an extra (a training session) stays. Every action returns { ok, message } for the visitor.
function selectMembership(itemId) {
    const line = findLine(itemId);
    cart.filter(entry => findItem(entry.itemId).kind === 'membership' && entry.itemId !== itemId)
        .forEach(entry => removeLine(entry.itemId));
    if (line === undefined) {
        cart.push({ itemId: itemId, qty: 1 });
    }
    return { ok: true, isNew: line === undefined, message: `${findItem(itemId).name} is in your order.` };
}

function addToCart(itemId) {
    const item = findItem(itemId);
    const line = findLine(itemId);

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
    return { ok: true, message: 'Order cleared.' };
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

    const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(values.expiry);
    if (expiry === null) {
        errors.expiry = 'Use MM/YY, for example 08/28.';
    } else if (new Date(2000 + Number(expiry[2]), Number(expiry[1]), 0) < startOfToday()) {
        errors.expiry = 'This card has expired.';
    }

    if (!/^\d{3}$/.test(values.cvc)) {
        errors.cvc = 'CVC must have 3 digits.';
    }

    return errors;
}

// $(function () { ... }) = $(document).ready(): runs once the HTML is parsed, so $('#id') finds the elements.
$(function () {
    const $form = $('#js-subscribe-form'); // selector by id
    if ($form.length === 0) {
        return;
    }
    const $box = $('#js-subscribe-confirmation');
    const $submit = $('#js-subscribe-submit-btn');
    const $plans = $form.find('input[name="plan"]'); // selector by attribute
    const $fields = {
        fullname: $('#js-subscribe-fullname'),
        email: $('#js-subscribe-email'),
        card: $('#js-subscribe-card-number'),
        expiry: $('#js-subscribe-card-expiry'),
        cvc: $('#js-subscribe-card-cvc')
    };
    const $plansSet = $form.find('fieldset').first(); // step 1: the plan cards
    let isCheckoutOpen = false; // changes when the pop-up opens and closes, so let

    $form.children('.form-helper').text('Demonstration: nothing is charged. A summary of your choice appears right below.');

    // --- step 1 (on the page): the Buy button and a short note under the plan cards ---
    const $buyBtn = $('<button>', { type: 'button', id: 'js-subscribe-buy-btn', class: 'btn btn-lg', text: 'Buy' });
    const $planNote = $('<p>', { id: 'js-subscribe-plan-note', class: 'form-helper', 'aria-live': 'polite' });
    $plansSet.append($('<div>', { class: 'cart-actions' }).append($buyBtn), $planNote);

    // --- step 2: the order panel (the page has no prepared cart, so jQuery builds it) ---
    const $feedback = $('<p>', { id: 'js-subscribe-feedback', class: 'form-helper', tabindex: -1, 'aria-live': 'polite' });
    const $empty = $('<p>', { class: 'cart-empty', text: 'Your order is empty. Close this window, choose a plan and press "Buy".' });
    const $list = $('<ul>', { class: 'cart-list hidden' });
    const $trainingBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: `Add personal training session (${formatPrice(findItem('training').price)})` });
    const $summary = $('<strong>', { class: 'cart-summary', 'aria-live': 'polite' });
    const $clearBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Clear order' });
    const $footer = $('<div>', { class: 'cart-footer hidden' }).append($summary, $clearBtn);
    const $panel = $('<section>', { class: 'cart-panel', 'aria-labelledby': 'js-subscribe-cart-title' }).append(
        $('<h3>', { id: 'js-subscribe-cart-title', text: 'Your order' }),
        $feedback,
        $empty,
        $list,
        $('<div>', { class: 'cart-actions' }).append($trainingBtn),
        $footer
    );
    $plansSet.after($panel);

    // --- input locks: the code only lets the right characters in, so nobody has to type spaces or the slash ---
    // inputmode makes phones show the number keypad; maxlength is the second lock; autocomplete is off
    // because a demonstration form must not offer the visitor's real saved cards.
    $fields.card.attr({ inputmode: 'numeric', maxlength: 19, autocomplete: 'off' }).on('input', function () {
        $(this).val(formatCardNumber($(this).val())); // digits only, 16 at most, a space after every 4
    });
    $fields.expiry.attr({ inputmode: 'numeric', maxlength: 5, autocomplete: 'off' }).on('input', function () {
        $(this).val(formatExpiry($(this).val())); // 0828 -> 08/28, the month can only be 01-12
    });
    $fields.cvc.attr({ inputmode: 'numeric', maxlength: 3, autocomplete: 'off' }).on('input', function () {
        $(this).val(keepDigits($(this).val(), 3)); // digits only, 3 at most
    });

    // --- the checkout window (pop-up) ---
    // wrapAll puts the order panel, both detail fieldsets, the helper text and the submit button into ONE
    // wrapper. The wrapper gets the classes of the pop-up window that already exist in the stylesheet
    // (tb-overlay: dark background, tb-panel: white window, tb-hidden: hidden). It stays inside the <form>,
    // so the fields still belong to the form even though they are drawn in the window.
    $panel.add($form.children('fieldset').not($plansSet)).add($form.children('.form-helper')).add($submit)
        .wrapAll($('<div>', { id: 'js-subscribe-checkout', class: 'tb-overlay tb-hidden', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'js-subscribe-checkout-title' }));
    const $checkout = $('#js-subscribe-checkout');
    $checkout.wrapInner($('<div>', { class: 'tb-panel' }));
    const $closeBtn = $('<button>', { type: 'button', class: 'tb-close', 'aria-label': 'Close checkout', text: '\u00d7' });
    const $cancelBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm mt-3', text: 'Cancel' });
    $checkout.children('.tb-panel').prepend($closeBtn, $('<h2>', { id: 'js-subscribe-checkout-title', class: 'tb-title', text: 'Checkout' }));
    $submit.after($cancelBtn);

    // The submit button works only while the window is open and the order has an item.
    function syncSubmit() {
        $submit.prop('disabled', cart.length === 0 || !isCheckoutOpen);
    }

    function openCheckout() {
        if (isCheckoutOpen) {
            return;
        }
        isCheckoutOpen = true;
        $('body').addClass('tb-no-scroll'); // the page behind the window does not scroll
        // Chain, link by link:
        // removeClass('tb-hidden') - the class uses display:none !important, which would beat the inline
        //                            style that fadeIn() sets, so the class goes first;
        // hide()                   - jQuery puts its own inline display:none instead (no !important);
        // fadeIn(200)              - the window appears smoothly in 200 ms.
        $checkout.removeClass('tb-hidden').hide().fadeIn(200);
        syncSubmit();
        $fields.fullname.trigger('focus');
    }

    function closeCheckout(restoreFocus) {
        if (!isCheckoutOpen) {
            return;
        }
        isCheckoutOpen = false;
        syncSubmit();
        $('body').removeClass('tb-no-scroll');
        // The callback runs AFTER the fade has finished: only then does the prepared class take over again.
        $checkout.fadeOut(200, function () {
            $(this).addClass('tb-hidden').removeAttr('style');
            if (restoreFocus) {
                $buyBtn.trigger('focus');
            }
        });
        if (restoreFocus && cart.length > 0) {
            $planNote.text('Your order is kept. Press "Buy" to continue.');
        }
    }

    function selectedPlanId() {
        const id = $form.find('input[name="plan"]:checked').val(); // :checked filter + val()
        return id !== undefined ? id : 'annual';
    }

    // Marks the chosen plan card and switches "Buy" on or off.
    function refreshPlanView() {
        const plan = findPlan(selectedPlanId());
        $plans.each(function () {
            // prop('checked') is the CURRENT state of the radio; attr('checked') would only show what the HTML said at load.
            $(this).closest('.plan-option').find('.plan-option-body').toggleClass('selected', $(this).prop('checked'));
        });
        $buyBtn.prop('disabled', !plan.payOnline); // disabled is a property that changes, so prop()
        $planNote.text(plan.payOnline
            ? `${plan.name}: ${formatPrice(plan.price)}. Press "Buy" to continue.`
            : SINGLE_VISIT_MESSAGE);
    }

    // One function draws every order line from an array item.
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
            .attr('aria-label', `Remove ${item.name} from the order`);

        return $('<li>', { class: 'cart-line' }).attr('data-item', item.id).append($info, $qty, $total, $remove);
    }

    // Redraws the whole order from the array. A line that was just added slides in.
    function renderCart(newItemId) {
        const isEmpty = cart.length === 0;
        const totals = calcCartTotals();

        $empty.toggleClass('hidden', !isEmpty);
        $list.add($footer).toggleClass('hidden', isEmpty);
        $summary.text(`Items: ${totals.quantity} | Total: ${formatPrice(totals.total)}`);
        $submit.text(isEmpty ? 'Confirm Purchase' : `Confirm Purchase (${formatPrice(totals.total)})`);
        syncSubmit(); // checkout is disabled while the order is empty

        $list.empty();
        $.each(cart, function (index, line) {
            const $line = renderCartLine(line).appendTo($list);
            if (line.itemId === newItemId) {
                $line.hide().slideDown(200);
            }
        });
    }

    // Shows the message, redraws the order and keeps keyboard focus in a sensible place.
    function runAction(result, itemId, role, newItemId) {
        $feedback.text(result.message);
        renderCart(newItemId);
        const $target = itemId === null ? $() : $list.find(`[data-item="${itemId}"] .cart-${role}`);
        ($target.length > 0 && !$target.prop('disabled') ? $target : $feedback).trigger('focus');
    }

    // --- events ---
    $buyBtn.on('click', function () {
        const planId = selectedPlanId();
        if (findItem(planId) === undefined) {
            $planNote.text(SINGLE_VISIT_MESSAGE);
            return;
        }
        const result = selectMembership(planId);
        runAction(result, planId, 'plus', result.isNew ? planId : undefined);
        openCheckout(); // the window opens after Buy; it moves the focus to the first field
    });
    $trainingBtn.on('click', function () {
        const result = addToCart('training');
        runAction(result, 'training', 'plus', result.isNew ? 'training' : undefined);
    });
    $clearBtn.on('click', function () {
        runAction(clearCart(), null, null);
    });
    $form.on('change', 'input[name="plan"]', refreshPlanView);

    $closeBtn.add($cancelBtn).on('click', function () {
        closeCheckout(true);
    });
    // Escape closes the window; a click on the dark background (not on the white window) closes it too.
    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            closeCheckout(true);
        }
    });
    $checkout.on('click', function (event) {
        if (event.target === this) {
            closeCheckout(true);
        }
    });
    // Tab stays inside the open window: from the last control it goes back to the first one (and Shift+Tab the other way).
    $checkout.on('keydown', function (event) {
        if (event.key !== 'Tab') {
            return;
        }
        const $items = $checkout.find('button, input').filter(':visible').not(':disabled');
        if ($items.length === 0) {
            return;
        }
        if (event.shiftKey && $(event.target).is($items.first())) {
            event.preventDefault();
            $items.last().trigger('focus');
        } else if (!event.shiftKey && $(event.target).is($items.last())) {
            event.preventDefault();
            $items.first().trigger('focus');
        }
    });

    // DELEGATED handlers. They are bound to the list, which exists for the whole life of the page,
    // and react to clicks on .cart-plus / .cart-minus / .cart-remove inside it.
    // Binding directly to the buttons ($('.cart-plus').on(...)) would not work here: the lines
    // are created by our own code AFTER the page loads and are destroyed and rebuilt by
    // $list.empty() on every redraw, so a handler bound to one button would vanish with it
    // (and at load time those buttons do not exist yet, so the selector would find nothing).
    // A click bubbles up from the button to the list, and jQuery then checks the selector.
    $list.on('click', '.cart-plus, .cart-minus', function () {
        const itemId = $(this).closest('.cart-line').data('item'); // from the clicked button up to its line
        const isPlus = $(this).hasClass('cart-plus');
        runAction(changeQty(itemId, isPlus ? 1 : -1), itemId, isPlus ? 'plus' : 'minus');
    });
    $list.on('click', '.cart-remove', function () {
        const $line = $(this).closest('.cart-line');
        const itemId = $line.data('item');
        // The callback runs after the fade has finished; only then is the line removed from the array.
        $line.fadeOut(200, function () {
            runAction(removeLine(itemId), null, null);
        });
    });

    // Typing in a field clears that field's old error at once.
    $form.on('input change', 'input', function () {
        jqClearFieldError($(this));
    });

    // The "required" attributes stay in the HTML: the browser checks them first.
    // A check in the browser never replaces a check on the server: a visitor can switch
    // JavaScript off or send the request by hand, so a real server must repeat every check.
    $form.on('submit', function (event) {
        // preventDefault stops the browser from sending the form and reloading the page;
        // without it the summary or the error messages would vanish at once.
        event.preventDefault();
        jqClearErrors($form);

        if (cart.length === 0) {
            $feedback.text('Error: your order is empty. Close this window, choose a plan and press "Buy".').trigger('focus');
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
            $.each(keys, function (index, key) {
                jqFieldError($fields[key], errors[key]);
            });
            // The window covers the page, so the summary of the problem is shown inside the window.
            $feedback.text(`Error: please fix ${keys.length} marked field(s).`);
            jqFocusFirstInvalid($form);
            return;
        }

        const totals = calcCartTotals();
        // $.map turns every order line into a [label, value] pair (an array inside an array is flattened one level).
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

        // Card details are wiped right after the check; they are never shown or kept.
        $fields.card.add($fields.expiry).add($fields.cvc).val('');
        clearCart();
        renderCart();
        $feedback.text('');
        closeCheckout(false); // the window closes; the summary below the form stays visible
        refreshPlanView();

        jqShowBox($box, 'success', `purchase request prepared for ${values.fullname}.`, rows,
            `Nothing was charged. Card details were checked in your browser only and have been cleared. ${DEMO_NOTE}`);
    });

    refreshPlanView();
    renderCart();
});