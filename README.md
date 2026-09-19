# Portfolio — Bernard Issifu

Static site published with GitHub Pages at **https://ndeogobernard.github.io/ndeogo/**.
No build step, no dependencies: what is in this repo is what is served.

---

## Layout

```
index.html                     Homepage — sidebar, project grid, experience/resume/interests tabs
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

   | Prefix   | Category                                  |
   |----------|-------------------------------------------|
   | `gis-`   | GIS Programming & Automation              |
   | `map-`   | Interactive Web Maps & Applications       |
   | `ds-`    | Geospatial Analysis, Data Science         |
   | `db-`    | Database Management & Spatial SQL         |
   | `carto-` | Cartography & Static Maps                 |

3. **Edit the page contents:** `<title>`, the `description` meta, the canonical and
   `og:`/`twitter:` URLs and image, the `<h1>`, the summary, the role/context strip, and
   the Challenge / Solution / Method / Outcome sections.

4. **Add a cover image** at `assets/<slug>.jpg`. It doubles as the link preview when the
   page is shared, so keep it readable at small sizes.

5. **Add the card to `index.html`** in the right category section — copy a neighbouring
   card and change the `href`, image, title and one-line description.

6. **Add the page to `sitemap.xml`.**

7. **Run `python tools/check_site.py`** and fix anything it reports.

### If a section does not apply

Delete the whole `<div class="section-block" id="…">` **and** its matching
`<a class="snav-item" href="#…">` entry in the right-hand "Jump to" nav. Leaving one
without the other produces a nav link that scrolls nowhere — the checker catches this.

Never leave placeholder text on a live page. If a project is not written yet, remove its
card from `index.html` until it is.

---

## Conventions worth keeping

- **One name.** The site, the resume PDF and the ArcGIS StoryMap bylines should all read
  *Bernard Issifu*. Mismatched names across a portfolio read as carelessness.
- **Only link to repositories that contain code.** A "View on GitHub" button that opens
  an empty repository is worse than no button.
- **Cover images** live at `assets/<slug>.jpg` and match the page slug exactly.
- **Theme:** the no-flash theme script in each `<head>` must stay inline — moving it to
  an external file makes the page flash white before switching to dark.
