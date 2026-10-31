'use strict';

/* ==========================================================
   registration.js (jQuery) - registration.html: validation.
   jQuery 3.7.1 is linked in registration.html before this file.

   REWRITTEN FEATURE 1 - form validation.
   Replaced: getElementById + createElement/append + classList + addEventListener
   -> $('#id') + $('<input>', {...}) + .before() + .toggleClass() + .on().
   ========================================================== */

const PASSWORD_RULES = [
    { id: 'length', text: 'At least 8 characters', test: value => /^.{8,}$/.test(value) },
    { id: 'upper', text: 'One uppercase letter', test: value => /[A-Z]/.test(value) },
    { id: 'lower', text: 'One lowercase letter', test: value => /[a-z]/.test(value) },
    { id: 'digit', text: 'One digit', test: value => /\d/.test(value) },
    { id: 'special', text: 'One special character', test: value => /[^A-Za-z0-9]/.test(value) }
];

function isPasswordStrong(value) {
    return PASSWORD_RULES.every(rule => rule.test(value));
}

function validateRegistration(values) {
    const errors = {};
    if (values.account === '') {
        errors.account = 'Choose an account name.';
    } else if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(values.account)) {
        errors.account = 'Use 3-20 letters, digits or underscores, starting with a letter.';
    }
    const nameError = validateName(values.name);
    if (nameError !== '') errors.name = nameError;
    const phoneError = validatePhone(values.phone, true);
    if (phoneError !== '') errors.phone = phoneError;
    const emailError = validateEmail(values.email);
    if (emailError !== '') errors.email = emailError;

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

$(function () {
    const $form = $('#js-registration-form');
    if ($form.length === 0) return;

    const $box = $('#js-registration-confirmation');
    const $inputs = {
        account: $('#js-registration-account'),
        name: $('#js-registration-name'),
        phone: $('#js-registration-phone'),
        email: $('#js-registration-email')
    };

    const $helper = $form.find('.form-helper');
    $helper.text('Front-end demonstration: no account is created. A summary appears right below.');

    $inputs.password = $('<input>', { type: 'password', id: 'js-registration-password', name: 'password', autocomplete: 'new-password', required: true });
    $inputs.confirm = $('<input>', { type: 'password', id: 'js-registration-password-confirm', name: 'confirm', autocomplete: 'new-password', required: true });

    const $checklist = $('<ul>', { id: 'js-registration-checklist', class: 'form-helper', 'aria-live': 'polite' }).hide();
    $.each(PASSWORD_RULES, function () { $('<li>').appendTo($checklist); });

    const $toggle = $('<button>', { type: 'button', class: 'btn btn-outline btn-sm', text: 'Show password', 'aria-pressed': 'false' });

    function buildRow(labelText, $input) {
        return $('<div>', { class: 'form-row' }).append($('<label>').attr('for', $input.attr('id')).text(labelText), $input);
    }
    $helper.before(
        buildRow('Password', $inputs.password),
        $checklist,
        buildRow('Confirm password', $inputs.confirm),
        $('<div>', { class: 'form-row' }).append($toggle)
    );

    function updateChecklist(value) {
        $checklist.children().each(function (index) {
            const rule = PASSWORD_RULES[index];
            const met = rule.test(value);
            $(this).text(`${met ? '\u2714' : '\u2718'} ${rule.text}`).toggleClass('success-message', met).toggleClass('error-message', !met);
        });
    }

    function setPasswordVisibility(isVisible) {
        $inputs.password.add($inputs.confirm).attr('type', isVisible ? 'text' : 'password');
        $toggle.text(isVisible ? 'Hide password' : 'Show password').attr('aria-pressed', String(isVisible));
    }

    updateChecklist('');

    $form.on('input', 'input', function () {
        jqClearFieldError($(this));
        if ($(this).is($inputs.password)) updateChecklist($(this).val());
    });

    $inputs.password.on('focus', function () { $checklist.slideDown(250); });
    $toggle.on('click', function () { setPasswordVisibility($inputs.password.attr('type') === 'password'); });

    $('#js-registration-reset-btn').on('click', function () {
        jqHideBox($box);
        $checklist.slideUp(200);
    });

    $form.on('reset', function () {
        jqClearErrors($form);
        updateChecklist('');
        setPasswordVisibility(false);
    });

    $form.on('submit', function (event) {
        event.preventDefault();
        const values = {
            account: $inputs.account.val().trim(),
            name: $inputs.name.val().trim(),
            phone: $inputs.phone.val().trim(),
            email: $inputs.email.val().trim(),
            password: $inputs.password.val(),
            confirm: $inputs.confirm.val()
        };

        jqClearErrors($form);
        const errors = validateRegistration(values);
        const keys = Object.keys(errors);

        if (keys.length > 0) {
            $.each(keys, function (index, key) { jqFieldError($inputs[key], errors[key]); });
            $checklist.slideDown(250);
            jqShowBox($box, 'error', `please fix ${keys.length} marked field(s).`, [], '');
            jqFocusFirstInvalid($form);
            return;
        }

        jqShowBox($box, 'success', `registration form checked for ${values.name}.`, [
            ['Account name', values.account],
            ['Name', values.name],
            ['Telephone', values.phone],
            ['Email', values.email],
            ['Demo reference', generateReference()]
        ], `No account was created and you are not signed in. ${DEMO_NOTE}`);

        $form.get(0).reset();
        $checklist.slideUp(200);
    });
});