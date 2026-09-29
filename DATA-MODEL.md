# DATA MODEL

## GridMind Application Collections (MongoDB)

### Users
```
_id, name, email, passwordHash, role (user|admin), aiPreferences, timestamps
```

### Utilities
```
_id, ownerId → User, name, serviceAreaText, serviceArea (GeoJSON), website, color, timestamps
```

### DataSources
```
_id, utilityId → Utility, name, sourceType (manual|pdf|web|api), url,
parserStatus (pending|running|completed|failed), rawContent, timestamps
```

### Projects
```
_id, utilityId → Utility, sourceId → DataSource, externalId,
name, description, projectType, status (planned|active|completed|unknown),
startDate, endDate, locationText, corridorName,
geometry (GeoJSON Point|LineString|Polygon|MultiPolygon|MultiLineString),
locationConfidence, extraction { method, confidence }, rawFields, timestamps
```

### AnalysisRuns
```
_id, utilityId → Utility, sourceId → DataSource, status, projectsFound,
conflictsDetected, aiModel, cost, timestamps
```

### Conflicts
```
_id, projectAId → Project, projectBId → Project, conflictType, severity,
overlapGeometry, aiSummary, resolved, timestamps
```

### AuditEvents
```
_id, userId → User, action, resourceType, resourceId, metadata, timestamps
```

---

## Hackathon Judging — In-Memory (fixtures.json)

The hackathon judging layer does **not** write to MongoDB. All data is loaded from `fixtures.json` at startup.

### fixtures.json shape

```json
{
  "event":    { "id", "name", "submissions_close" },
  "tracks":   [ { "id", "name" } ],
  "judges":   [ { "id", "name", "email", "tracks": ["trk_id"] } ],
  "teams":    [ { "id", "name", "members": ["email"] } ],
  "projects": [ { "id", "team", "track", "title", "summary", "repo_url", "submitted_at" } ],
  "scores":   [ { "judge", "project", "criteria": { "functionality", "quality", "innovation" }, "comment" } ]
}
```

All `id` fields are strings. All timestamps are ISO 8601 UTC.  
Some `scores` entries are intentionally missing (projects with 0, 1, or multiple reviews).  
There are duplicate project titles — `DupDetect` appears twice — and at least one judge with uniform scores.

### Role Tokens

| Role | Token | Access |
|------|-------|--------|
| organizer | `hk_org_7f2a9c1e` | All scores, CSV export |
| judge_a | `hk_jdg_a91bc3d2` | Own scores only (`jdg_01`) |
| judge_b | `hk_jdg_b44de8f1` | Own scores only (`jdg_02`) |
| participant | `hk_prt_2e884a07` | Gallery read only |

Tokens are sent as `Authorization: Bearer <token>`.

### API Responses

| Route | Response shape |
|-------|---------------|
| `GET /projects` | `{ event, projects[], total }` |
| `GET /api/judge/scores` (judge) | `{ judge, scores[], total }` |
| `GET /api/judge/scores` (organizer) | `{ scores[] }` |
| `GET /api/export.csv` | CSV: project_id, title, judge_id, judge_name, criteria cols, comment |
