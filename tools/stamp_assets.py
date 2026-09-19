#!/usr/bin/env python3
"""
Stamp every CSS/JS link with a short hash of that file's contents.

Browsers cache assets/css/site.css by filename. GitHub Pages serves it with
Cache-Control: max-age=600, so after a style change a returning visitor can
keep rendering the OLD stylesheet against the NEW markup - which is how the
sidebar icons once rendered full-width instead of 16px.

Appending ?v=<hash of the file> makes the URL change whenever the file
changes, so the browser is obliged to refetch it, and keeps caching it
normally when nothing changed.

Run this after editing anything in assets/css/ or assets/js/:

    python tools/stamp_assets.py

check_site.py fails the build if any stamp is out of date, so forgetting is
caught before it reaches the site.
"""

from __future__ import annotations

import glob
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ASSETS = [
    "assets/css/site.css",
    "assets/css/project.css",
    "assets/js/site.js",
    "assets/js/project.js",
    "assets/js/visualization-lightbox.js",
]


def content_hash(path: str) -> str:
    with open(os.path.join(ROOT, path), "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:8]


def current_versions() -> dict[str, str]:
    return {a: content_hash(a) for a in ASSETS if os.path.exists(os.path.join(ROOT, a))}


def html_pages() -> list[str]:
    return ["index.html"] + sorted(glob.glob("projects/*.html"))


def stamp(write: bool = True) -> list[str]:
    """Restamp every page. Returns the pages whose markup was (or is) stale."""
    os.chdir(ROOT)
    versions = current_versions()
    stale = []

    for page in html_pages():
        src = open(page, encoding="utf-8").read()
        out = src
        for asset, digest in versions.items():
            name = re.escape(os.path.basename(asset))
            pattern = r"((?:\.\./)?assets/(?:css|js)/" + name + r")(\?v=[0-9a-f]+)?"
            out = re.sub(pattern, lambda m: f"{m.group(1)}?v={digest}", out)
        if out != src:
            stale.append(page)
            if write:
                open(page, "w", encoding="utf-8", newline="\n").write(out)

    return stale


def main() -> int:
    stale = stamp(write=True)
    if stale:
        print(f"restamped {len(stale)} page(s):")
        for p in stale:
            print("   ", p)
    else:
        print("all asset stamps already current")
    for asset, digest in current_versions().items():
        print(f"  {asset} -> ?v={digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
