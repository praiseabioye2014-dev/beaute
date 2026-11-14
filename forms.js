(() => {
  'use strict';
  const S = window.SITE || {};
  const R = window.REVIEWS || [];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const services = { hair: 'Hair Styling', makeup: 'Makeup Services', braiding: 'Hair Braiding', skin: 'Skin Care', nails: 'Nail Care', bridal: 'Bridal Packages' };

  // ---------- Testimonials: Google Sheet (approved rows) + fallback list in js/config.js ----------
  const parseCSV = (t) => {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  };
  const loadSheet = async (url) => {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('sheet');
    const [head, ...body] = parseCSV(await res.text());
    const col = (re) => head.findIndex((h) => re.test(h));
    const n = col(/name/i), s = col(/rating|stars/i), t = col(/review|message|comment/i), a = col(/approved/i);
    if (n < 0 || t < 0 || a < 0) { console.warn('Reviews sheet: could not find Name / Review / Approved headings. Found:', head); return []; }
    return body
      .filter((r) => /^(yes|y|true|approved)$/i.test((r[a] || '').trim()) && (r[n] || '').trim() && (r[t] || '').trim())
      .map((r) => ({ name: r[n].trim(), text: r[t].trim(), stars: Math.min(5, Math.max(1, parseInt(r[s], 10) || 5)) }))
      .reverse(); // newest first
  };
  const list = document.getElementById('reviewList');
  const renderReviews = (items) => {
    list.innerHTML = items.slice(0, 6).map((r) => `
      <figure class="review"><div class="who"><span class="avatar" aria-hidden="true">${esc(r.name.trim()[0].toUpperCase())}</span>
      <div><blockquote>${esc(r.text)}</blockquote><figcaption>– ${esc(r.name)}</figcaption></div></div>
      <div class="stars" role="img" aria-label="${r.stars} out of 5 stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div></figure>`).join('');
  };
  if (list) {
    if (R.length) renderReviews(R);
    if (S.reviewsCsv) {
      const refresh = () => loadSheet(S.reviewsCsv)
        .then((rows) => { const items = rows.length ? [...rows, ...R] : R; if (items.length) renderReviews(items); })
        .catch((err) => console.warn('Reviews sheet:', err));
      refresh();
      setInterval(refresh, 60000); // check for newly approved reviews every minute
    }
  }

  // ---------- Dialog helpers ----------
  const makeModal = (title, fields, actions) => {
    const d = document.createElement('dialog');
    d.className = 'modal';
    d.innerHTML = `<form class="modal-form" novalidate>
      <button type="button" class="modal-x" aria-label="Close">×</button>
      <h2>${title}</h2>${fields}
      <div class="modal-actions">${actions}</div><p class="form-status" role="status"></p></form>`;
    document.body.append(d);
    d.querySelector('.modal-x').addEventListener('click', () => d.close());
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    return d;
  };
  const openModal = (d) => { d.querySelector('.form-status').textContent = ''; d.showModal(); };
  const valid = (form) => {
    let ok = true;
    form.querySelectorAll('[required]').forEach((el) => {
      const bad = !el.value.trim();
      el.closest('.field').classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    return ok;
  };
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const deliver = (how, subject, text, status) => {
    const q = (s) => encodeURIComponent(s);
    let url;
    if (how === 'mail') {
      url = isMobile
        ? `mailto:${S.email}?subject=${q(subject)}&body=${q(text)}`
        : `https://mail.google.com/mail/?view=cm&fs=1&to=${q(S.email)}&su=${q(subject)}&body=${q(text)}`;
    } else {
      url = `https://wa.me/${S.whatsapp}?text=${q(text)}`;
    }
    if (how === 'mail' && isMobile) location.href = url; else window.open(url, '_blank', 'noopener');
    status.innerHTML = `Opening ${how === 'mail' ? 'your email' : 'WhatsApp'}… press send to confirm. If nothing opened, <a href="${esc(url)}" target="_blank" rel="noopener">tap here</a>.`;
    status.className = 'form-status ok';
  };
  const buttons = (a, b) => `<button type="submit" value="wa" class="btn btn-gold">${a}</button><button type="submit" value="mail" class="btn btn-outline">${b}</button>`;
  const field = (id, label, control) => `<div class="field"><label for="${id}">${label}</label>${control}</div>`;

  // ---------- Booking (live date & time slots based on the real clock and opening hours) ----------
  const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hours = S.hours || { 0: [10, 18], other: [8, 20] };
  const dayHours = (ds) => hours[new Date(ds + 'T00:00').getDay()] || hours.other;
  const fmt = (m) => { const h = Math.floor(m / 60), mi = m % 60; return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const options = Object.values(services).map((v) => `<option>${v}</option>`).join('');
  const book = makeModal('Book an Appointment',
    field('b-name', 'Full Name <span class="req">*</span>', '<input id="b-name" name="name" autocomplete="name" required>') +
    field('b-phone', 'Phone Number <span class="req">*</span>', '<input id="b-phone" name="phone" type="tel" autocomplete="tel" required>') +
    field('b-service', 'Service <span class="req">*</span>', `<select id="b-service" name="service" required><option value="">Choose a service</option>${options}</select>`) +
    `<div class="field-row">${field('b-date', 'Preferred Date <span class="req">*</span>', '<input id="b-date" name="date" type="date" required>')}${field('b-time', 'Preferred Time <span class="req">*</span>', '<select id="b-time" name="time" required><option value="">Choose a date first</option></select>')}</div><p class="hint" id="b-hint"></p>` +
    field('b-notes', 'Notes (optional)', '<textarea id="b-notes" name="notes" rows="2"></textarea>'),
    buttons('Book on WhatsApp', 'Send by email'));
  const bookForm = book.querySelector('form');
  const dateEl = book.querySelector('#b-date'), timeEl = book.querySelector('#b-time'), hint = book.querySelector('#b-hint');
  const refreshSlots = () => {
    const today = localToday();
    dateEl.min = today;
    if (dateEl.value && dateEl.value < today) dateEl.value = '';
    if (!dateEl.value) { timeEl.innerHTML = '<option value="">Choose a date first</option>'; hint.textContent = ''; return; }
    const [open, close] = dayHours(dateEl.value);
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    const slots = [];
    for (let m = open * 60; m <= (close - 1) * 60; m += 30) if (dateEl.value !== today || m >= nowMin + 30) slots.push(m);
    const keep = timeEl.value;
    timeEl.innerHTML = slots.length ? '<option value="">Choose a time</option>' + slots.map((m) => `<option>${fmt(m)}</option>`).join('') : '<option value="">No slots left today</option>';
    if (keep && slots.some((m) => fmt(m) === keep)) timeEl.value = keep;
    hint.textContent = `Open ${fmt(open * 60)} – ${fmt(close * 60)} on that day` + (slots.length ? '' : '. Please pick another date.');
  };
  dateEl.addEventListener('change', refreshSlots);
  setInterval(() => { if (book.open) refreshSlots(); }, 30000); // keeps slots in step with the clock
  bookForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = book.querySelector('.form-status');
    if (!valid(bookForm)) { status.textContent = 'Please fill in the highlighted fields.'; status.className = 'form-status fail'; return; }
    const d = Object.fromEntries(new FormData(bookForm));
    const when = new Date(d.date + 'T00:00').toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const text = `Hello Fleur de Beauté, I’d like to book an appointment.\n\nName: ${d.name}\nPhone: ${d.phone}\nService: ${d.service}\nDate: ${when}\nTime: ${d.time}` + (d.notes.trim() ? `\nNotes: ${d.notes}` : '');
    deliver(e.submitter ? e.submitter.value : 'wa', `Booking request: ${d.service}`, text, status);
  });

  // ---------- Write a review (Google Form if set up, otherwise WhatsApp / email) ----------
  const parseFormLink = (link) => {
    try {
      const u = new URL(link), e = {}, keys = [];
      u.searchParams.forEach((v, k) => {
        if (!k.startsWith('entry.')) return;
        keys.push(k);
        if (/^name$/i.test(v)) e.name = k; else if (/^rating$/i.test(v)) e.stars = k; else if (/^review$/i.test(v)) e.text = k;
      });
      // If real answers were typed instead of NAME / RATING / REVIEW, use the question order (Name, Rating, Review)
      if (!(e.name && e.stars && e.text) && keys.length >= 3) [e.name, e.stars, e.text] = keys;
      return e.name && e.stars && e.text ? { action: u.origin + u.pathname.replace(/\/viewform$/, '/formResponse'), ...e } : null;
    } catch { return null; }
  };
  const gform = S.reviewFormLink ? parseFormLink(S.reviewFormLink) : null;
  const review = makeModal('Share Your Experience',
    field('r-name', 'Your Name <span class="req">*</span>', '<input id="r-name" name="name" autocomplete="name" required>') +
    field('r-stars', 'Rating', '<select id="r-stars" name="stars"><option value="5">★★★★★ – Excellent</option><option value="4">★★★★ – Very good</option><option value="3">★★★ – Good</option><option value="2">★★ – Fair</option><option value="1">★ – Poor</option></select>') +
    field('r-text', 'Your Review <span class="req">*</span>', '<textarea id="r-text" name="text" rows="4" required></textarea>'),
    gform ? '<button type="submit" value="form" class="btn btn-gold">Submit Review</button>' : buttons('Send on WhatsApp', 'Send by email'));
  const reviewForm = review.querySelector('form');
  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid(reviewForm)) return;
    const d = Object.fromEntries(new FormData(reviewForm));
    const status = review.querySelector('.form-status');
    if (gform) {
      const btn = reviewForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await fetch(gform.action, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ [gform.name]: d.name, [gform.stars]: d.stars, [gform.text]: d.text }) });
        reviewForm.reset();
        status.textContent = 'Thank you! Your review will appear on the site once it has been approved.';
        status.className = 'form-status ok';
      } catch {
        status.textContent = 'Something went wrong. Please check your connection and try again.';
        status.className = 'form-status fail';
      }
      btn.disabled = false;
      return;
    }
    const text = `New review for approval\n\nName: ${d.name}\nRating: ${d.stars}/5\nReview: ${d.text}`;
    deliver(e.submitter ? e.submitter.value : 'wa', 'New review for approval', text, status);
  });

  // ---------- Triggers ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.btn[href^="contact.html"]');
    if (a && /^book/i.test(a.textContent.trim())) {
      e.preventDefault();
      book.querySelector('#b-service').value = services[new URL(a.href).searchParams.get('service')] || '';
      refreshSlots();
      openModal(book);
    } else if (e.target.closest('[data-review]')) {
      openModal(review);
    }
  });
})();
