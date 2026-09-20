# Portfolio — Bernard Issifu

Static site published with GitHub Pages at **https://ndeogobernard.github.io/ndeogo/**.
No build step, no dependencies: what is in this repo is what is served.

---

## Layout

```
index.html                     The site. One level deep: sidebar plus one tab per category
404.html                       Shown for any URL that does not exist (self-contained by design)
projects/<slug>.html           Old per-project write-ups. Nothing links to these any
                               more and they are noindex; kept for reference only
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

## Adding a project

The site is **one level deep**. A card does not open a page — the three links on
it are the whole thing. Clicking the card itself does nothing, except on
Cartography where it opens the map viewer.

1. **Add a cover image** at `assets/<slug>.jpg`. It doubles as the link preview.

2. **Add a card** to the `card-grid` inside the matching tab panel:

   | Prefix   | Tab                       | Panel id           |
   |----------|---------------------------|--------------------|
   | `gis-`   | Automation                | `tab-automation`   |
   | `map-`   | Web Applications          | `tab-webapps`      |
   | `ds-`    | Spatial Analysis          | `tab-analysis`     |
   | `db-`    | Geodatabase Design & SQL  | `tab-geodatabase`  |
   | `carto-` | Cartography               | `tab-cartography`  |

   Copy a neighbouring card. The title is plain text inside the `<h3>` — do not
   wrap it in a link; `check_site.py` fails if you do.

3. **Give it its links.** This is the part that matters, because it is all a
   visitor gets:

   ```html
   <div class="card-links">
     <a class="card-link" href="https://storymaps.arcgis.com/stories/…" target="_blank" rel="noreferrer">…StoryMap</a>
     <a class="card-link" href="https://github.com/ndeogobernard/…" target="_blank" rel="noreferrer">…GitHub</a>
     <a class="card-link" href="documentation/<slug>.pdf" target="_blank">…Report</a>
   </div>
   ```

   Label the first **StoryMap** for a `storymaps.arcgis.com` narrative, or
   **Live Map** for an `experience.arcgis.com` app. Omit any link that does not
   exist — a dead destination is worse than no button.

4. **Run `python tools/check_site.py`.** It warns about a card with no links at
   all, since such a card looks like the others and does nothing.

## Cartography: the map gallery

The Cartography tab is not a list of projects. It is a wall of maps: **one card
per map**, the map itself as the thumbnail, and clicking a card opens that map
full screen. There is no project page behind these cards.

The other four tabs are unaffected — their cards still open project write-ups.

### Adding a map

1. **Put the export in** `assets/visualizations/<project-slug>/`. The maps shown
   today come from the DOT project folders, since those are maps drawn for those
   programmes; a map with no project of its own can live in its own folder.

   Export at the size you want people to read. The viewer shows maps up to 82% of
   screen height, so roughly 1600px on the long edge is a sensible floor —
   anything under about 1200px looks soft full screen.

2. **Add a card** to the `card-grid` inside `<div class="tab-panel"
   id="tab-cartography">`, copying a neighbour:

   ```html
   <article class="project-card is-gallery">
     <div class="card-img-wrap">
       <img alt="" loading="lazy" src="assets/visualizations/SLUG/FILE.png"/>
       <div class="card-placeholder ph-3" style="display:none;"></div>
     </div>
     <div class="card-body">
       <h3 class="card-title"><button class="card-main-link" type="button">Map title</button></h3>
       <p class="card-desc">Client · Programme</p>
     </div>
     <template class="card-maps">
       <a href="assets/visualizations/SLUG/FILE.png" data-caption="Map title — client"></a>
     </template>
   </article>
   ```

   The thumbnail and the template point at the same file: the card shows the map
   cropped to the card, the viewer shows it whole.

3. **Run `python tools/check_site.py`.** It fails if the file is missing, and
   fails if a gallery card has no map at all — a card that opens an empty viewer
   looks broken.

### Several maps on one card

List more than one `<a>` in the template and the viewer gains prev/next arrows,
arrow-key paging and an "n of N" counter automatically. Nothing else to enable.

### Why these cards are <article> and <button>

Anchors cannot nest, and the title link is stretched across the whole card so
clicking anywhere works. A gallery card does not navigate, so its title is a
`<button type="button">` rather than a link. The viewer is shared — `#lightbox`
in `index.html`, driven from `assets/js/site.js`.

## Conventions worth keeping

- **One name.** The site, the resume PDF and the ArcGIS StoryMap bylines should all read
  *Bernard Issifu*. Mismatched names across a portfolio read as carelessness.
- **Only link to repositories that contain code.** A "View on GitHub" button that opens
  an empty repository is worse than no button.
- **Cover images** live at `assets/<slug>.jpg` and match the page slug exactly.
- **Theme:** the no-flash theme script in each `<head>` must stay inline — moving it to
  an external file makes the page flash white before switching to dark.
