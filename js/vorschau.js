// Vorschau-Modus NUR für GitHub Pages (*.github.io): dort läuft kein Server,
// deshalb werden alle Aufrufe an /api/... hier im Browser nachgestellt und in
// dessen Speicher (localStorage) abgelegt. So lässt sich die Verwaltung
// komplett durchklicken — Änderungen sieht aber nur, wer sie gemacht hat.
// Auf dem echten Server tut diese Datei nichts.
(() => {
  if (!location.hostname.endsWith('.github.io')) return;

  const base = new URL('..', document.currentScript.src); // Wurzel der Website
  const realFetch = window.fetch.bind(window);
  const load = (key, fallback) => JSON.parse(localStorage.getItem(`queens_${key}`) || 'null') ?? fallback;
  const save = (key, value) => localStorage.setItem(`queens_${key}`, JSON.stringify(value));
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const toDataUrl = (blob) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

  async function handle(method, path, body) {
    const loggedIn = sessionStorage.getItem('queens_vorschau_login') === '1';
    const json = () => JSON.parse(body || '{}');

    if (method === 'GET' && path === '/api/menu') {
      return reply(load('menu', null) || (await (await realFetch(new URL('menu/menu-data.json', base))).json()));
    }
    if (method === 'GET' && path === '/api/posts') return reply(load('posts', []));
    if (method === 'POST' && path === '/api/anfrage') {
      const data = json();
      const entry = { id: newId(), received: new Date().toISOString(), done: false, ...data };
      save('anfragen', [entry, ...load('anfragen', [])]);
      return reply({ ok: true });
    }
    if (method === 'GET' && path === '/api/session') return reply({ loggedIn, passwordSet: true });
    if (method === 'POST' && path === '/api/login') {
      if (!json().password) return reply({ error: 'Bitte ein Passwort eingeben.' }, 401);
      sessionStorage.setItem('queens_vorschau_login', '1');
      return reply({ ok: true });
    }
    if (method === 'POST' && path === '/api/logout') {
      sessionStorage.removeItem('queens_vorschau_login');
      return reply({ ok: true });
    }
    if (!loggedIn) return reply({ error: 'Bitte neu anmelden.' }, 401);

    if (method === 'PUT' && path === '/api/menu') {
      save('menu', json());
      return reply({ ok: true });
    }
    if (method === 'POST' && path === '/api/upload') return reply({ image: await toDataUrl(body) });
    if (method === 'POST' && path === '/api/posts') {
      const post = { id: newId(), ...json() };
      save('posts', [...load('posts', []), post]);
      return reply(post);
    }
    if (method === 'GET' && path === '/api/anfragen') return reply(load('anfragen', []));

    const match = /^\/api\/(posts|anfragen)\/([a-f0-9]+)$/.exec(path);
    if (match) {
      const [, key, id] = match;
      const all = load(key, []);
      const index = all.findIndex((entry) => entry.id === id);
      if (index < 0) return reply({ error: 'Nicht gefunden.' }, 404);
      if (method === 'DELETE') all.splice(index, 1);
      else all[index] = { ...all[index], ...json() };
      save(key, all);
      return reply(all[index] || { ok: true });
    }
    return reply({ error: 'Nicht gefunden.' }, 404);
  }

  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return realFetch(input, options);
    try {
      return await handle((options.method || 'GET').toUpperCase(), url.pathname, options.body);
    } catch (error) {
      // z.B. Browser-Speicher voll (mehrere große Fotos)
      return reply({ error: 'In der Vorschau ist der Speicher voll. Bitte ein kleineres Foto wählen.' }, 507);
    }
  };

  // Hinweis in der Verwaltung, damit niemand die Vorschau für echt hält
  if (location.pathname.includes('/verwaltung')) {
    document.addEventListener('DOMContentLoaded', () => {
      const note = document.createElement('p');
      note.textContent = 'Vorschau: Jedes Passwort funktioniert. Änderungen bleiben nur in diesem Browser gespeichert.';
      note.style.cssText = 'margin:0;padding:10px 16px;background:#B8894B;color:#1F3D2B;font:600 14px/1.4 Inter,Arial,sans-serif;text-align:center';
      document.body.prepend(note);
    });
  }
})();
