// careisgold-script.js — Shared JS for Babilonia V2
(function() {
  'use strict';

  // ---- Mobile Menu ----
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = expanded ? '' : 'hidden';
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Navbar Scroll Hide/Show ----
  let lastScroll = 0;
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;
      // Add/remove .scrolled for background
      if (currentScroll > 80) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      // Hide/show on scroll direction
      if (currentScroll > lastScroll && currentScroll > 200) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
      lastScroll = currentScroll;
    });
  }

  // ---- IntersectionObserver Fade Animations ----
  const ioObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        ioObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.io-fade-up, .io-fade-zoom').forEach(function(el) {
    ioObserver.observe(el);
  });

  // ---- Smooth Scroll for Anchor Links ----
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = navbar ? navbar.offsetHeight + 20 : 80;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    });
  });

  // ---- Fixing Gold Widget Toggle ----
  const widgetHeader = document.querySelector('.gold-widget .widget-header');
  const widget = document.querySelector('.gold-widget');
  if (widgetHeader && widget) {
    widgetHeader.addEventListener('click', function() {
      widget.classList.toggle('open');
    });
  }

  // ---- Fetch Gold Fixing (simulated, replace with real API if available) ----
  function fetchFixing() {
    const valueEl = document.getElementById('fixing-value');
    const changeEl = document.getElementById('fixing-change');
    if (!valueEl || !changeEl) return;

    // Placeholder: replace with real API endpoint
    // fetch('https://api.example.com/gold-fixing').then(r=>r.json()).then(data=>{...})
    const mockValue = 2450.30 + (Math.random() - 0.5) * 20;
    const mockChange = (Math.random() - 0.5) * 30;
    const changePct = (mockChange / mockValue * 100).toFixed(2);

    valueEl.textContent = '€ ' + mockValue.toFixed(2);
    changeEl.textContent = (mockChange >= 0 ? '+' : '') + mockChange.toFixed(2) + ' (' + changePct + '%)';
    changeEl.className = 'fixing-change ' + (mockChange >= 0 ? 'up' : 'down');
  }
  fetchFixing();

  // ---- Accessibility: trap focus in mobile menu ----
  if (mobileMenu) {
    mobileMenu.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;
      const focusables = mobileMenu.querySelectorAll('a[href], button');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

})();
