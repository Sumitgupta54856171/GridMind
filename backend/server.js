require('dotenv').config();

// ── Env guard ─────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route modules
const authRoutes = require('./src/modules/auth/auth.routes');
const utilityRoutes = require('./src/modules/utilities/utility.routes');
const sourceRoutes = require('./src/modules/sources/source.routes');
const projectRoutes = require('./src/modules/projects/project.routes');
const analysisRoutes = require('./src/modules/analyses/analysis.routes');
const conflictRoutes = require('./src/modules/conflicts/conflict.routes');
const aiRoutes = require('./src/modules/ai/ai.routes');
const transportationRoutes = require('./src/modules/transportation/transportation.routes');
const dashboardRoutes = require('./src/modules/dashboard/dashboard.routes');

const app = express();

// ── Security & parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Routes ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gridmind-backend' }));
app.use('/api/auth', authRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/transportation', transportationRoutes);
app.use('/api/dashboard', dashboardRoutes);



// ── Error handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
});
