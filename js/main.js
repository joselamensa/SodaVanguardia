/* ═══════════════════════════════════════════════
   SODA VANGUARDIA — main.js
   - Navbar: hide on scroll down, active links
   - Hamburger menu mobile
   - Scroll indicator
   - IntersectionObserver: reveal + stagger
   - Product cards: color accent on hover
   - Contact form: WhatsApp redirect
══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── NAVBAR ──────────────────────────────────── */
  const navbar     = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
  const navMenu    = document.getElementById('navMenu');
  const navLinks   = document.querySelectorAll('.navbar__link');
  let lastScrollY  = window.scrollY;

  // Ocultar/mostrar navbar al hacer scroll
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 80) {
      navbar.classList.add('navbar--hidden');
    } else {
      navbar.classList.remove('navbar--hidden');
    }
    lastScrollY = currentY;
  }, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('nav--open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Cerrar menú al hacer click en un link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('nav--open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ── ACTIVE NAV LINK por sección ─────────────── */
  const sections = document.querySelectorAll('section[id]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.dataset.section === entry.target.id
          );
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(sec => sectionObserver.observe(sec));

  /* ── SCROLL INDICATOR ────────────────────────── */
  const scrollIndicator = document.getElementById('scrollIndicator');
  if (scrollIndicator) {
    window.addEventListener('scroll', () => {
      scrollIndicator.classList.toggle('hidden', window.scrollY > 80);
    }, { passive: true });
  }

  /* ── REVEAL ON SCROLL ────────────────────────── */
  const revealEls = document.querySelectorAll('.reveal');
  const staggerEls = document.querySelectorAll('.stagger');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => revealObserver.observe(el));
  staggerEls.forEach(el => revealObserver.observe(el));

  /* ── PRODUCT CARDS: color accent ─────────────── */
  const productCards = document.querySelectorAll('.product-card');
  productCards.forEach(card => {
    const color = card.dataset.color;
    if (!color) return;
    card.addEventListener('mouseenter', () => {
      card.style.borderBottomColor = color;
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderBottomColor = 'transparent';
    });
    // Touch: mostrar desc siempre en mobile
    card.addEventListener('touchstart', () => {
      const desc = card.querySelector('.product-card__desc');
      if (desc) { desc.style.opacity = '1'; desc.style.transform = 'translateY(0)'; }
    }, { passive: true });
  });

  /* ── FORMULARIO → WHATSAPP ───────────────────── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nombre  = document.getElementById('nombre').value.trim();
      const mensaje = document.getElementById('mensaje').value.trim();

      if (!nombre || !mensaje) return;

      const texto = `Hola Soda Vanguardia! Soy ${nombre}. ${mensaje}`;

      const url = `https://wa.me/5493546519699?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

});
