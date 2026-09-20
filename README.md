# Portfolio — Bernard Issifu

Static site published with GitHub Pages at **https://ndeogobernard.github.io/ndeogo/**.
No build step, no dependencies: what is in this repo is what is served.

---

## Layout

```
index.html                     Homepage — sidebar plus one tab per project category
404.html                       Shown for any URL that does not exist (self-contained by design)
projects/<slug>.html           One page per project
assets/css/site.css            Homepage styles
assets/css/project.css         Styles shared by ALL project pages
assets/js/site.js              Homepage behaviour (tabs, theme toggle, local clock)
assets/js/project.js           Project-page behaviour (section nav, lightbox)
assets/js/visualization-lightbox.js   Extra lightbox for linked full-size visualization images
assets/<slug>.jpg              Project cover image (also used for link previews)
assets/visualizations/<slug>/  Full-size maps and figures for a project
documentation/                 Project PDFs
tools/check_site.py            Site integrity checker — run before pushing
tools/stamp_assets.py          Re-stamps CSS/JS links after you edit them
.github/workflows/check-site.yml   Runs the checker automatically on every push
```

**The stylesheets are shared on purpose.** Every project page used to carry its own
identical copy of a 24 KB `<style>` block, so a single design tweak meant editing 19
files and they drifted apart. Edit `assets/css/project.css` once and every project page
changes. Do not paste CSS back into an individual page — `check_site.py` will flag it.

---

## Before you push: run the checker

```bash
python tools/check_site.py
```

It fails the build on anything that would embarrass the live site:

- links, images or PDFs pointing at files that do not exist
- `#anchor` links with no matching element on the page
- leftover template text (`your-map-1.jpg`, "Describe the challenge", …)
- missing `<title>` or link-preview metadata
- CSS or JS creeping back into individual pages
- a project page missing from `sitemap.xml`, or listed there after being deleted
- a "Jump to" nav item that leaves the site instead of scrolling within the page
- a stale `?v=` asset stamp that would serve visitors a cached stylesheet

To also verify that outbound links still resolve — ArcGIS items get deleted or
re-shared, and that is how the Oklahoma map link silently broke:

```bash
python tools/check_site.py --external
```

That pass also reports any `View on GitHub` link pointing at an **empty repository**,
and detects the ArcGIS failure mode where a deleted item still answers HTTP 200 with
"Item does not exist or is inaccessible" in the page body.

The same external check runs automatically every Monday via GitHub Actions, so a map
that stops being publicly shared shows up as a failed run rather than as a dead link a
recruiter finds first.

### After editing any CSS or JS

```bash
python tools/stamp_assets.py
```

Browsers cache `assets/css/site.css` by filename, so after a style change a
returning visitor can render the **old** stylesheet against the **new** markup.
This appends `?v=<hash of the file>` to each asset link, so the URL changes
whenever the file does and the browser is forced to refetch it. `check_site.py`
fails the build when a stamp is out of date, so forgetting is caught before it
ships.

Inline `<svg>` icons also carry explicit `width="16" height="16"`. CSS still
sizes them, but if the stylesheet is stale, blocked or still loading, the icons
stay 16px instead of expanding to fill the sidebar.

### Previewing locally

```bash
python -m http.server 8899
```

Then open <http://localhost:8899/>. Opening the HTML files directly with `file://`
works too, but relative paths and the theme toggle behave better over HTTP.

---

## Adding a new project

1. **Copy an existing, finished page** that matches the shape of what you are adding —
   `projects/gis-land-use.html` is a good general starting point, and
   `projects/map-tennessee-ev.html` is the one to copy if the project has a gallery of
   full-size visualizations.

2. **Rename it** to `projects/<slug>.html`, using the existing prefix convention:

   | Prefix   | Tab                               | Panel id           |
   |----------|-----------------------------------|--------------------|
   | `gis-`   | Automation                        | `tab-automation`   |
   | `map-`   | Web Applications                  | `tab-webapps`      |
   | `ds-`    | Spatial Analysis                  | `tab-analysis`     |
   | `db-`    | Geodatabase Design & SQL          | `tab-geodatabase`  |
   | `carto-` | Cartography                       | `tab-cartography`  |

3. **Edit the page contents:** `<title>`, the `description` meta, the canonical and
   `og:`/`twitter:` URLs and image, the `<h1>`, the summary, the role/context strip, and
   the Challenge / Solution / Method / Outcome sections.

4. **Add a cover image** at `assets/<slug>.jpg`. It doubles as the link preview when the
   page is shared, so keep it readable at small sizes.

5. **Add the card to `index.html`** inside the matching `<div class="tab-panel">` from
   the table above — copy a neighbouring card and change the `href`, image, title and
   one-line description. The card title must match the page's `<h1>` exactly;
   `check_site.py` enforces this.

   A card is an `<article>`, not an `<a>`, because anchors cannot nest and each card
   carries its own direct links. The title link is stretched over the whole card with
   `.card-main-link::after`, so clicking anywhere still opens the write-up, and the
   `.card-links` row sits above it on `z-index`. Give each card up to three:

   ```html
   <div class="card-links">
     <a class="card-link" href="https://storymaps.arcgis.com/stories/…" target="_blank" rel="noreferrer">…StoryMap</a>
     <a class="card-link" href="https://github.com/ndeogobernard/…" target="_blank" rel="noreferrer">…GitHub</a>
     <a class="card-link" href="documentation/<slug>-documentation.md.pdf" target="_blank">…Report</a>
   </div>
   ```

   Label the first one **StoryMap** for a `storymaps.arcgis.com` narrative and **Live
   Map** for an `experience.arcgis.com` web app. Omit any link that does not exist —
   a dead or empty destination is worse than no button.

6. **Add the page to `sitemap.xml`.**

7. **Run `python tools/check_site.py`** and fix anything it reports.

### If a section does not apply

Delete the whole `<div class="section-block" id="…">` **and** its matching
`<a class="snav-item" href="#…">` entry in the right-hand "Jump to" nav. Leaving one
without the other produces a nav link that scrolls nowhere — the checker catches this.

Never leave placeholder text on a live page. If a project is not written yet, remove its
card from `index.html` until it is.

---

## Cartography: adding maps to the gallery

Cartography cards do not open a project page. Clicking one opens a full-screen
map viewer, so the maps themselves are the content.

1. **Put the exports in** `assets/visualizations/carto-<slug>/`, e.g.
   `assets/visualizations/carto-ohio-demographics/ohio-pop-change-2000-2020.jpg`.
   Export at the size you want people to actually read — the viewer shows them up
   to 82% of screen height, so roughly 1600px on the long edge is a good target.
   Anything under about 1200px will look soft full-screen.

2. **List them in that card's `<template class="card-maps">`** in `index.html`,
   one line per map, in the order they should be paged through:

   ```html
   <template class="card-maps">
     <a href="assets/visualizations/carto-ohio-demographics/pop-change.jpg"
        data-caption="Population change by county, 2000–2020"></a>
     <a href="assets/visualizations/carto-ohio-demographics/median-age.jpg"
        data-caption="Median age shift, 2000–2020"></a>
   </template>
   ```

   The `data-caption` shows under the map. With more than one map the viewer
   adds prev/next arrows, arrow-key paging and an "n of N" counter
   automatically — there is nothing else to switch on.

3. **Run `python tools/check_site.py`.** It fails if a listed map file is
   missing, and fails if a gallery card has no maps at all (a card that opens an
   empty viewer looks broken).

Each card currently lists its existing cover image as a single map. Replace
those entries as the real exports land.

To make a card behave this way, give the `<article>` the class
`is-gallery`, make the title a `<button class="card-main-link" type="button">`
instead of a link, and add the template. The viewer itself is shared —
`#lightbox` in `index.html`, driven from `assets/js/site.js`.

---

## Conventions worth keeping

- **One name.** The site, the resume PDF and the ArcGIS StoryMap bylines should all read
  *Bernard Issifu*. Mismatched names across a portfolio read as carelessness.
- **Only link to repositories that contain code.** A "View on GitHub" button that opens
  an empty repository is worse than no button.
- **Cover images** live at `assets/<slug>.jpg` and match the page slug exactly.
- **Theme:** the no-flash theme script in each `<head>` must stay inline — moving it to
  an external file makes the page flash white before switching to dark.
