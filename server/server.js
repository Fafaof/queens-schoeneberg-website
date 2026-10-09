// Queen's — kleiner Webserver ohne Abhängigkeiten (nur Node.js nötig).
// Liefert die Website aus und stellt die Schnittstelle für den
// Verwaltungsbereich (/verwaltung/) bereit: Getränkekarte, Kiez-Beiträge,
// Bild-Upload und Reservierungsanfragen. Alle Inhalte liegen als JSON-Dateien
// in server/data/, hochgeladene Bilder in uploads/.
//
// Start:            node server/server.js
// Passwort setzen:  node server/set-password.js
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '127.0.0.1';

const FILES = {
  config: path.join(DATA_DIR, 'config.json'),
  menu: path.join(DATA_DIR, 'menu.json'),
  posts: path.join(DATA_DIR, 'posts.json'),
  requests: path.join(DATA_DIR, 'anfragen.json'),
};
const MENU_SEED = path.join(ROOT, 'menu', 'menu-data.json');

// Nur diese Ordner/Dateitypen werden öffentlich ausgeliefert — server/,
// deploy/, .git und alles andere bleibt von außen unerreichbar.
const PUBLIC_DIRS = new Set(['css', 'js', 'fonts', 'images', 'menu', 'uploads', 'verwaltung']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

const SESSION_HOURS = 12;
const MAX_JSON_BYTES = 512 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Reservierungsanfragen werden nach 6 Monaten automatisch gelöscht —
// so steht es auch in der Datenschutzerklärung (datenschutz.html).
const REQUEST_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const sessions = new Map(); // token -> Ablaufzeit (ms)
const attempts = new Map(); // "bereich:ip" -> [Zeitstempel]

// ---------- Hilfsfunktionen ----------
async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

// Erst in eine Hilfsdatei schreiben, dann umbenennen: so bleibt bei einem
// Absturz mitten im Speichern nie eine halbe Datei zurück.
async function writeJson(file, value) {
  const tmp = `${file}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(value, null, 2));
  await fsp.rename(tmp, file);
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body === 'object' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    'Content-Type': isJson ? MIME['.json'] : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Zu groß'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readBody(req, MAX_JSON_BYTES);
  try {
    return JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    throw Object.assign(new Error('Ungültige Daten'), { status: 400 });
  }
}

function clientIp(req) {
  // Hinter dem Reverse-Proxy (Caddy) steht die echte Adresse im Header.
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unbekannt';
}

function tooMany(scope, ip, max, windowMs) {
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > max;
}

const clean = (value, max) => String(value ?? '').replace(/\s+$/g, '').slice(0, max);

async function readRequests() {
  const all = await readJson(FILES.requests, []);
  const cutoff = Date.now() - REQUEST_MAX_AGE_MS;
  return all.filter((entry) => new Date(entry.received).getTime() >= cutoff);
}

// ---------- Anmeldung ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function passwordMatches(password, config) {
  if (!config || !config.salt || !config.hash) return false;
  const candidate = Buffer.from(hashPassword(password, config.salt).hash, 'hex');
  const stored = Buffer.from(config.hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function sessionToken(req) {
  const match = /(?:^|;\s*)queens_sitzung=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  return match ? match[1] : null;
}

function isLoggedIn(req) {
  const token = sessionToken(req);
  if (!token) return false;
  const expires = sessions.get(token);
  if (!expires || expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function sessionCookie(req, token, maxAgeSeconds) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `queens_sitzung=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

// Schreibende Aufrufe müssen von der eigenen Seite kommen (Schutz gegen
// fremde Seiten, die im Namen des angemeldeten Wirts etwas abschicken).
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// ---------- Inhalte prüfen ----------
function validMenu(items) {
  if (!Array.isArray(items) || items.length > 1000) return null;
  const result = [];
  for (const item of items) {
    const entry = {
      category: clean(item && item.category, 60).trim(),
      name: clean(item && item.name, 120).trim(),
      size: clean(item && item.size, 40).trim(),
      price: clean(item && item.price, 40).trim(),
    };
    if (!entry.name || !entry.category) return null;
    result.push(entry);
  }
  return result;
}

function validPost(input, existing) {
  const title = clean(input.title, 160).trim();
  const text = clean(input.text, 8000).trim();
  const image = clean(input.image, 200);
  const date = clean(input.date, 10);
  if (!title || !text) return null;
  if (image && !/^uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(image)) return null;
  return {
    id: existing ? existing.id : crypto.randomBytes(8).toString('hex'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
    title,
    text,
    image,
  };
}

function imageExtension(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

async function removeUpload(image) {
  if (!image) return;
  await fsp.rm(path.join(ROOT, image), { force: true });
}

// ---------- Schnittstelle (/api/...) ----------
async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const ip = clientIp(req);

  if (req.method !== 'GET' && !sameOrigin(req)) return send(res, 403, { error: 'Nicht erlaubt.' });

  // --- öffentlich ---
  if (route === 'GET /api/menu') {
    return send(res, 200, await readJson(FILES.menu, await readJson(MENU_SEED, [])));
  }
  if (route === 'GET /api/posts') {
    return send(res, 200, await readJson(FILES.posts, []));
  }
  if (route === 'POST /api/anfrage') {
    if (tooMany('anfrage', ip, 5, 60 * 60 * 1000)) {
      return send(res, 429, { error: 'Zu viele Anfragen. Bitte später noch einmal versuchen.' });
    }
    const body = await readJsonBody(req);
    if (body.website) return send(res, 200, { ok: true }); // Falle für Spam-Programme
    const entry = {
      id: crypto.randomBytes(8).toString('hex'),
      received: new Date().toISOString(),
      name: clean(body.name, 120).trim(),
      email: clean(body.email, 160).trim(),
      subject: clean(body.subject, 60).trim(),
      date: clean(body.date, 10),
      people: clean(body.people, 3),
      message: clean(body.message, 3000).trim(),
      done: false,
    };
    if (!entry.name || !entry.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
      return send(res, 400, { error: 'Bitte Name, E-Mail und Notiz ausfüllen.' });
    }
    const all = await readRequests();
    all.unshift(entry);
    await writeJson(FILES.requests, all.slice(0, 500));
    return send(res, 200, { ok: true });
  }

  // --- Anmeldung ---
  if (route === 'GET /api/session') {
    const config = await readJson(FILES.config, null);
    return send(res, 200, { loggedIn: isLoggedIn(req), passwordSet: Boolean(config && config.hash) });
  }
  if (route === 'POST /api/login') {
    if (tooMany('login', ip, 8, 15 * 60 * 1000)) {
      return send(res, 429, { error: 'Zu viele Versuche. Bitte in 15 Minuten noch einmal probieren.' });
    }
    const body = await readJsonBody(req);
    const config = await readJson(FILES.config, null);
    if (!passwordMatches(String(body.password || ''), config)) {
      return send(res, 401, { error: 'Das Passwort stimmt nicht.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_HOURS * 60 * 60 * 1000);
    attempts.delete(`login:${ip}`);
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, token, SESSION_HOURS * 60 * 60) });
  }
  if (route === 'POST /api/logout') {
    sessions.delete(sessionToken(req));
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, 'x', 0) });
  }

  // --- ab hier nur angemeldet ---
  if (!isLoggedIn(req)) return send(res, 401, { error: 'Bitte neu anmelden.' });

  if (route === 'PUT /api/menu') {
    const items = validMenu(await readJsonBody(req));
    if (!items) return send(res, 400, { error: 'Jedes Getränk braucht einen Namen und eine Kategorie.' });
    await writeJson(FILES.menu, items);
    return send(res, 200, { ok: true, count: items.length });
  }

  if (route === 'POST /api/upload') {
    const buffer = await readBody(req, MAX_IMAGE_BYTES);
    const extension = imageExtension(buffer);
    if (!extension) return send(res, 400, { error: 'Das ist kein Bild (erlaubt: JPG, PNG, WebP).' });
    const name = `${crypto.randomBytes(12).toString('hex')}.${extension}`;
    await fsp.writeFile(path.join(UPLOAD_DIR, name), buffer);
    return send(res, 200, { image: `uploads/${name}` });
  }

  if (route === 'POST /api/posts') {
    const post = validPost(await readJsonBody(req));
    if (!post) return send(res, 400, { error: 'Bitte Titel und Text ausfüllen.' });
    const posts = await readJson(FILES.posts, []);
    posts.push(post);
    await writeJson(FILES.posts, posts);
    return send(res, 200, post);
  }

  const postMatch = /^\/api\/posts\/([a-f0-9]{16})$/.exec(url.pathname);
  if (postMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
    const posts = await readJson(FILES.posts, []);
    const index = posts.findIndex((post) => post.id === postMatch[1]);
    if (index < 0) return send(res, 404, { error: 'Beitrag nicht gefunden.' });
    if (req.method === 'DELETE') {
      const [removed] = posts.splice(index, 1);
      await writeJson(FILES.posts, posts);
      await removeUpload(removed.image);
      return send(res, 200, { ok: true });
    }
    const updated = validPost(await readJsonBody(req), posts[index]);
    if (!updated) return send(res, 400, { error: 'Bitte Titel und Text ausfüllen.' });
    const oldImage = posts[index].image;
    posts[index] = updated;
    await writeJson(FILES.posts, posts);
    if (oldImage && oldImage !== updated.image) await removeUpload(oldImage);
    return send(res, 200, updated);
  }

  if (route === 'GET /api/anfragen') {
    return send(res, 200, await readRequests());
  }
  const requestMatch = /^\/api\/anfragen\/([a-f0-9]{16})$/.exec(url.pathname);
  if (requestMatch && (req.method === 'PUT' || req.method === 'DELETE')) {
    const all = await readRequests();
    const index = all.findIndex((entry) => entry.id === requestMatch[1]);
    if (index < 0) return send(res, 404, { error: 'Anfrage nicht gefunden.' });
    if (req.method === 'DELETE') all.splice(index, 1);
    else all[index].done = Boolean((await readJsonBody(req)).done);
    await writeJson(FILES.requests, all);
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { error: 'Nicht gefunden.' });
}

// ---------- Dateien der Website ausliefern ----------
async function handleStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Nicht erlaubt');

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, 'Ungültige Adresse');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const relative = path.normalize(pathname).replace(/^[/\\]+/, '');
  const parts = relative.split(path.sep);
  const extension = path.extname(relative).toLowerCase();

  const isRootPage = parts.length === 1 && extension === '.html';
  const allowed = isRootPage || (parts.length > 1 && PUBLIC_DIRS.has(parts[0]));
  if (!allowed || !MIME[extension] || parts.some((part) => part.startsWith('.'))) {
    return send(res, 404, 'Seite nicht gefunden');
  }

  const file = path.join(ROOT, relative);
  let stat;
  try {
    stat = await fsp.stat(file);
  } catch {
    return send(res, 404, 'Seite nicht gefunden');
  }
  if (!stat.isFile()) return send(res, 404, 'Seite nicht gefunden');

  const headers = {
    'Content-Type': MIME[extension],
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff',
    // Bilder/Videos dürfen im Browser liegen bleiben; Seiten, Skripte und
    // Daten werden immer frisch geholt, damit Änderungen sofort sichtbar sind.
    'Cache-Control': /^\.(jpg|jpeg|png|webp|svg|mp4|woff2|ico)$/.test(extension) ? 'public, max-age=86400' : 'no-cache',
  };
  if (parts[0] === 'verwaltung') headers['X-Robots-Tag'] = 'noindex, nofollow';

  // Videos brauchen Teilabrufe (Range), sonst spielt Safari sie nicht ab.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    res.writeHead(206, {
      ...headers,
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { ...headers, 'Accept-Ranges': 'bytes' });
  if (req.method === 'HEAD') return res.end();
  return fs.createReadStream(file).pipe(res);
}

// ---------- Start ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/verwaltung') {
      res.writeHead(302, { Location: '/verwaltung/' });
      return res.end();
    }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await handleStatic(req, res, url);
  } catch (error) {
    if (!error.status) console.error(error);
    if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'Da ist etwas schiefgelaufen.' });
    else res.end();
  }
});

async function start() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  server.listen(PORT, HOST, () => {
    console.log(`Queen's läuft auf http://${HOST}:${PORT}`);
  });
}

if (require.main === module) start();

module.exports = { hashPassword, FILES, DATA_DIR };
