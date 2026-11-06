(() => {
  'use strict';
  const header = document.getElementById('header');
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');

  // Header shadow once the page scrolls
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Footer year
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Gallery filter
  const chips = document.querySelectorAll('.chip');
  if (chips.length) {
    const items = document.querySelectorAll('.g-item');
    const empty = document.getElementById('galleryEmpty');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      let shown = 0;
      items.forEach((item) => {
        const match = f === 'all' || item.dataset.category.split(' ').includes(f);
        item.hidden = !match;
        if (match) shown++;
      });
      empty.hidden = shown > 0;
    }));
  }

  // Contact form
  const form = document.getElementById('contactForm');
  if (form) {
    const status = document.getElementById('formStatus');
    const msg = form.elements.message;

    // Pre-fill the message when arriving from a "Book Now" button (?service=nails)
    const service = new URLSearchParams(location.search).get('service');
    const names = { hair: 'Hair Styling', makeup: 'Makeup Services', braiding: 'Hair Braiding', skin: 'Skin Care', nails: 'Nail Care', bridal: 'Bridal Packages' };
    if (service && names[service] && !msg.value) msg.value = `Hi, I’d like to book ${names[service]}. `;

    const check = (el) => {
      let error = '';
      const v = el.value.trim();
      if (!v) error = 'This field is required.';
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) error = 'Enter a valid email address.';
      else if (el.type === 'tel' && v.replace(/\D/g, '').length < 7) error = 'Enter a valid phone number.';
      el.closest('.field').classList.toggle('invalid', !!error);
      el.nextElementSibling.textContent = error;
      return !error;
    };
    const fields = [...form.querySelectorAll('input, textarea')];
    fields.forEach((el) => el.addEventListener('blur', () => check(el)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form-status';
      status.textContent = '';
      const valid = fields.map(check).every(Boolean);
      if (!valid) { fields.find((el) => el.closest('.field').classList.contains('invalid')).focus(); return; }

      const data = Object.fromEntries(new FormData(form));
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        try {
          const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error();
          form.reset();
          status.textContent = 'Thank you! Your message has been sent. We’ll reply shortly.';
          status.classList.add('ok');
        } catch {
          status.textContent = 'Something went wrong. Please try again or call us.';
          status.classList.add('fail');
        }
      } else {
        // No server set up: open the visitor's email app with the message filled in
        const body = `Name: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\n\n${data.message}`;
        location.href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Message from ' + data.name)}&body=${encodeURIComponent(body)}`;
        status.textContent = 'Opening your email app…';
        status.classList.add('ok');
      }
    });
  }
})();
