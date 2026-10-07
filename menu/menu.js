// ---------- Getränkekarte: Datenquelle ----------
// Die Karte kommt vom Server (/api/menu) — dort pflegt sie der Wirt im
// Verwaltungsbereich (/verwaltung/). Ist der Server nicht erreichbar (z.B.
// wenn die Seite nur als Dateien geöffnet wird), wird die mitgelieferte
// menu-data.json genutzt, damit die Karte nie leer bleibt.
const MENU_API_URL = "/api/menu";
const FALLBACK_JSON_URL = "menu-data.json";

// ---------- Wenige, große Oberkategorien statt 16 einzelner Chips ----------
// Jede feine "Kategorie" aus der Tabelle wird hier einer von wenigen
// großen Gruppen zugeordnet, damit Gäste mit 1 Klick zu dem kommen, was
// sie wirklich suchen, statt eine lange Chip-Leiste durchsuchen zu
// müssen. Neue Kategorie-Namen aus der Tabelle, die hier nicht auftauchen,
// landen automatisch in "Weitere Getränke" — die Seite bricht also nie.
const GROUPS = [
  { id: "bier", letter: "B", banner: "../images/photo-guinness.jpg", name: "Bier", match: ["Bier vom Fass", "Flaschenbiere"] },
  { id: "wein", letter: "W", banner: "images/banner-wein.jpg", name: "Wein & Sekt", match: ["Wein & Sekt", "Piccolo"] },
  { id: "spirituosen", letter: "S", banner: "../images/photo-jackdaniels.jpg", name: "Spirituosen", match: ["Klare Schnäpse", "Weinbrand", "Rum", "Whisky", "Kleine Liköre", "Liköre"] },
  { id: "longdrinks", letter: "L", banner: "images/banner-longdrinks.jpg", name: "Longdrinks", match: ["Longdrinks", "Absolut", "Gorbatschow"] },
  { id: "alkoholfrei", letter: "A", banner: "images/banner-alkoholfrei.jpg", name: "Alkoholfrei", match: ["Alkoholfreie Getränke", "Säfte"] },
  { id: "warm", letter: "H", banner: "images/banner-warm.jpg", name: "Warme Getränke", match: ["Heisse Getränke"] },
];
const FALLBACK_GROUP = { id: "weitere", letter: "+", banner: "", name: "Weitere Getränke" };

function findGroup(category) {
  return GROUPS.find((group) => group.match.includes(category)) || FALLBACK_GROUP;
}

const list = document.querySelector("#menu-list");
const groupNav = document.querySelector("#groups");
const search = document.querySelector("#search");
const empty = document.querySelector("#empty");
const loading = document.querySelector("#loading");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));

// Baut die Struktur: Oberkategorie → Unterkategorie(n) → Getränke,
// in der festen Reihenfolge von GROUPS (nicht in Tabellen-Reihenfolge),
// damit die Kacheln oben und die Abschnitte darunter immer übereinstimmen.
function buildStructure(items) {
  const groupsById = new Map();

  items.forEach((item) => {
    const group = findGroup(item.category);
    if (!groupsById.has(group.id)) {
      groupsById.set(group.id, { ...group, subgroups: new Map() });
    }
    const groupEntry = groupsById.get(group.id);
    if (!groupEntry.subgroups.has(item.category)) {
      groupEntry.subgroups.set(item.category, []);
    }
    groupEntry.subgroups.get(item.category).push(item);
  });

  const orderedIds = [...GROUPS.map((g) => g.id), FALLBACK_GROUP.id];
  return orderedIds
    .filter((id) => groupsById.has(id))
    .map((id) => {
      const entry = groupsById.get(id);
      return {
        ...entry,
        subgroups: Array.from(entry.subgroups.entries()).map(([name, groupItems]) => ({ name, items: groupItems })),
      };
    });
}

function renderMenu(items) {
  const structure = buildStructure(items);

  groupNav.innerHTML = structure
    .map(
      (group) =>
        `<a class="group-tile" href="#${group.id}" data-target="${group.id}"><span class="badge-letter group-tile__badge" aria-hidden="true">${group.letter}</span><span class="group-tile__name">${escapeHtml(group.name)}</span></a>`
    )
    .join("");
  groupNav.hidden = false;

  list.innerHTML = structure
    .map((group) => {
      const subgroupsHtml = group.subgroups
        .map((subgroup) => {
          const rows = subgroup.items
            .map(
              (item) =>
                `<li class="row"><div class="row__text"><span class="row__name">${escapeHtml(item.name)}</span>${
                  item.size ? `<span class="row__size">${escapeHtml(item.size)}</span>` : ""
                }</div><span class="row__price">${escapeHtml(item.price)} €</span></li>`
            )
            .join("");
          // Unterkategorie-Titel nur zeigen, wenn er sich vom Oberthema
          // unterscheidet (z.B. "Bier vom Fass" unter "Bier") — sonst wäre
          // er redundant und nur zusätzlicher visueller Lärm.
          const showSubtitle = subgroup.name !== group.name;
          return `<div class="subgroup">${showSubtitle ? `<p class="subgroup__title">${escapeHtml(subgroup.name)}</p>` : ""}<ul class="subgroup__list">${rows}</ul></div>`;
        })
        .join("");
      const bannerHtml = group.banner
        ? `<div class="section-block__banner"><img src="${group.banner}" alt="${escapeHtml(group.name)}" loading="lazy"></div>`
        : "";
      return `<section class="section-block" id="${group.id}">${bannerHtml}<div class="section-block__head"><span class="badge-letter section-block__badge" aria-hidden="true">${group.letter}</span><h2>${escapeHtml(group.name)}</h2></div>${subgroupsHtml}</section>`;
    })
    .join("");

  loading.hidden = true;
  list.hidden = false;

  // Scroll-Spy: zeigt in der fixierten Bottom-Bar immer an, in welcher
  // Kategorie man sich gerade befindet — der Nutzer muss nie raten, wo
  // er ist oder was als Nächstes kommt.
  const navTiles = Array.from(groupNav.querySelectorAll(".group-tile"));

  // Sprung zur Kategorie selbst ausführen statt über den Anker-Link: das
  // weiche Browser-Scrollen über mehrere tausend Pixel brach auf Handys ab
  // und landete wieder oben. Direkt springen ist bei der langen Karte auch
  // schneller. Die Suchleiste klebt oben, deshalb ihre Höhe abziehen.
  const tools = document.querySelector(".mtools");
  navTiles.forEach((tile) => {
    tile.addEventListener("click", (event) => {
      const section = document.getElementById(tile.dataset.target);
      if (!section) return;
      event.preventDefault();
      const offset = (tools ? tools.offsetHeight : 0) + 12;
      window.scrollTo(0, section.getBoundingClientRect().top + window.scrollY - offset);
      navTiles.forEach((t) => t.classList.remove("is-active"));
      tile.classList.add("is-active");
    });
  });
  if ("IntersectionObserver" in window && navTiles.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const tile = navTiles.find((t) => t.dataset.target === entry.target.id);
          if (tile && entry.isIntersecting) {
            navTiles.forEach((t) => t.classList.remove("is-active"));
            tile.classList.add("is-active");
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    list.querySelectorAll(".section-block").forEach((section) => spy.observe(section));
  }

  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("de-DE");
    let visibleSections = 0;
    list.querySelectorAll(".section-block").forEach((section) => {
      let visibleInSection = 0;
      section.querySelectorAll(".subgroup").forEach((subgroup) => {
        let visibleRows = 0;
        subgroup.querySelectorAll(".row").forEach((row) => {
          const match = !query || row.querySelector(".row__name").textContent.toLocaleLowerCase("de-DE").includes(query);
          row.hidden = !match;
          if (match) visibleRows++;
        });
        subgroup.hidden = visibleRows === 0;
        visibleInSection += visibleRows;
      });
      section.hidden = visibleInSection === 0;
      if (visibleInSection) visibleSections++;
    });
    empty.hidden = visibleSections > 0;
  });
}

async function loadMenu() {
  for (const url of [MENU_API_URL, FALLBACK_JSON_URL]) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const items = await response.json();
      if (Array.isArray(items) && items.length) return renderMenu(items);
    } catch (error) {
      console.warn("Karte konnte nicht geladen werden von", url, error);
    }
  }
  loading.textContent = "Karte konnte nicht geladen werden.";
}

loadMenu();
