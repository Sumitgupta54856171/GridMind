# JUDGING

## Team

- **Project**: GridMind — Multi-Utility Infrastructure Intelligence Platform + Hackathon Judging Layer
- **Track**: Developer tools / Open Data

## Claimed Tiers

| Tier | Status |
|------|--------|
| T1 | Claimed |
| T2 | Claimed |

## Score Normalisation

Scores use three criteria: `functionality`, `quality`, `innovation` (each 1–5).  
Per-project aggregate = mean across all submitted criterion scores for that project.  
Cross-judge normalisation is not performed server-side; the CSV export gives raw data for organisers to normalise externally.

## Assignment

Judges are assigned to tracks at fixture load time (`judge.tracks` array). The portal does not enforce track assignment on score reads — any judge can score any project — matching the loose convention of most hackathons.

## Role Matrix

| Action | organizer | judge | participant | anonymous |
|--------|-----------|-------|-------------|-----------|
| Browse gallery | ✅ | ✅ | ✅ | ✅ |
| Submit project | ❌ (closed) | ❌ | ❌ (closed) | ❌ |
| Read own scores | — | ✅ | — | — |
| Read peer scores | ✅ (all) | ❌ 403 | ❌ 403 | ❌ 403 |
| Export CSV | ✅ | ❌ 403 | ❌ 403 | ❌ 403 |

## Known Gaps / Honest Limits

- Score submission (POST) is not implemented — the fixture scores are read-only.
- The hackathon layer is in-memory only; a server restart resets nothing (data comes from fixtures.json, not writes).
- The main GridMind `/api/projects` route is protected by JWT and is a separate concern from the public hackathon `/projects` gallery.
- FastAPI AI features (conflict analysis, extraction) require valid third-party API keys and are not part of the T1/T2 judging criteria.

## How to Run the Checker

```bash
# 1. Start the portal
docker compose up --build

# 2. Wait for "Backend running on http://localhost:3001" in logs
#    Tokens are also printed there for reference.

# 3. Run the checker (fixtures.json must be next to run.py)
python3 run.py .dogfood.toml > acceptance-report.txt

# 4. Read the report
cat acceptance-report.txt
```
