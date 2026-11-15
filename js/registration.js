'use strict';

/* ==========================================================
   registration.js (jQuery) - registration.html: front-end validation only.
   jQuery 3.7.1 is linked in registration.html before this file. Our code cannot call
   a library that has not loaded yet, so the order of the <script> tags matters:
   jQuery -> main.js -> jquery-common.js -> registration.js.

   No account is created and nobody is signed in. Passwords are never stored,
   shown, put in a URL or printed.

   REWRITTEN FEATURE - form validation.
   Replaced: getElementById + createElement/append + classList + addEventListener
   -> $('#id') + $('<input>', {...}) + .before() + .toggleClass() + .on().
   The checks themselves (validateRegistration) are plain functions that never touch
   the page, so they did not change. The page code got shorter and the chains are
   clearer; the old version is kept in old-js-version.js.
   ========================================================== */

const PASSWORD_RULES = [
    { id: 'length', text: 'At least 8 characters', test: value => /^.{8,}$/.test(value) },
    { id: 'upper', text: 'One uppercase letter', test: value => /[A-Z]/.test(value) },
    { id: 'lower', text: 'One lowercase letter', test: value => /[a-z]/.test(value) },
    { id: 'digit', text: 'One digit', test: value => /\d/.test(value) },
    { id: 'special', text: 'One special character', test: value => /[^A-Za-z0-9]/.test(value) }
];

// Eye icons (inline SVG, drawn in the style of the free Feather icon set; they use the text colour of the
// button). They are our own constants, never visitor input, so html() is safe for them.
const EYE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function isPasswordStrong(value) {
    return PASSWORD_RULES.every(rule => rule.test(value));
}

// Returns an object like { account: 'message' }; an empty object means the form is valid.
function validateRegistration(values) {
    const errors = {};

    if (values.account === '') {
        errors.account = 'Choose an account name.';
    } else if (!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(values.account)) {
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

// $(function () { ... }) = $(document).ready(): runs once the HTML is parsed.
$(function () {
    const $form = $('#js-registration-form'); // selector by id
    if ($form.length === 0) {
        return;
    }
    const $box = $('#js-registration-confirmation');
    const $inputs = {
        account: $('#js-registration-account'),
        name: $('#js-registration-name'),
        phone: $('#js-registration-phone'),
        email: $('#js-registration-email')
    };

    // The helper text promised an account; it is replaced by an honest one.
    const $helper = $form.find('.form-helper'); // selector by class, found inside the form
    $helper.text('Front-end demonstration: no account is created. A summary appears right below.');

    // --- phone lock: the prefix cannot be deleted, only digits are accepted, 11 digits at most ---
    // The locked prefix (+777, set in main.js) appears when the visitor enters the field;
    // maxlength is the second lock and inputmode shows the number keypad on phones.
    $inputs.phone.attr({ inputmode: 'tel', maxlength: 16 }).on('focus', function () {
        if ($(this).val() === '') {
            $(this).val(formatPhone(PHONE_PREFIX));
        }
    });
    $inputs.phone.on('input', function () {
        $(this).val(formatPhone($(this).val()));
    });
    $inputs.phone.on('blur', function () {
        if (keepDigits($(this).val(), 20).length <= PHONE_PREFIX.length) {
            $(this).val(''); // only the prefix is left: the field counts as empty again
        }
    });

    // --- password fields, checklist and Show/Hide button (built with jQuery) ---
    $inputs.password = $('<input>', { type: 'password', id: 'js-registration-password', name: 'password', autocomplete: 'new-password', required: true });
    $inputs.confirm = $('<input>', { type: 'password', id: 'js-registration-password-confirm', name: 'confirm', autocomplete: 'new-password', required: true });

    const $checklist = $('<ul>', { id: 'js-registration-checklist', class: 'form-helper', 'aria-live': 'polite' }).hide();
    $.each(PASSWORD_RULES, function () {
        $('<li>').appendTo($checklist);
    });

    // attr() is right for "type" and aria-*: they are HTML attributes we want to change in the markup.
    // html() swaps the icon; the icon strings are our own constants, never visitor input.
    function setEye($input, $eye, isVisible) {
        const text = isVisible ? 'Hide password' : 'Show password';
        $input.attr('type', isVisible ? 'text' : 'password');
        $eye.html(isVisible ? EYE_OFF_ICON : EYE_ICON).attr({ 'aria-pressed': String(isVisible), 'aria-label': text, title: text });
    }

    // One row per password field: label, then the field with its eye button on the right
    // (d-flex / align-items-center / gap-2 are Bootstrap utilities that already exist in the grid CSS).
    const eyes = [];
    function buildRow(labelText, $input) {
        const $eye = $('<button>', { type: 'button', class: 'btn btn-outline' });
        setEye($input, $eye, false);
        // Clicking the eye of a field shows or hides the text of that field only.
        $eye.on('click', function () {
            setEye($input, $(this), $input.attr('type') === 'password');
        });
        eyes.push({ $input: $input, $eye: $eye });

        const $line = $('<div>', { class: 'd-flex align-items-center gap-2' }).append($input, $eye);
        $input.data('errorHost', $line); // error messages go under the whole line, not between the field and the eye
        return $('<div>', { class: 'form-row' }).append($('<label>').attr('for', $input.attr('id')).text(labelText), $line);
    }
    $helper.before(
        buildRow('Password', $inputs.password),
        $checklist,
        buildRow('Confirm password', $inputs.confirm)
    );

    // Chain: each() visits every <li>; $(this) is the current item; then three methods in a row:
    // text() writes the line, toggleClass('success-message', met) turns the "done" look on or off,
    // toggleClass('error-message', !met) does the opposite for the "not done yet" look.
    function updateChecklist(value) {
        $checklist.children().each(function (index) {
            const rule = PASSWORD_RULES[index];
            const met = rule.test(value);
            $(this).text(`${met ? '\u2714' : '\u2718'} ${rule.text}`).toggleClass('success-message', met).toggleClass('error-message', !met);
        });
    }

    function hideAllPasswords() {
        $.each(eyes, function (index, pair) {
            setEye(pair.$input, pair.$eye, false);
        });
    }

    updateChecklist('');

    // --- events ---
    // Delegated: one listener on the form catches "input" from every field, including the two we created above.
    $form.on('input', 'input', function () {
        jqClearFieldError($(this));
        if ($(this).is($inputs.password)) {
            updateChecklist($(this).val());
        }
    });

    // The checklist slides open when the visitor reaches the password field.
    $inputs.password.on('focus', function () {
        $checklist.slideDown(250);
    });

    // The Clear button also fades the message out; the form's own reset event does the cleaning.
    $('#js-registration-reset-btn').on('click', function () {
        jqHideBox($box);
        $checklist.slideUp(200);
    });
    $form.on('reset', function () {
        jqClearErrors($form);
        updateChecklist('');
        hideAllPasswords();
    });

    // The "required" attributes stay in the HTML: the browser checks them first.
    // A check in the browser never replaces a check on the server: a visitor can switch
    // JavaScript off or send the request by hand, so a real server must repeat every check.
    $form.on('submit', function (event) {
        // preventDefault stops the browser from sending the form and reloading the page;
        // without it the summary or the error messages would vanish at once.
        event.preventDefault();

        // Values are trimmed before they are checked (passwords are not trimmed: spaces may be part of them).
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
            $.each(keys, function (index, key) {
                jqFieldError($inputs[key], errors[key]);
            });
            $checklist.slideDown(250);
            jqShowBox($box, 'error', `please fix ${keys.length} marked field(s).`, [], '');
            jqFocusFirstInvalid($form);
            return;
        }

        // Success: show the summary (without the password), then reset the form.
        jqShowBox($box, 'success', `registration form checked for ${values.name}.`, [
            ['Account name', values.account],
            ['Name', values.name],
            ['Telephone', values.phone],
            ['Email', values.email],
            ['Demo reference', generateReference()]
        ], `No account was created and you are not signed in. ${DEMO_NOTE}`);

        // jQuery has no reset() method, so the native one is called on the element ($form.get(0)).
        // The reset handler above wipes both password fields and the checklist.
        $form.get(0).reset();
        $checklist.slideUp(200);
    });
});