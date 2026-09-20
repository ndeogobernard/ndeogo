#!/usr/bin/env python3
"""
Site integrity checker for the portfolio.

Catches, before anything reaches the live site:
  * internal links / images / PDFs that point at files which do not exist
  * leftover template placeholders (your-map-1.jpg, "Describe the challenge", ...)
  * project pages that are not linked from index.html (orphans)
  * duplicated <style>/<script> blocks creeping back into individual pages
  * missing or mismatched page metadata (title, description, Open Graph)

Usage:
    python tools/check_site.py              # fast, offline checks only
    python tools/check_site.py --external   # also verify outbound URLs resolve

Exit code is non-zero when any error is found, so CI can block the push.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import glob
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Text that means "this page was never finished".
PLACEHOLDERS = [
    r"your-map-\d",
    r"your-figure",
    r"your-report\.pdf",
    r"your-live-link\.com",
    r"storymaps\.arcgis\.com/your-link",
    r"Describe the challenge",
    r"What were you specifically asked to deliver",
    r"Describe your process",
    r"Name of Next Project",
    r"Caption for this map",
    r"Describe the map",
    r"lorem ipsum",
]

SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "data:", "#", "javascript:")

# Pages known to still contain template text, pending real write-ups.
# Placeholders on these are reported as warnings so CI stays actionable; on any
# OTHER page they are hard errors. Delete a line here once that page is written —
# if the placeholders are really gone the checker says so and the list shrinks.
KNOWN_UNFINISHED = {
    "projects/carto-crash-risk.html",
    "projects/carto-hazard-corridors.html",
    "projects/carto-ohio-demographics.html",
    "projects/db-pedestrian-assets.html",
    "projects/db-wildfire-postgis.html",
    "projects/ds-transit-access.html",
}


def _norm(rel: str) -> str:
    return rel.replace("\\", "/")


def strip_comments(html: str) -> str:
    """Remove HTML comments so commented-out examples are not treated as live."""
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


def pages() -> list[str]:
    out = ["index.html", "404.html"]
    out += sorted(glob.glob("projects/*.html"))
    return [p for p in out if os.path.exists(os.path.join(ROOT, p))]


def check_internal_refs(errors, warnings):
    for rel in pages():
        path = os.path.join(ROOT, rel)
        src = strip_comments(open(path, encoding="utf-8").read())
        base = os.path.dirname(path)

        for ref in sorted(set(re.findall(r'(?:src|href)="([^"]+)"', src))):
            if not ref or ref.startswith(SKIP_PREFIXES):
                continue
            target = ref.split("?")[0].split("#")[0]
            if not target:
                continue
            if target.startswith("/"):
                # Root-absolute: resolve against the published /ndeogo/ base.
                target = target.replace("/ndeogo/", "", 1).lstrip("/")
                resolved = os.path.join(ROOT, target)
            else:
                resolved = os.path.normpath(os.path.join(base, target))
            if not os.path.exists(resolved):
                if _norm(rel) in KNOWN_UNFINISHED and any(
                    re.search(pat, ref, re.I) for pat in PLACEHOLDERS
                ):
                    continue  # counted once, by check_placeholders
                errors.append(f"{rel}: broken reference -> {ref}")


def check_anchors(errors):
    """Every in-page #anchor must have a matching element id on that page."""
    for rel in pages():
        src = strip_comments(open(os.path.join(ROOT, rel), encoding="utf-8").read())
        ids = set(re.findall(r'\bid="([^"]+)"', src))
        for frag in sorted(set(re.findall(r'href="#([^"]+)"', src))):
            if frag and frag not in ids:
                errors.append(f"{rel}: link to #{frag}, but no element has that id")


def check_section_nav(errors):
    """The 'Jump to' nav must stay inside the page and address something real.

    Each item links to a fragment and names a tab in data-target. The href is
    the panel id (so the link still means something without JavaScript, and
    supports deep links like /#tab-analysis); data-target is the tab key the
    script switches to. Both must resolve.
    """
    for rel in pages():
        src = strip_comments(open(os.path.join(ROOT, rel), encoding="utf-8").read())
        ids = set(re.findall(r'\bid="([^"]+)"', src))
        # match the anchor whatever else is in its class list
        for tag in re.findall(r'<a\b[^>]*class="[^"]*\bsnav-item\b[^"]*"[^>]*>', src):
            href = re.search(r'href="([^"]*)"', tag)
            target = re.search(r'data-target="([^"]*)"', tag)
            if href and not href.group(1).startswith("#"):
                errors.append(
                    f"{rel}: section-nav item leaves the site -> {href.group(1)[:60]}"
                )
            if target and not ({target.group(1), "tab-" + target.group(1)} & ids):
                errors.append(
                    f'{rel}: section-nav data-target="{target.group(1)}" matches no '
                    f"element id or tab panel"
                )


def check_asset_stamps(errors):
    """CSS/JS links must carry a ?v= hash matching the file they point at."""
    try:
        import stamp_assets
    except ImportError:
        sys.path.insert(0, os.path.join(ROOT, "tools"))
        import stamp_assets

    stale = stamp_assets.stamp(write=False)
    for page in stale:
        errors.append(
            f"{page}: stale asset ?v= stamp - run 'python tools/stamp_assets.py' "
            f"(visitors would keep a cached stylesheet)"
        )


def check_card_titles_match(errors):
    """A homepage card must carry the same title as the page it opens.

    The title link lives inside the <h3>, so match the heading and read the
    href from within it - searching for the href first and then scanning
    forward pairs each card with the NEXT card's heading.
    """
    index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    pattern = re.compile(
        r'<h3 class="card-title">\s*<a[^>]*href="(projects/[^"]+\.html)"[^>]*>(.*?)</a>\s*</h3>',
        re.S,
    )
    seen = 0
    for m in pattern.finditer(index):
        seen += 1
        rel = m.group(1)
        card_title = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            errors.append(f"index.html: card links to {rel}, which does not exist")
            continue
        src = open(path, encoding="utf-8").read()
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", src, re.S)
        if not h1:
            errors.append(f"{rel}: no <h1>")
            continue
        page_title = re.sub(r"<[^>]+>", "", h1.group(1)).strip()
        if page_title != card_title:
            errors.append(
                f"{rel}: card says '{card_title}' but the page <h1> says '{page_title}'"
            )
    if seen == 0:
        errors.append("index.html: no project cards matched - has the card markup changed?")


def check_placeholders(errors, warnings):
    still_unfinished = set()
    for rel in pages():
        src = strip_comments(open(os.path.join(ROOT, rel), encoding="utf-8").read())
        hits = [pat for pat in PLACEHOLDERS if re.search(pat, src, re.I)]
        if not hits:
            continue
        if _norm(rel) in KNOWN_UNFINISHED:
            still_unfinished.add(_norm(rel))
            warnings.append(f"{rel}: still unwritten ({len(hits)} placeholder(s)) - linked from index.html")
        else:
            for pat in hits:
                errors.append(f"{rel}: unfinished template placeholder -> /{pat}/")

    for done in sorted(KNOWN_UNFINISHED - still_unfinished):
        warnings.append(f"{done}: no placeholders left - remove it from KNOWN_UNFINISHED in this script")


def check_orphans(warnings):
    index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    for rel in sorted(glob.glob("projects/*.html")):
        name = os.path.basename(rel)
        if name in index:
            continue
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        if 'name="robots" content="noindex"' in src:
            continue  # unlinked on purpose, and not indexed either
        warnings.append(f"{rel}: not linked from index.html (orphan page)")


def check_gallery_cards(errors):
    """A gallery card opens a map viewer, so it must actually have maps."""
    index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    for block in re.findall(
        r'<article class="project-card is-gallery">.*?</article>', index, re.S
    ):
        title = re.search(r'<h3 class="card-title">.*?>([^<]*)<', block, re.S)
        name = title.group(1).strip() if title else "(untitled)"
        tpl = re.search(r"<template class=\"card-maps\">(.*?)</template>", block, re.S)
        if not tpl or not re.search(r'href="[^"]+"', tpl.group(1)):
            errors.append(
                f"index.html: gallery card '{name}' has no maps in its "
                f"<template class=\"card-maps\">, so clicking it would do nothing"
            )


def check_inlined_assets(warnings):
    """The shared stylesheet is the whole point; flag pages that re-inline it."""
    for rel in pages():
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        if rel == "404.html":
            continue  # intentionally standalone
        for block in re.findall(r"<style[^>]*>(.*?)</style>", src, re.S):
            if len(block) > 2000:
                warnings.append(
                    f"{rel}: {len(block)} bytes of inline CSS "
                    f"(belongs in assets/css/, or it drifts out of sync)"
                )
        for block in re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", src, re.S):
            if len(block) > 1000:
                warnings.append(f"{rel}: {len(block)} bytes of inline JS (belongs in assets/js/)")


def check_metadata(errors, warnings):
    for rel in pages():
        src = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        if not re.search(r"<title>\s*\S", src):
            errors.append(f"{rel}: missing <title>")
        if not re.search(r'name="description"', src):
            warnings.append(f"{rel}: missing meta description")
        if rel != "404.html" and "og:title" not in src:
            warnings.append(f"{rel}: missing Open Graph tags (link previews will be blank)")


def check_sitemap(warnings):
    sm = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(sm):
        warnings.append("sitemap.xml: missing")
        return
    listed = set(re.findall(r"<loc>.*?/ndeogo/(.*?)</loc>", open(sm, encoding="utf-8").read()))
    listed.discard("")
    actual = {os.path.basename(p) for p in glob.glob("projects/*.html")}
    # pages deliberately kept out of the sitemap carry a noindex
    actual = {
        n for n in actual
        if 'name="robots" content="noindex"'
        not in open(os.path.join(ROOT, "projects", n), encoding="utf-8").read()
    }
    listed_projects = {u.split("/")[-1] for u in listed if u.startswith("projects/")}
    for missing in sorted(actual - listed_projects):
        warnings.append(f"sitemap.xml: does not list projects/{missing}")
    for stale in sorted(listed_projects - actual):
        warnings.append(f"sitemap.xml: lists projects/{stale}, which no longer exists")


def _check_github_repo_not_empty(url, where, warnings):
    """A 'View on GitHub' button opening an empty repo is worse than no button."""
    import json
    import urllib.request

    m = re.match(r"https://github\.com/([^/]+)/([^/?#]+)/?$", url)
    if not m:
        return
    owner, repo = m.group(1), m.group(2)
    api = f"https://api.github.com/repos/{owner}/{repo}"
    req = urllib.request.Request(api, headers={"User-Agent": "portfolio link checker"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
    except Exception:  # noqa: BLE001 - rate limits etc. should not fail the build
        return
    if data.get("size", 1) == 0:
        warnings.append(f"{where}: GitHub repo {owner}/{repo} is EMPTY -> {url}")


def check_external(errors, warnings):
    import urllib.request
    import urllib.error

    # preconnect/dns-prefetch point at an ORIGIN, not a fetchable page.
    preconnect = set()
    for rel in pages():
        src = strip_comments(open(os.path.join(ROOT, rel), encoding="utf-8").read())
        for tag in re.findall(r"<link\b[^>]*>", src):
            if re.search(r'rel="(?:preconnect|dns-prefetch)"', tag):
                m = re.search(r'href="(https?://[^"]+)"', tag)
                if m:
                    preconnect.add(m.group(1))

    urls = defaultdict(list)
    for rel in pages():
        src = strip_comments(open(os.path.join(ROOT, rel), encoding="utf-8").read())
        for u in re.findall(r'(?:src|href)="(https?://[^"]+)"', src):
            if u in preconnect:
                continue
            if _norm(rel) in KNOWN_UNFINISHED and any(
                re.search(pat, u, re.I) for pat in PLACEHOLDERS
            ):
                continue  # placeholder URL, already reported as unwritten
            urls[u].append(rel)

    print(f"  checking {len(urls)} external URLs...")
    for url, where in sorted(urls.items()):
        req = urllib.request.Request(
            url, headers={"User-Agent": "Mozilla/5.0 (portfolio link checker)"}
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                body = resp.read(200_000).decode("utf-8", "ignore")
                # ArcGIS returns HTTP 200 with an error message in the body.
                if "Item does not exist or is inaccessible" in body:
                    errors.append(f"{where[0]}: ArcGIS item missing -> {url}")
                _check_github_repo_not_empty(url, where[0], warnings)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403, 429, 999):
                # LinkedIn and similar answer 999/403 to any automated request.
                warnings.append(f"{where[0]}: blocked bot check (HTTP {e.code}), verify by hand -> {url}")
            else:
                errors.append(f"{where[0]}: HTTP {e.code} -> {url}")
        except Exception as e:  # noqa: BLE001 - network flakiness is a warning, not a failure
            warnings.append(f"{where[0]}: could not verify ({type(e).__name__}) -> {url}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--external", action="store_true", help="also verify outbound URLs")
    args = ap.parse_args()

    os.chdir(ROOT)
    errors: list[str] = []
    warnings: list[str] = []

    check_internal_refs(errors, warnings)
    check_anchors(errors)
    check_section_nav(errors)
    check_asset_stamps(errors)
    check_card_titles_match(errors)
    check_placeholders(errors, warnings)
    check_orphans(warnings)
    check_gallery_cards(errors)
    check_inlined_assets(warnings)
    check_metadata(errors, warnings)
    check_sitemap(warnings)
    if args.external:
        check_external(errors, warnings)

    for w in warnings:
        print(f"  warning  {w}")
    for e in errors:
        print(f"  ERROR    {e}")

    print()
    print(f"{len(errors)} error(s), {len(warnings)} warning(s) across {len(pages())} pages")
    if errors:
        print("Site check FAILED.")
        return 1
    print("Site check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
