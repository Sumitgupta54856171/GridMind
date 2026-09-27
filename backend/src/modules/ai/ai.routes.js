const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const {
  getAIStatsAndConfig,
  updateAISettings,
  testAISample,
} = require('./ai.controller');

router.use(requireAuth);

router.get('/stats', getAIStatsAndConfig);
router.patch('/settings', updateAISettings);
router.post('/test', testAISample);

module.exports = router;
