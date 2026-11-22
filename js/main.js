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
  const navOverlay = document.getElementById('navOverlay');
  const navLinks   = document.querySelectorAll('.navbar__link');
  let lastScrollY  = window.scrollY;
  let menuOpen     = false;

  function closeMenu() {
    menuOpen = false;
    navOverlay.classList.remove('nav--open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openMenu() {
    menuOpen = true;
    navOverlay.classList.add('nav--open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // bloquear scroll de fondo
  }

  // Ocultar/mostrar navbar al hacer scroll (solo si el menú está cerrado)
  window.addEventListener('scroll', () => {
    if (menuOpen) return;
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
    menuOpen ? closeMenu() : openMenu();
  });

  // Cerrar menú al hacer click en un link
  navLinks.forEach(link => {
    link.addEventListener('click', () => closeMenu());
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMenu();
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
  // El color de cada sabor se expone como --accent; el CSS lo usa en :hover y :focus-visible
  productCards.forEach(card => {
    if (card.dataset.color) card.style.setProperty('--accent', card.dataset.color);
  });

  /* ── FORMULARIO → WHATSAPP ───────────────────── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const campos = [
      { el: document.getElementById('nombre'),  error: document.getElementById('nombre-error'),  msg: 'Contanos cómo te llamás.' },
      { el: document.getElementById('mensaje'), error: document.getElementById('mensaje-error'), msg: 'Escribí tu mensaje para poder enviarlo.' }
    ];

    function setError(campo, mostrar) {
      campo.error.textContent = mostrar ? campo.msg : '';
      campo.error.hidden = !mostrar;
      campo.el.setAttribute('aria-invalid', mostrar ? 'true' : 'false');
    }

    // Limpiar el error apenas la persona empieza a corregir
    campos.forEach(campo => {
      campo.el.addEventListener('input', () => {
        if (campo.el.value.trim()) setError(campo, false);
      });
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let primerInvalido = null;
      campos.forEach(campo => {
        const vacio = !campo.el.value.trim();
        setError(campo, vacio);
        if (vacio && !primerInvalido) primerInvalido = campo.el;
      });
      if (primerInvalido) { primerInvalido.focus(); return; }

      const nombre  = campos[0].el.value.trim();
      const mensaje = campos[1].el.value.trim();

      const texto = `Hola Soda Vanguardia! Soy ${nombre}. ${mensaje}`;

      const url = `https://wa.me/5493546519699?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

});
