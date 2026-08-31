# Changelog

All notable changes to A1 Pharmacy are recorded here, newest first.

Versions follow `MAJOR.MINOR.PATCH`:

- **PATCH** — a fix. Drop the new files over your old ones and nothing else changes.
- **MINOR** — new pages, components or options. Existing markup keeps working.
- **MAJOR** — something existing changed shape. The entry says what and where.

Each entry lists the files touched, so you can tell at a glance whether an
update affects anything you have edited.

---

## 1.1.0 — 20 August 2026

- **Shop pagination.** The results now page 12 at a time, over the cards already
  in the markup. Paging survives a reload and a shared link (`?page=2`), the
  count reads `13–24 of 32 products`, and changing any filter returns you to
  page one. Files: `shop.html`, `js/shop-filters.js`, `css/pages/shop.css`.
- **Live theme panel on the demo site.** A fixed panel lets a visitor set the
  six main colour tokens, or pick a preset, and see the whole site follow. It
  persists across pages and says on its face that it is part of the demo rather
  than the template. `demo/` — injected by `build.js` into the demo build only,
  and excluded from both the package and the free edition.
- **Account page on narrow screens.** A repeat item read as one block of prose:
  three groups stacked with the same rhythm, same colour, same size. They are
  now spaced apart, each item sits on its own white surface against the canvas,
  and "next due" is a labelled row with the date against the right edge instead
  of two more sentences. On the orders list the total no
  longer wraps onto a line of its own below the reference. `css/pages/account.css`.
- **Journal paging**, and a reusable `js/pager.js` behind it. Put
  `data-pager-list="name"` and `data-page-size` on any list and a matching
  `data-pager="name"` block beside it. Shown live in `components.html`.
- The `.pager` styles moved out of `css/pages/shop.css` into
  `css/components/pager.css`, since three pages use them now.
- **Data table component.** `css/components/table.css`, shown in
  `components.html`. Nothing else changed to accommodate it.
- Fixed: `css/pages/shop.css` documented a `.pager` as being driven by
  `js/api.js`, a file that has never existed. The styles are now wired to real
  behaviour and the comment corrected.

---

## 1.0.0 — 20 August 2026

First release.

- 22 pages: home, shop, product, prescriptions, services, journal and 6
  articles, about, contact, bag, checkout, account, privacy, terms,
  accessibility, 404, and a component reference.
- Shop with client-side filtering, sorting and search across 32 products.
- 16 component stylesheets in `css/components/`, all shown live across the 18
  sections of `components.html`.
- Ten vanilla scripts, no framework and no dependencies.
- Optional production bundler, `node build.js`.
- Documentation in `documentation/index.html`.
