const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const { getImpactByConflict, listImpacts } = require('./transportation.controller');

router.use(requireAuth);

router.get('/conflict/:conflictId', getImpactByConflict);
router.get('/', listImpacts);

module.exports = router;
