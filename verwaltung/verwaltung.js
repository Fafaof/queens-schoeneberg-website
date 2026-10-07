// Verwaltung: Anmeldung, Getränkekarte, Kiez-Beiträge, Anfragen.
// Spricht mit der Schnittstelle in server/server.js (/api/...).
const $ = (selector) => document.querySelector(selector);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  });
  children.forEach((child) => node.append(child));
  return node;
}

async function api(method, path, body) {
  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body instanceof Blob) {
    options.body = body;
    options.headers['Content-Type'] = 'application/octet-stream';
  } else if (body !== undefined) {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error('Keine Verbindung. Bitte Internet prüfen und noch einmal versuchen.');
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== '/api/login') {
    showLogin();
    throw new Error('Bitte neu anmelden.');
  }
  if (!response.ok) throw new Error(data.error || 'Da ist etwas schiefgelaufen.');
  return data;
}

let toastTimer;
function toast(message, isError = false) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.toggle('is-error', isError);
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, isError ? 6000 : 2500);
}

// Hochgeladene Fotos liegen im Ordner uploads/ eine Ebene höher; in der
// GitHub-Pages-Vorschau (js/vorschau.js) sind es eingebettete data:-Adressen.
const imageUrl = (image) => (image.startsWith('data:') ? image : `../${image}`);

const formatDate = (iso) => {
  const [year, month, day] = String(iso).slice(0, 10).split('-');
  return day ? `${day}.${month}.${year}` : '';
};

// ---------- Anmeldung ----------
function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
}

async function showApp() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  await Promise.all([loadMenu(), loadPosts(), loadRequests()]);
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = $('#login-error');
  error.hidden = true;
  try {
    await api('POST', '/api/login', { password: $('#login-password').value });
    $('#login-password').value = '';
    await showApp();
  } catch (problem) {
    error.textContent = problem.message;
    error.hidden = false;
  }
});

$('#logout').addEventListener('click', async () => {
  if (menuDirty && !confirm('Es gibt ungespeicherte Änderungen an der Karte. Trotzdem abmelden?')) return;
  await api('POST', '/api/logout').catch(() => {});
  setDirty(false);
  showLogin();
});

// ---------- Reiter ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((other) => other.classList.toggle('is-active', other === tab));
    ['menu', 'posts', 'requests'].forEach((name) => {
      $(`#tab-${name}`).hidden = name !== tab.dataset.tab;
    });
    window.scrollTo(0, 0);
  });
});

// ---------- Getränkekarte ----------
// Die Karte ist eine flache Liste { category, name, size, price }. Hier wird
// sie nach Kategorie gruppiert bearbeitet und beim Speichern wieder flach
// zusammengesetzt — die Reihenfolge in der Liste ist die Reihenfolge auf der Karte.
let menuGroups = []; // [{ name, items: [{ name, size, price }] }]
let menuDirty = false;
const openCategories = new Set();

function setDirty(dirty) {
  menuDirty = dirty;
  $('#menu-save').disabled = !dirty;
  const status = $('#menu-status');
  status.textContent = dirty ? 'Noch nicht gespeichert' : 'Alles gespeichert';
  status.classList.toggle('is-dirty', dirty);
}

async function loadMenu() {
  const items = await api('GET', '/api/menu');
  menuGroups = [];
  items.forEach((item) => {
    let group = menuGroups.find((entry) => entry.name === item.category);
    if (!group) {
      group = { name: item.category, items: [] };
      menuGroups.push(group);
    }
    group.items.push({ name: item.name, size: item.size || '', price: item.price || '' });
  });
  setDirty(false);
  renderMenu();
}

function drinkRow(group, item, index) {
  const field = (key, placeholder, cssClass, label) =>
    el('input', {
      class: cssClass,
      type: 'text',
      value: item[key],
      placeholder,
      'aria-label': label,
      oninput: (event) => {
        item[key] = event.target.value;
        setDirty(true);
      },
    });
  const move = (delta) => () => {
    const target = index + delta;
    if (target < 0 || target >= group.items.length) return;
    group.items.splice(target, 0, group.items.splice(index, 1)[0]);
    setDirty(true);
    renderMenu();
  };
  return el('div', { class: 'drink' }, [
    field('name', 'Name des Getränks', 'drink__name', 'Name'),
    field('size', 'Größe, z.B. 0,3 l', 'drink__size', 'Größe'),
    field('price', 'Preis, z.B. 4,50', 'drink__price', 'Preis in Euro'),
    el('button', {
      type: 'button',
      class: 'icon-btn drink__delete',
      text: '🗑',
      'aria-label': `${item.name || 'Getränk'} löschen`,
      onclick: () => {
        if (item.name && !confirm(`„${item.name}“ von der Karte nehmen?`)) return;
        group.items.splice(index, 1);
        setDirty(true);
        renderMenu();
      },
    }),
    el('button', { type: 'button', class: 'icon-btn drink__up', text: '▲', 'aria-label': 'Nach oben', onclick: move(-1) }),
    el('button', { type: 'button', class: 'icon-btn drink__down', text: '▼', 'aria-label': 'Nach unten', onclick: move(1) }),
  ]);
}

function renderMenu() {
  const editor = $('#menu-editor');
  editor.replaceChildren(
    ...menuGroups.map((group) => {
      const details = el('details', { class: 'category' }, [
        el('summary', {}, [
          el('span', { text: group.name }),
          el('span', { class: 'category__count', text: `${group.items.length} Getränke` }),
        ]),
        el('div', { class: 'category__body' }, [
          ...group.items.map((item, index) => drinkRow(group, item, index)),
          el('button', {
            type: 'button',
            class: 'btn btn--quiet',
            text: `+ Getränk in „${group.name}“`,
            onclick: () => {
              group.items.push({ name: '', size: '', price: '' });
              setDirty(true);
              renderMenu();
              const inputs = editor.querySelectorAll('.category[open] .drink__name');
              const fresh = Array.from(inputs).find((input) => !input.value);
              if (fresh) fresh.focus();
            },
          }),
        ]),
      ]);
      details.open = openCategories.has(group.name);
      details.addEventListener('toggle', () => {
        if (details.open) openCategories.add(group.name);
        else openCategories.delete(group.name);
      });
      return details;
    })
  );
}

$('#menu-save').addEventListener('click', async () => {
  const items = [];
  for (const group of menuGroups) {
    for (const item of group.items) {
      const name = item.name.trim();
      if (!name) {
        openCategories.add(group.name);
        renderMenu();
        toast(`In „${group.name}“ fehlt bei einem Getränk der Name.`, true);
        return;
      }
      items.push({ category: group.name, name, size: item.size.trim(), price: item.price.trim() });
    }
  }
  try {
    await api('PUT', '/api/menu', items);
    setDirty(false);
    toast('Gespeichert — die Karte ist aktualisiert.');
  } catch (problem) {
    toast(problem.message, true);
  }
});

window.addEventListener('beforeunload', (event) => {
  if (menuDirty) event.preventDefault();
});

// ---------- Kiez-Beiträge ----------
let posts = [];
let editingPost = null; // null = neuer Beitrag
let postImage = ''; // Pfad des aktuell gewählten Fotos

function setPostImage(image) {
  postImage = image;
  const preview = $('#post-image-preview');
  preview.hidden = !image;
  if (image) preview.src = imageUrl(image);
  $('#post-image-remove').hidden = !image;
  $('#post-image-label').textContent = image ? 'Anderes Foto wählen' : 'Foto auswählen';
}

function openPostForm(post) {
  editingPost = post;
  $('#post-form-title').textContent = post ? 'Beitrag bearbeiten' : 'Neuer Beitrag';
  $('#post-submit').textContent = post ? 'Speichern' : 'Veröffentlichen';
  $('#post-title').value = post ? post.title : '';
  $('#post-text').value = post ? post.text : '';
  $('#post-date').value = post ? post.date : new Date().toISOString().slice(0, 10);
  $('#post-image').value = '';
  $('#post-error').hidden = true;
  setPostImage(post ? post.image : '');
  $('#post-form').hidden = false;
  $('#post-new').hidden = true;
  $('#post-form').scrollIntoView({ block: 'start' });
}

function closePostForm() {
  $('#post-form').hidden = true;
  $('#post-new').hidden = false;
}

// Handyfotos sind riesig: vor dem Hochladen auf max. 1600 px verkleinern.
async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('Dieses Foto kann nicht gelesen werden. Bitte ein anderes wählen.');
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

$('#post-image').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const label = $('#post-image-label');
  label.textContent = 'Foto wird hochgeladen …';
  try {
    const { image } = await api('POST', '/api/upload', await shrinkImage(file));
    setPostImage(image);
  } catch (problem) {
    setPostImage(postImage);
    toast(problem.message, true);
  }
});

$('#post-image-remove').addEventListener('click', () => {
  $('#post-image').value = '';
  setPostImage('');
});
$('#post-new').addEventListener('click', () => openPostForm(null));
$('#post-cancel').addEventListener('click', closePostForm);

$('#post-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {
    title: $('#post-title').value,
    text: $('#post-text').value,
    date: $('#post-date').value,
    image: postImage,
  };
  try {
    if (editingPost) await api('PUT', `/api/posts/${editingPost.id}`, body);
    else await api('POST', '/api/posts', body);
    closePostForm();
    await loadPosts();
    toast(editingPost ? 'Beitrag gespeichert.' : 'Beitrag ist online.');
  } catch (problem) {
    const error = $('#post-error');
    error.textContent = problem.message;
    error.hidden = false;
  }
});

async function loadPosts() {
  posts = await api('GET', '/api/posts');
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const list = $('#post-list');
  if (!posts.length) {
    list.replaceChildren(el('p', { class: 'empty', text: 'Noch keine Beiträge. Mit „+ Neuer Beitrag“ geht es los.' }));
    return;
  }
  list.replaceChildren(
    ...posts.map((post) =>
      el('article', { class: 'card entry' }, [
        el('p', { class: 'entry__meta', text: formatDate(post.date) }),
        el('h3', { class: 'entry__title', text: post.title }),
        ...(post.image ? [el('img', { class: 'entry__image', src: imageUrl(post.image), alt: '' })] : []),
        el('p', { class: 'entry__text', text: post.text.length > 220 ? `${post.text.slice(0, 220)} …` : post.text }),
        el('div', { class: 'row-buttons' }, [
          el('button', { type: 'button', class: 'btn btn--quiet', text: 'Bearbeiten', onclick: () => openPostForm(post) }),
          el('button', {
            type: 'button',
            class: 'btn btn--danger',
            text: 'Löschen',
            onclick: async () => {
              if (!confirm(`Beitrag „${post.title}“ wirklich löschen?`)) return;
              try {
                await api('DELETE', `/api/posts/${post.id}`);
                await loadPosts();
                toast('Beitrag gelöscht.');
              } catch (problem) {
                toast(problem.message, true);
              }
            },
          }),
        ]),
      ])
    )
  );
}

// ---------- Anfragen ----------
async function loadRequests() {
  const requests = await api('GET', '/api/anfragen');
  const open = requests.filter((entry) => !entry.done).length;
  const count = $('#requests-count');
  count.textContent = String(open);
  count.hidden = open === 0;

  const list = $('#request-list');
  if (!requests.length) {
    list.replaceChildren(el('p', { class: 'empty', text: 'Noch keine Anfragen.' }));
    return;
  }
  list.replaceChildren(
    ...requests.map((entry) => {
      const details = [entry.subject, entry.date && `für ${formatDate(entry.date)}`, entry.people && `${entry.people} Personen`]
        .filter(Boolean)
        .join(' · ');
      const received = new Date(entry.received).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
      return el('article', { class: `card entry${entry.done ? ' is-done' : ''}` }, [
        el('p', { class: 'entry__meta', text: `Eingegangen ${received}` }),
        el('h3', { class: 'entry__title', text: entry.name }),
        el('a', { href: `mailto:${entry.email}`, text: entry.email }),
        ...(details ? [el('p', { class: 'hint', text: details })] : []),
        el('p', { class: 'entry__text', text: entry.message }),
        el('div', { class: 'row-buttons' }, [
          el('button', {
            type: 'button',
            class: 'btn btn--quiet',
            text: entry.done ? 'Wieder öffnen' : 'Erledigt',
            onclick: async () => {
              await api('PUT', `/api/anfragen/${entry.id}`, { done: !entry.done }).catch((problem) => toast(problem.message, true));
              await loadRequests();
            },
          }),
          el('button', {
            type: 'button',
            class: 'btn btn--danger',
            text: 'Löschen',
            onclick: async () => {
              if (!confirm(`Anfrage von ${entry.name} löschen?`)) return;
              await api('DELETE', `/api/anfragen/${entry.id}`).catch((problem) => toast(problem.message, true));
              await loadRequests();
            },
          }),
        ]),
      ]);
    })
  );
}

// ---------- Start ----------
(async () => {
  try {
    const session = await api('GET', '/api/session');
    if (session.loggedIn) return await showApp();
    if (!session.passwordSet) {
      const error = $('#login-error');
      error.textContent = 'Es ist noch kein Passwort eingerichtet (auf dem Server: node server/set-password.js).';
      error.hidden = false;
    }
    showLogin();
  } catch {
    showLogin();
  }
})();
