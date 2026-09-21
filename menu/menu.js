// ---------- Getränkekarte: Datenquelle ----------
// Standard: eine veröffentlichte Google-Tabelle (CSV-Export) — der Kunde
// pflegt seine Karte dort ganz normal wie in Excel, ohne Code anzufassen.
// Solange keine Tabelle eingerichtet ist (SHEET_CSV_URL leer), wird
// automatisch die lokale menu-data.json genutzt, damit die Seite auch
// ohne Google-Sheet-Einrichtung sofort funktioniert.
//
// Einrichtung (siehe auch README.md):
// 1. Google Sheet anlegen mit den Spalten: Kategorie | Getränk | Größe | Preis
//    (Größe darf leer bleiben, z.B. bei Espresso)
// 2. Datei → Freigeben → Im Web veröffentlichen → als CSV
// 3. Die dort angezeigte URL unten bei SHEET_CSV_URL eintragen
// 4. Fertig — der Kunde ändert ab jetzt nur noch die Tabelle, die Seite
//    lädt bei jedem Aufruf den aktuellen Stand.
const SHEET_CSV_URL = ""; // z.B. "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
const FALLBACK_JSON_URL = "menu-data.json";

// ---------- Wenige, große Oberkategorien statt 16 einzelner Chips ----------
// Jede feine "Kategorie" aus der Tabelle wird hier einer von wenigen
// großen Gruppen zugeordnet, damit Gäste mit 1 Klick zu dem kommen, was
// sie wirklich suchen, statt eine lange Chip-Leiste durchsuchen zu
// müssen. Neue Kategorie-Namen aus der Tabelle, die hier nicht auftauchen,
// landen automatisch in "Weitere Getränke" — die Seite bricht also nie,
// auch wenn der Kunde in der Tabelle etwas Neues einträgt.
const GROUPS = [
  { id: "bier", letter: "B", banner: "../images/photo-guinness.jpg", name: "Bier", match: ["Bier vom Fass", "Flaschenbiere"] },
  { id: "wein", letter: "W", banner: "images/banner-wein.svg", name: "Wein & Sekt", match: ["Wein & Sekt", "Piccolo"] },
  { id: "spirituosen", letter: "S", banner: "../images/photo-jackdaniels.jpg", name: "Spirituosen", match: ["Klare Schnäpse", "Weinbrand", "Rum", "Whisky", "Kleine Liköre", "Liköre"] },
  { id: "longdrinks", letter: "L", banner: "images/banner-longdrinks.svg", name: "Longdrinks", match: ["Longdrinks", "Absolut", "Gorbatschow"] },
  { id: "alkoholfrei", letter: "A", banner: "images/banner-alkoholfrei.svg", name: "Alkoholfrei", match: ["Alkoholfreie Getränke", "Säfte"] },
  { id: "warm", letter: "H", banner: "images/banner-warm.svg", name: "Warme Getränke", match: ["Heisse Getränke"] },
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

// Sehr einfacher CSV-Parser: kommt mit Anführungszeichen und Kommas in
// Feldern klar (Standard-Export von Google Sheets).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field); field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function csvToItems(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const [header, ...body] = rows;
  const idx = {
    category: header.findIndex((h) => h.trim().toLowerCase().startsWith("kategorie")),
    name: header.findIndex((h) => h.trim().toLowerCase().startsWith("getr")),
    size: header.findIndex((h) => h.trim().toLowerCase().startsWith("gr")),
    price: header.findIndex((h) => h.trim().toLowerCase().startsWith("preis")),
  };
  return body
    .filter((cols) => cols[idx.name] && cols[idx.name].trim())
    .map((cols) => ({
      category: (cols[idx.category] || "Sonstiges").trim(),
      name: cols[idx.name].trim(),
      size: (idx.size >= 0 ? cols[idx.size] || "" : "").trim(),
      price: (cols[idx.price] || "").trim(),
    }));
}

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
  if (SHEET_CSV_URL) {
    try {
      const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Sheet nicht erreichbar");
      const items = csvToItems(await response.text());
      if (items.length) return renderMenu(items);
    } catch (error) {
      console.warn("Konnte Google Sheet nicht laden, nutze lokale menu-data.json:", error);
    }
  }
  try {
    const response = await fetch(FALLBACK_JSON_URL, { cache: "no-store" });
    const items = await response.json();
    renderMenu(items);
  } catch (error) {
    loading.textContent = "Karte konnte nicht geladen werden.";
    console.error(error);
  }
}

loadMenu();
