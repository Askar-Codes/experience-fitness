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