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

  // ---- Fetch Gold Fixing (CoinGecko PAXG ≈ oro spot) ----
  async function fetchFixing() {
    const valueEl = document.getElementById('fixing-value');
    const changeEl = document.getElementById('fixing-change');
    if (!valueEl || !changeEl) return;

    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=eur,usd&include_24hr_change=true', {
        method: 'GET',
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const gold = data['pax-gold'];
      if (!gold) throw new Error('No data');

      // Prezzo oro per oncia in EUR (PAXG = 1 oz troy)
      const eurPerOz = gold.eur;
      // Converti in EUR per grammo (1 troy oz = 31.1034768 g)
      const eurPerGram = eurPerOz / 31.1034768;
      const changePct = gold.eur_24h_change;

      valueEl.textContent = '€ ' + eurPerGram.toFixed(2) + '/g';
      const arrow = changePct >= 0 ? '▲' : '▼';
      changeEl.textContent = arrow + ' ' + Math.abs(changePct).toFixed(2) + '% (24h)';
      changeEl.className = 'fixing-change ' + (changePct >= 0 ? 'up' : 'down');
    } catch (e) {
      // Fallback: dato statico con ultimo valore noto (€ 126.64/g ≈ €3,937/oz)
      valueEl.textContent = '€ 126.64/g';
      changeEl.textContent = '— aggiorna pagina';
      changeEl.className = 'fixing-change';
    }
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
