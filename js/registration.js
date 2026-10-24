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