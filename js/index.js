'use strict';

/* ==========================================================
   index.js (jQuery) - index.html: three blocks under the photos
   (Contacts | Hours & Location with a map | Membership plans)
   and a live "Open now / Closed now" status.

   jQuery 3.7.1 is linked in index.html before this file. Our code cannot call
   a library that has not loaded yet, so the order of the <script> tags matters:
   jQuery -> main.js -> jquery-common.js -> index.js.

   The page HTML was not rewritten: jQuery moves the two existing sections, switches
   their grid classes (col-xl-3 / col-xl-5 already exist in the Bootstrap grid) and
   builds the new block from the OPENING_HOURS array in main.js, so the hours are
   written in one place only.
   ========================================================== */

const CLUB_ADDRESS = 'улица Санжара Асфендиярова, 6, Астана';

const CLUB_LAT_LNG = encodeURIComponent('Experience Fitness, ул. Санжара Асфендиярова 6, Астана');
const MAP_EMBED_URL = `https://maps.google.com/maps?q=${CLUB_LAT_LNG}&z=17&hl=en&output=embed`;
const MAP_LINK_URL = `https://www.google.com/maps/search/?api=1&query=${CLUB_LAT_LNG}`;git add .

// ---------- Pure helpers (no page access) ----------
function formatHour(hour) {
    return `${String(hour).padStart(2, '0')}:00`;
}

// The club is in Astana, so the status must use Astana time wherever the visitor is.
// (Kazakhstan has one time zone, UTC+5, and "Asia/Almaty" has the same offset.)
function getClubNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Almaty' }));
}

// Joins neighbouring days with the same hours: Monday..Friday -> "Mon-Fri 07:00-23:00".
function groupHours(hoursList) {
    const groups = hoursList.reduce(function (result, entry) {
        const text = entry.isOpen ? `${formatHour(entry.open)}\u2013${formatHour(entry.close)}` : 'Closed';
        const last = result[result.length - 1];
        if (last !== undefined && last.text === text) {
            last.days.push(entry.day);
        } else {
            result.push({ days: [entry.day], text: text });
        }
        return result;
    }, []);

    return groups.map(group => ({
        label: group.days.length > 1 ? `${group.days[0].slice(0, 3)}\u2013${group.days[group.days.length - 1].slice(0, 3)}` : group.days[0],
        text: group.text
    }));
}

// Says if the club is open at the moment "now" and when it opens next.
function getClubStatus(now) {
    const today = OPENING_HOURS.find(entry => entry.day === getWeekdayName(now));
    const minutes = now.getHours() * 60 + now.getMinutes();

    if (today.isOpen && minutes >= today.open * 60 && minutes < today.close * 60) {
        return { isOpen: true, text: `Open now until ${formatHour(today.close)}` };
    }
    if (today.isOpen && minutes < today.open * 60) {
        return { isOpen: false, text: `Closed now. Opens today at ${formatHour(today.open)}` };
    }
    for (let step = 1; step <= 7; step++) {
        const next = OPENING_HOURS.find(entry => entry.day === DAY_NAMES[(now.getDay() + step) % 7]);
        if (next.isOpen) {
            return { isOpen: false, text: `Closed now. Opens ${step === 1 ? 'tomorrow' : next.day} at ${formatHour(next.open)}` };
        }
    }
    return { isOpen: false, text: 'Closed now' };
}

// $(function () { ... }) = $(document).ready(): runs once the HTML is parsed, so $('.pricing') finds the section.
$(function () {
    const $pricing = $('.pricing'); // selector by class
    if ($pricing.length === 0) {
        return;
    }

    // --- 1. the new block, built with jQuery (its markup exists nowhere in the HTML file) ---
    const $status = $('<p>', { id: 'js-index-status', 'aria-live': 'polite' }).append($('<strong>'));

    const $hours = $('<div>', { class: 'hours-grid' });
    $.each(groupHours(OPENING_HOURS), function (index, group) {
        $hours.append($('<span>').text(group.label), $('<span>').text(group.text));
    });

    // html() is the right tool here: the line mixes a <strong> label with plain text. It is safe because the
    // string is built only from our own constant (CLUB_ADDRESS), never from what a visitor typed;
    // anything a visitor types is always put on the page with text().
    const $address = $('<p>', { class: 'form-helper' }).html(`<strong>Address:</strong> ${CLUB_ADDRESS}`);

    // The map is a standard Google Maps embed: it shows the club at once, and the visitor can zoom with
    // the + / - buttons, drag it, or open the full map. It sits inside .gallery-card (rounded, no overflow).
    const $map = $('<iframe>', {
        src: MAP_EMBED_URL,
        title: 'Map: Experience Fitness, Sanzhar Asfendiyarov St. 6, Astana',
        width: '100%',
        height: '280',
        loading: 'lazy',
        referrerpolicy: 'no-referrer-when-downgrade',
        frameborder: '0',
        allowfullscreen: true
    });

    const $mapBlock = $('<section>', { class: 'col-12 col-md-6 col-xl-4 contacts' }).append(
        $('<h2>').text('Hours & Location'),
        $status,
        $hours,
        $address,
        $('<div>', { class: 'gallery-card' }).append($map),
        $('<a>', { class: 'btn btn-sm mt-3', href: MAP_LINK_URL, target: '_blank', rel: 'noopener noreferrer', text: 'Open in Google Maps' })
    );

    // --- 2. three blocks in one row ---
    const $contacts = $pricing.siblings('.contacts'); // traversal: from Membership plans to its neighbour, the Contacts section

    // Chain, link by link:
    // removeClass('col-lg-8') - drops the old wide column (8 of 12 parts);
    // addClass('col-xl-5')    - on wide screens plans take 5 of 12 parts (on smaller ones the block stays full width);
    // (Contacts and the map get 3 and 4 parts: 3 + 4 + 5 = 12, one row.)
    $pricing.removeClass('col-lg-8').addClass('col-xl-5');
    $contacts.removeClass('col-lg-4').addClass('col-md-6 col-xl-3').insertBefore($pricing); // Contacts moves to the left
    $mapBlock.insertAfter($contacts); // and the new block goes in the middle

    // --- 3. live status: the block text and the "Open now" badge on the first photo ---
    function updateStatus() {
        const status = getClubStatus(getClubNow());
        $status.children('strong').text(status.text);
        $('.gym-gallery .badge').text(status.isOpen ? 'Open now' : 'Closed now'); // the badge used to say "Open now" all the time
    }
    updateStatus();
    setInterval(updateStatus, 60 * 1000); // the page may stay open past closing time
});