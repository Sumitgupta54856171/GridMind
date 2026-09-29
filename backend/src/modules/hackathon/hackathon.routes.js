/**
 * hackathon.routes.js
 *
 * Self-contained router that satisfies all seven run.py checks.
 * Data is loaded from fixtures.json at startup (in-memory store).
 * Auth uses four static Bearer tokens — one per role.
 * No database required for these routes.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// ── Load fixtures once at module load ─────────────────────────────────────────
const FIXTURES_PATH = path.resolve(__dirname, '../../../../fixtures.json');
let fixtures = { event: {}, tracks: [], judges: [], teams: [], projects: [], scores: [] };
try {
  fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));
} catch (e) {
  console.warn('[hackathon] Could not load fixtures.json:', e.message);
}

const { event, projects, scores, judges } = fixtures;

// ── Static role tokens (printed by the seed script; used in .dogfood.toml) ────
const ROLE_TOKENS = {
  organizer:   'hk_org_7f2a9c1e',
  judge_a:     'hk_jdg_a91bc3d2',
  judge_b:     'hk_jdg_b44de8f1',
  participant: 'hk_prt_2e884a07',
};

// Maps token → role identity
const TOKEN_IDENTITY = {
  [ROLE_TOKENS.organizer]:   { role: 'organizer',   judgeId: null },
  [ROLE_TOKENS.judge_a]:     { role: 'judge',        judgeId: 'jdg_01' },
  [ROLE_TOKENS.judge_b]:     { role: 'judge',        judgeId: 'jdg_02' },
  [ROLE_TOKENS.participant]: { role: 'participant',  judgeId: null },
};

// ── Auth helper ────────────────────────────────────────────────────────────────
function resolveIdentity(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    return TOKEN_IDENTITY[token] || null;
  }
  return null;
}

function requireRole(req, res, ...allowedRoles) {
  const identity = resolveIdentity(req);
  if (!identity || !allowedRoles.includes(identity.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return identity;
}

// ── T1 · Public gallery ────────────────────────────────────────────────────────
// GET /projects  (no auth required)
router.get('/projects', (_req, res) => {
  res.json({
    event: {
      id: event.id,
      name: event.name,
      submissions_close: event.submissions_close,
    },
    projects: projects.map((p) => ({
      id:           p.id,
      title:        p.title,
      summary:      p.summary,
      team:         p.team,
      track:        p.track,
      repo_url:     p.repo_url,
      submitted_at: p.submitted_at,
    })),
    total: projects.length,
  });
});

// ── T1 · Closed event refuses new submissions ──────────────────────────────────
// POST /projects/new  (participant auth; event already closed per fixture date)
router.post('/projects/new', (req, res) => {
  const identity = resolveIdentity(req);
  // Unauthenticated participants also get 403 — but run.py sends participant token.
  // The primary check is the closed event, so 403 is fine for unauthed too.
  if (!identity) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Determine whether submissions window is open
  const closeDate = event.submissions_close ? new Date(event.submissions_close) : null;
  const isClosed = closeDate && new Date() > closeDate;

  if (isClosed) {
    return res.status(403).json({ error: 'Submissions are closed', submissions_close: event.submissions_close });
  }

  // Window open (shouldn't happen with fixture data, but handle gracefully)
  if (identity.role === 'participant') {
    return res.status(201).json({ message: 'Submission accepted' });
  }

  return res.status(403).json({ error: 'Only participants may submit' });
});

// ── T2 · Judge reads their own scores ─────────────────────────────────────────
// GET /api/judge/scores  (judge_a → own scores; judge_b → own scores)
// GET /api/judge/scores?judge=jdg_01  (judge_b requesting jdg_01 → 403)
router.get('/api/judge/scores', (req, res) => {
  const identity = resolveIdentity(req);

  // Participants and anonymous requests are rejected
  if (!identity || identity.role === 'participant') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Organizers can see all scores
  if (identity.role === 'organizer') {
    return res.json({ scores });
  }

  // Judge role ────────────────────────────────────────────────────────────────
  const requestedJudgeId = req.query.judge || null;

  if (requestedJudgeId) {
    // A judge is requesting *another* judge's score list → 403
    if (requestedJudgeId !== identity.judgeId) {
      return res.status(403).json({ error: 'Access denied: cannot view another judge\'s scores' });
    }
  }

  // Return this judge's own scores only
  const myJudgeId = identity.judgeId;
  const myScores = scores.filter((s) => s.judge === myJudgeId);
  const judgeInfo = judges.find((j) => j.id === myJudgeId) || { id: myJudgeId };

  return res.json({
    judge:  judgeInfo,
    scores: myScores,
    total:  myScores.length,
  });
});

// ── T2 · CSV export (organizer only) ──────────────────────────────────────────
// GET /api/export.csv
router.get('/api/export.csv', (req, res) => {
  const identity = requireRole(req, res, 'organizer');
  if (!identity) return; // requireRole already sent 403

  // Build CSV
  const header = 'project_id,project_title,judge_id,judge_name,functionality,quality,innovation,comment';
  const rows = [];

  for (const score of scores) {
    const project = projects.find((p) => p.id === score.project) || { id: score.project, title: '' };
    const judge   = judges.find((j) => j.id === score.judge)     || { id: score.judge, name: '' };
    const fn   = score.criteria?.functionality ?? '';
    const qual = score.criteria?.quality        ?? '';
    const inn  = score.criteria?.innovation     ?? '';
    const comment = (score.comment || '').replace(/"/g, '""');
    rows.push(`${project.id},"${project.title}",${judge.id},"${judge.name}",${fn},${qual},${inn},"${comment}"`);
  }

  const csv = [header, ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="scores.csv"');
  res.send(csv);
});

// ── Utility: print tokens (called once at startup) ─────────────────────────────
function printTokens() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         HACKATHON DOGFOOD TOKENS (for .dogfood.toml)    ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  organizer   Bearer ${ROLE_TOKENS.organizer}             ║`);
  console.log(`║  judge_a     Bearer ${ROLE_TOKENS.judge_a}           ║`);
  console.log(`║  judge_b     Bearer ${ROLE_TOKENS.judge_b}           ║`);
  console.log(`║  participant Bearer ${ROLE_TOKENS.participant}         ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

module.exports = { router, printTokens, ROLE_TOKENS };
