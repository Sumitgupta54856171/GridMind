#!/usr/bin/env python3
"""
run.py — DOGFOOD 2026 acceptance checker.

Usage:
    python3 run.py .dogfood.toml > acceptance-report.txt

Reads .dogfood.toml for portal config.
fixtures.json must live next to this script.
Standard library only.
"""

import sys
import json
import http.client
import urllib.parse
import tomllib
import pathlib
import datetime

SCRIPT_DIR = pathlib.Path(__file__).parent

# ── Load config ────────────────────────────────────────────────────────────────
if len(sys.argv) < 2:
    print("Usage: python3 run.py <path-to-.dogfood.toml>", file=sys.stderr)
    sys.exit(1)

toml_path = pathlib.Path(sys.argv[1])
with open(toml_path, "rb") as f:
    cfg = tomllib.load(f)

base_url   = cfg["portal"]["base_url"].rstrip("/")
claimed    = cfg["tiers"]["claimed"]
routes     = cfg["routes"]
auth       = cfg["auth"]

# ── Load fixtures ──────────────────────────────────────────────────────────────
fixtures_path = SCRIPT_DIR / "fixtures.json"
with open(fixtures_path) as f:
    fixtures = json.load(f)

known_title = fixtures["projects"][0]["title"]

# ── HTTP helper ────────────────────────────────────────────────────────────────
def request(method, url_str, headers=None, body=None):
    parsed = urllib.parse.urlparse(url_str)
    host   = parsed.hostname
    port   = parsed.port or (443 if parsed.scheme == "https" else 80)
    path   = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query

    conn_cls = http.client.HTTPSConnection if parsed.scheme == "https" else http.client.HTTPConnection
    conn = conn_cls(host, port, timeout=10)
    conn.request(method, path, body=body, headers=headers or {})
    resp = conn.getresponse()
    body_bytes = resp.read()
    conn.close()
    return resp.status, body_bytes.decode("utf-8", errors="replace")

def make_headers(role_key=None):
    h = {}
    if role_key:
        raw = auth[role_key]           # e.g. "Authorization: Bearer hk_..."
        k, _, v = raw.partition(": ")
        h[k] = v
    return h

# ── Results store ──────────────────────────────────────────────────────────────
results = []  # list of (tier, description, pass_bool, detail)

def check(tier, description, passed, detail=""):
    results.append((tier, description, passed, detail))

# ── Run checks ─────────────────────────────────────────────────────────────────

# T1-1 · gallery is public
try:
    url = base_url + routes["gallery"]
    status, body = request("GET", url, make_headers())
    ok = status == 200
    check("T1", "gallery is public",
          ok,
          f"GET {url}\n       no auth header\n       got {status}, wanted 200")
except Exception as e:
    check("T1", "gallery is public", False, str(e))

# T1-2 · project from fixtures shown
try:
    url = base_url + routes["gallery"]
    status, body = request("GET", url, make_headers())
    found = known_title in body
    check("T1", "project from fixtures shown",
          found,
          f"GET {url}\n       looking for title: '{known_title}'\n       found: {found}")
except Exception as e:
    check("T1", "project from fixtures shown", False, str(e))

# T1-3 · closed event refuses submissions
try:
    url = base_url + routes["submit"]
    status, body = request("POST", url, make_headers("participant"), body="{}")
    ok = 400 <= status <= 499
    check("T1", "closed event refuses submissions",
          ok,
          f"POST {url}\n       sent as participant\n       got {status}, wanted 4xx")
except Exception as e:
    check("T1", "closed event refuses submissions", False, str(e))

# T2-1 · judge sees own scores
try:
    url = base_url + routes["judge_scores"]
    status, body = request("GET", url, make_headers("judge_a"))
    ok = status == 200
    check("T2", "judge sees own scores",
          ok,
          f"GET {url}\n       sent as judge_a\n       got {status}, wanted 200")
except Exception as e:
    check("T2", "judge sees own scores", False, str(e))

# T2-2 · judge cannot see peer scores
try:
    url = base_url + routes["peer_scores"]
    status, body = request("GET", url, make_headers("judge_b"))
    ok = status in (401, 403)
    check("T2", "judge cannot see peer scores",
          ok,
          f"GET {url}\n       sent as judge_b; this is the url that returns judge_a's scores\n"
          f"       got {status}, wanted 401 or 403\n"
          + ("       the backend returned another judge's scores" if not ok else ""))
except Exception as e:
    check("T2", "judge cannot see peer scores", False, str(e))

# T2-3 · participant blocked
try:
    url = base_url + routes["judge_scores"]
    status, body = request("GET", url, make_headers("participant"))
    ok = status in (401, 403)
    check("T2", "participant blocked",
          ok,
          f"GET {url}\n       sent as participant\n       got {status}, wanted 401 or 403")
except Exception as e:
    check("T2", "participant blocked", False, str(e))

# T2-4 · csv export works
try:
    url = base_url + routes["csv_export"]
    status, body = request("GET", url, make_headers("organizer"))
    ok = status == 200 and ("," in body or "\n" in body)
    check("T2", "csv export works",
          ok,
          f"GET {url}\n       sent as organizer\n       got {status}, wanted 200 and a CSV body")
except Exception as e:
    check("T2", "csv export works", False, str(e))

# ── Print report ───────────────────────────────────────────────────────────────
timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
print(f"DOGFOOD 2026 acceptance report")
print(f"generated: {timestamp}")
print(f"portal:    {base_url}")
print(f"claimed:   {' '.join(claimed)}")
print(f"fixtures:  fixtures.json")
print()

tiers_passed = set()

for tier, desc, passed, detail in results:
    verdict = "PASS" if passed else "FAIL"
    label   = f"{tier}  {desc}"
    dots    = "." * max(1, 50 - len(label))
    print(f"{label} {dots} {verdict}")
    if not passed:
        for line in detail.strip().splitlines():
            print(f"       {line}")
    if passed:
        tiers_passed.add(tier)

# A tier is verified only when all its checks pass
tier_checks = {}
for tier, desc, passed, detail in results:
    tier_checks.setdefault(tier, []).append(passed)

verified_tiers = [t for t, checks in tier_checks.items() if all(checks)]

print()
claimed_str  = " ".join(claimed)
verified_str = " ".join(verified_tiers) if verified_tiers else "(none)"
print(f"claimed {claimed_str}, verified {verified_str}")

not_verified = [t for t in claimed if t not in verified_tiers]
if not_verified:
    print(f"note: claimed but not verified: {' '.join(not_verified)}")
