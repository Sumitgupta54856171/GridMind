const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const {
  createAnalysisRun,
  getAllAnalyses,
  getAnalysisById,
  getAnalysisConflicts,
  deleteAnalysis,
} = require('./analysis.controller');

router.use(requireAuth);

router.post('/', createAnalysisRun);
router.get('/', getAllAnalyses);
router.get('/:id', getAnalysisById);
router.get('/:id/conflicts', getAnalysisConflicts);
router.delete('/:id', deleteAnalysis);

module.exports = router;
