'use strict';

/* ==========================================================
   index.js (jQuery) - index.html: membership cost estimator.
   jQuery 3.7.1 is linked in index.html before this file.
   Uses the shared PLANS array from main.js.

   REWRITTEN FEATURE 3 - show and hide of a block (the estimate result).
   Replaced: document.createElement + append + classList.toggle +
   addEventListener  ->  $('<div>', {...}) + .append() + .fadeIn()/.fadeOut() + .on().
   The page code is shorter and chains read top to bottom.
   ========================================================== */

const MAX_ESTIMATE_MONTHS = 60;

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

$(function () {
    const $host = $('.pricing');
    if ($host.length === 0) return;

    const monthly = findPlan('monthly');
    const annual = findPlan('annual');

    const $input = $('<input>', { type: 'number', id: 'js-index-months', name: 'months', min: 1, max: MAX_ESTIMATE_MONTHS, step: 1, placeholder: 'e.g. 6', required: true });
    const $calcBtn = $('<button>', { type: 'submit', class: 'btn btn-sm', text: 'Calculate' });
    const $resetBtn = $('<button>', { type: 'reset', class: 'btn btn-outline btn-sm', text: 'Clear' });
    const $form = $('<form>').append(
        $('<div>', { class: 'form-row' }).append($('<label>').attr('for', 'js-index-months').text('Months of training'), $input),
        $calcBtn, $resetBtn
    );
    const $result = $('<div>', { id: 'js-index-estimate', class: 'confirmation-box hidden', role: 'status', 'aria-live': 'polite' });

    const $explainBtn = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: 'How is this calculated?', 'aria-expanded': 'false' });
    const $explain = $('<p>', { class: 'form-helper' })
        .html(`Monthly: <strong>months x ${formatPrice(monthly.price)}</strong>. Annual: <strong>whole years (rounded up) x ${formatPrice(annual.price)}</strong>.`)
        .hide();

    $('<div>', { class: 'mt-4' }).append(
        $('<h3>').text('Estimate your cost'),
        $('<p>', { class: 'form-helper', text: 'Enter how many months you plan to train. Prices start from the amounts in the table; the front desk confirms the final price.' }),
        $form, $explainBtn, $explain, $result
    ).appendTo($host);

    $input.on('input', function () { jqClearFieldError($(this)); });

    $form.on('submit', function (event) {
        event.preventDefault();
        const raw = $input.val().trim();
        const months = Number(raw);
        jqClearFieldError($input);

        if (raw === '') {
            jqFieldError($input, 'Enter the number of months.');
        } else if (!Number.isInteger(months) || months < 1 || months > MAX_ESTIMATE_MONTHS) {
            jqFieldError($input, `Enter a whole number from 1 to ${MAX_ESTIMATE_MONTHS}.`);
        }
        if ($input.hasClass('error')) {
            jqHideBox($result);
            $input.trigger('focus');
            return;
        }

        const cost = estimateCost(months);
        jqShowBox($result, 'success', `estimate for ${months} month(s).`, [
            ['Monthly plan', `${months} x ${formatPrice(monthly.price)} = ${formatPrice(cost.monthlyTotal)}`],
            ['Annual plan', `${cost.annualPacks} x ${formatPrice(annual.price)} = ${formatPrice(cost.annualTotal)} (covers ${cost.coveredMonths} months)`]
        ], 'This is an estimate based on the starting prices. No order is created.');
        $('<a>', { class: 'btn btn-sm', href: 'subscribe.html', text: 'Buy a membership' }).appendTo($result);
    });

    $form.on('reset', function () {
        jqClearFieldError($input);
        jqHideBox($result);
    });

    $explainBtn.on('click', function () {
        $explain.slideToggle(200, function () {
            $explainBtn.attr('aria-expanded', String($(this).is(':visible')));
        });
    });
});