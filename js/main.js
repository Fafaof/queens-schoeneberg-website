const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Header bekommt beim Scrollen einen Schatten
const siteHeader = document.querySelector('.site-header');
const updateHeaderScrollState = () => {
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
};
updateHeaderScrollState();
window.addEventListener('scroll', updateHeaderScrollState, { passive: true });

// Scroll-Reveal: Elemente mit Klasse "reveal" blenden beim Reinscrollen ein
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- Übersetzungen (DE/EN) ----------
// Jeder Text im HTML mit data-i18n="key" wird hier per Key übersetzt.
// Neue Texte hinzufügen: im HTML ein data-i18n="mein_key" Attribut setzen
// und hier den Key mit de/en Wert ergänzen.
const translations = {
  nav_about: { de: 'Über uns', en: 'About' },
  nav_highlights: { de: 'Highlights', en: 'Highlights' },
  nav_gallery: { de: 'Atmosphäre', en: 'Gallery' },
  nav_hours: { de: 'Öffnungszeiten', en: 'Opening Hours' },
  nav_anfahrt: { de: 'Anfahrt', en: 'Directions' },
  nav_blog: { de: 'Kiez-Blog', en: 'Neighborhood Blog' },
  nav_contact: { de: 'Kontakt', en: 'Contact' },

  badge_18: { de: 'Ab 18', en: '18+' },
  badge_smoking: { de: 'Raucherlokal', en: 'Smoking Allowed' },

  hero_subtitle: {
    de: 'Kaltes Bier, gute Musik, Billiard bis spät. Deine Kneipe im Kiez.',
    en: 'Cold beer, good music, pool until late. Your neighborhood bar.',
  },
  hero_cta: { de: 'Tisch reservieren', en: 'Reserve a Table' },
  hero_cta_secondary: { de: 'Mehr erfahren', en: 'Learn More' },

  about_eyebrow: { de: 'Über uns', en: 'About Us' },
  about_title: { de: 'Eine Institution im Kiez', en: 'A Neighborhood Institution' },
  about_text: {
    de: 'Queen’s ist mehr als eine Kneipe — es ist ein zweites Wohnzimmer für alle, die gutes Bier, ehrliche Gespräche und die richtige Playlist zu schätzen wissen. Bei uns triffst du Nachbarn, Stammgäste und alle, die den Kiez lieben.',
    en: 'Queen’s is more than a bar — it’s a second living room for anyone who appreciates good beer, honest conversation, and the right playlist. Meet neighbors, regulars, and everyone who loves this neighborhood.',
  },

  highlights_eyebrow: { de: 'Bei uns erwartet dich', en: 'What Awaits You' },
  highlights_title: { de: 'Highlights', en: 'Highlights' },
  highlight_billiard_title: { de: 'Billiard', en: 'Pool' },
  highlight_billiard_text: {
    de: 'Zwei Tische, faire Preise, immer eine Runde frei.',
    en: 'Two tables, fair prices, always a spot free.',
  },
  highlight_jukebox_title: { de: 'Jukebox', en: 'Jukebox' },
  highlight_jukebox_text: {
    de: 'Von Punk bis Schlager — die Musik machst du.',
    en: 'From punk to schlager — you pick the soundtrack.',
  },
  highlight_drinks_title: { de: 'Getränke', en: 'Drinks' },
  highlight_drinks_text: {
    de: 'Kaltes Bier vom Fass, Kurze und die üblichen Verdächtigen.',
    en: 'Cold draft beer, shots, and the usual suspects.',
  },

  poster_quote: {
    de: '„Kein Schnickschnack. Nur kaltes Bier, ein sauberer Billardtisch und gute Nachbarn.“',
    en: '"No frills. Just cold beer, a clean pool table, and good neighbors."',
  },

  gallery_eyebrow: { de: 'Impressionen', en: 'Impressions' },
  gallery_title: { de: 'Atmosphäre', en: 'Atmosphere' },

  anfahrt_eyebrow: { de: 'So findest du uns', en: 'How to Find Us' },
  anfahrt_title: { de: 'Anfahrt', en: 'Directions' },
  anfahrt_note: {
    de: 'U4 Rathaus Schöneberg · S Schöneberg — jeweils rund 5 Minuten zu Fuß.',
    en: 'U4 Rathaus Schöneberg · S Schöneberg — each about a 5-minute walk.',
  },
  anfahrt_cta: { de: 'Route planen', en: 'Get Directions' },

  hours_eyebrow: { de: 'Wann & Wo', en: 'When & Where' },
  hours_title: { de: 'Öffnungszeiten', en: 'Opening Hours' },
  day_mon_thu: { de: 'Mo – Do', en: 'Mon – Thu' },
  day_fri_sat: { de: 'Fr – Sa', en: 'Fri – Sat' },
  day_sun: { de: 'So', en: 'Sun' },
  hours_note: {
    de: 'Platzhalter — bitte tatsächliche Öffnungszeiten eintragen.',
    en: 'Placeholder — please enter actual opening hours.',
  },
  tripadvisor_cta: { de: 'Bewertungen auf TripAdvisor', en: 'Reviews on TripAdvisor' },

  blog_eyebrow: { de: 'Kiez-Blog', en: 'Neighborhood Blog' },
  blog_title: { de: 'Was geht im Kiez', en: 'What’s Happening Here' },
  blog_loading: { de: 'Beiträge werden geladen …', en: 'Loading posts …' },
  blog_empty: { de: 'Hier gibt es bald Neuigkeiten aus dem Queen’s.', en: 'News from Queen’s coming soon.' },

  contact_eyebrow: { de: 'Reservierung', en: 'Reservation' },
  contact_title: { de: 'Tisch reservieren', en: 'Reserve a Table' },
  contact_text: {
    de: 'Kurz Bescheid geben, wir melden uns per E-Mail zurück.',
    en: 'Drop us a line and we’ll get back to you by email.',
  },
  form_name: { de: 'Name', en: 'Name' },
  form_email: { de: 'Deine E-Mail', en: 'Your Email' },
  form_subject: { de: 'Anliegen', en: 'Subject' },
  form_subject_reservation: { de: 'Tischreservierung', en: 'Table Reservation' },
  form_subject_general: { de: 'Allgemeine Anfrage', en: 'General Inquiry' },
  form_subject_other: { de: 'Sonstiges', en: 'Other' },
  form_date: { de: 'Datum (optional)', en: 'Date (optional)' },
  form_people: { de: 'Personen (optional)', en: 'Guests (optional)' },
  form_message: { de: 'Notiz', en: 'Note' },
  form_submit: { de: 'Anfrage senden', en: 'Send Request' },
  form_sending: { de: 'Wird gesendet …', en: 'Sending …' },
  form_success: { de: 'Danke! Deine Anfrage ist angekommen, wir melden uns per E-Mail.', en: 'Thank you! We received your request and will reply by email.' },
  form_invalid: { de: 'Bitte Name, E-Mail und Notiz ausfüllen.', en: 'Please fill in name, email and note.' },
  form_error: { de: 'Das hat leider nicht geklappt. Bitte später noch einmal versuchen oder anrufen.', en: 'Sorry, that did not work. Please try again later or give us a call.' },

  footer_instagram: { de: 'Instagram', en: 'Instagram' },
  footer_facebook: { de: 'Facebook', en: 'Facebook' },
  footer_imprint: { de: 'Impressum', en: 'Imprint' },
  footer_privacy: { de: 'Datenschutz', en: 'Privacy' },
  footer_review: { de: 'Bewerte uns auf Google', en: 'Review us on Google' },
  blog_back: { de: '← Zurück zur Startseite', en: '← Back to the home page' },
};

const langToggle = document.getElementById('lang-toggle');
let currentLang = 'de';

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const entry = translations[key];
    if (entry && entry[lang]) {
      el.textContent = entry[lang];
    }
  });
}

langToggle.addEventListener('click', () => {
  currentLang = currentLang === 'de' ? 'en' : 'de';
  applyLanguage(currentLang);
  if (activeHighlightTab) openHighlightPanel(activeHighlightTab);
});

// ---------- Highlights: nebeneinander liegende Tabs mit Inline-Panel ----------
// Klick auf einen Tab zeigt Bild + Beschreibung in einem Panel, das wie ein
// Popup wirkt, aber Teil des normalen Seitenflusses bleibt (kein Overlay,
// Scrollen bleibt möglich). Klick irgendwo außerhalb schließt es wieder.
const highlightTabs = document.querySelectorAll('.highlight-tab');
const highlightPanelWrap = document.getElementById('highlight-panel-wrap');
const highlightPanelImg = document.getElementById('highlight-panel-img');
const highlightPanelTitle = document.getElementById('highlight-panel-title');
const highlightPanelDesc = document.getElementById('highlight-panel-desc');
let activeHighlightTab = null;

function openHighlightPanel(tab) {
  const titleEntry = translations[tab.dataset.title];
  const descEntry = translations[tab.dataset.desc];
  highlightPanelImg.src = tab.dataset.img;
  highlightPanelImg.alt = titleEntry ? titleEntry[currentLang] : '';
  highlightPanelTitle.textContent = titleEntry ? titleEntry[currentLang] : '';
  highlightPanelDesc.textContent = descEntry ? descEntry[currentLang] : '';
  highlightPanelWrap.classList.add('is-open');
  highlightTabs.forEach((t) => {
    t.classList.toggle('is-active', t === tab);
    t.setAttribute('aria-expanded', String(t === tab));
  });
  activeHighlightTab = tab;
}

function closeHighlightPanel() {
  highlightPanelWrap.classList.remove('is-open');
  highlightTabs.forEach((t) => {
    t.classList.remove('is-active');
    t.setAttribute('aria-expanded', 'false');
  });
  activeHighlightTab = null;
}

highlightTabs.forEach((tab) => {
  tab.addEventListener('click', (event) => {
    event.stopPropagation();
    if (activeHighlightTab === tab) {
      closeHighlightPanel();
    } else {
      openHighlightPanel(tab);
    }
  });
});

document.addEventListener('click', (event) => {
  if (activeHighlightTab && !highlightPanelWrap.contains(event.target)) {
    closeHighlightPanel();
  }
});

// ---------- Atmosphäre-Galerie: echtes 3D-Riesenrad gekoppelt an den Scroll ----------
// Die Achse liegt waagerecht (links-rechts), wie bei einem echten Riesenrad
// von der Seite betrachtet — sie zeigt NICHT auf den Betrachter. Technisch:
// rotateX dreht um genau diese waagerechte Achse. Jedes Bild sitzt wie eine
// Gondel im Abstand "radius" von der Nabe (translateZ) und bleibt dabei der
// Kamera zugewandt (Gegenrotation). Beim Drehen schwingen die Bilder dadurch
// nah an die Kamera heran — groß, dominant, fast bildschirmfüllend — und
// wieder zurück nach hinten, klein und blass. Die Sektion (#gallery-pin) ist
// mehrfach höher als der Viewport, damit man erst weiterscrollen kann, wenn
// alle Bilder einmal vorne durchgelaufen sind. Bei "reduced motion" oder
// ohne JS: normale scrollbare Reihe (siehe CSS .no-scrolljack).
const galleryPin = document.getElementById('gallery-pin');
const galleryStage = document.getElementById('gallery-stage');
const galleryItems = galleryStage ? Array.from(galleryStage.querySelectorAll('.gallery-item')) : [];

if (galleryPin && galleryStage && galleryItems.length && !prefersReducedMotion) {
  const angleStep = 360 / galleryItems.length;
  let radius = 420;
  let ticking = false;

  const measure = () => {
    // Radius deutlich unter dem CSS-perspective-Wert (1100px) halten, sonst
    // kippt die Perspektive bei den vordersten Bildern um.
    radius = Math.min(480, galleryStage.clientHeight * 0.7, galleryStage.clientWidth * 0.45);
  };

  const layoutWheel = () => {
    ticking = false;
    const rect = galleryPin.getBoundingClientRect();
    const scrollableDistance = galleryPin.offsetHeight - window.innerHeight;
    if (scrollableDistance <= 0) return;
    const progress = Math.min(1, Math.max(0, -rect.top / scrollableDistance));
    // Bewusst keine volle Umdrehung: sonst steht am Ende wieder das erste Bild vorne.
    const wheelAngle = progress * (360 - angleStep);

    galleryItems.forEach((item, i) => {
      const totalAngle = i * angleStep + wheelAngle;
      const rad = (totalAngle * Math.PI) / 180;
      const depth = Math.cos(rad); // 1 = ganz vorne (Kamera), -1 = ganz hinten
      const opacity = 0.18 + 0.82 * ((depth + 1) / 2);
      const punch = 1 + 0.18 * ((depth + 1) / 2); // zusätzlicher Wums, wenn ein Bild vorne ist
      item.style.transform =
        `translate(-50%, -50%) rotateX(${totalAngle}deg) translateZ(${radius}px) rotateX(${-totalAngle}deg) scale(${punch})`;
      item.style.opacity = String(opacity);
      item.style.zIndex = String(Math.round((depth + 1) * 500));
    });
  };

  const requestLayout = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(layoutWheel);
    }
  };

  measure();
  layoutWheel();
  window.addEventListener('scroll', requestLayout, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    requestLayout();
  });
} else if (galleryPin) {
  galleryPin.classList.add('no-scrolljack');
}

// ---------- Hero (Desktop): Logo und Video reagieren leicht versetzt auf die Maus ----------
const hero = document.querySelector('.hero');
if (hero && !prefersReducedMotion && window.matchMedia('(min-width: 861px) and (pointer: fine)').matches) {
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    hero.style.setProperty('--px', (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
    hero.style.setProperty('--py', (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
  });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--px', '0');
    hero.style.setProperty('--py', '0');
  });
}

// ---------- Reservierungsformular: Anfrage an den eigenen Server schicken ----------
const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  const bookingStatus = document.getElementById('booking-status');
  const bookingButton = bookingForm.querySelector('button[type="submit"]');
  const showStatus = (key, isError) => {
    bookingStatus.textContent = translations[key][currentLang];
    bookingStatus.classList.toggle('is-error', isError);
    bookingStatus.hidden = false;
  };

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!bookingForm.checkValidity()) {
      showStatus('form_invalid', true);
      return;
    }
    const data = Object.fromEntries(new FormData(bookingForm).entries());
    bookingButton.disabled = true;
    showStatus('form_sending', false);
    try {
      const response = await fetch('/api/anfrage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(String(response.status));
      bookingForm.reset();
      showStatus('form_success', false);
    } catch {
      showStatus('form_error', true);
    } finally {
      bookingButton.disabled = false;
    }
  });
}
