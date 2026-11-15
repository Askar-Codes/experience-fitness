'use strict';

/* ==========================================================
   jquery-common.js - jQuery helpers for index.html,
   registration.html and subscribe.html.

   jQuery version: 3.7.1 (the latest 3.x release), linked from the CDN
   in each page BEFORE this file. Our code cannot call a library that
   has not loaded yet, so the order of the <script> tags matters:
   jQuery -> main.js -> jquery-common.js -> the page file.

   The functions below only DEFINE helpers. The code that runs on the
   page lives inside $(function () { ... }) in each page file: that is the
   short form of $(document).ready() and it waits until the HTML is
   parsed, so $('#id') can find the elements.
   ========================================================== */

function jqClearFieldError($input) {
    $(`#${$input.attr('id')}-error`).remove();
    $input.removeClass('error').removeAttr('aria-invalid aria-describedby');
}

function jqFieldError($input, message) {
    jqClearFieldError($input);
    const errorId = `${$input.attr('id')}-error`;
    $('<div>', { id: errorId, class: 'error-message', text: `Error: ${message}` }).insertAfter($input);
    $input.addClass('error').attr({ 'aria-invalid': 'true', 'aria-describedby': errorId });
}

function jqClearErrors($form) {
    $form.find('.error-message[id$="-error"]').remove();
    $form.find('.error').removeClass('error').removeAttr('aria-invalid aria-describedby');
}

function jqFocusFirstInvalid($form) {
    $form.find('[aria-invalid="true"]:not(:disabled)').first().trigger('focus');
}

function jqShowBox($box, type, title, rows, note) {
    $box.stop(true, true).empty().toggleClass('error', type === 'error');
    $('<strong>').text(`${type === 'error' ? 'Error' : 'Success'}: ${title}`).appendTo($box);

    if (rows.length > 0) {
        const $list = $('<dl>', { class: 'summary-list' }).appendTo($box);
        $.each(rows, function (index, row) {
            $list.append($('<dt>').text(row[0]), $('<dd>').text(row[1]));
        });
    }
    if (note) {
        $('<p>', { class: 'form-helper', text: note }).appendTo($box);
    }

    $box.removeClass('hidden').hide().fadeIn(300).attr('tabindex', '-1').trigger('focus');
}

function jqHideBox($box) {
    if ($box.hasClass('hidden')) {
        return;
    }
    $box.stop(true, true).fadeOut(200, function () {
        $(this).addClass('hidden').removeClass('error').removeAttr('style').empty();
    });
}
