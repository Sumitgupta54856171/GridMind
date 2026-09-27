const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const { getDashboardStats } = require('./dashboard.controller');

router.use(requireAuth);

router.get('/stats', getDashboardStats);

module.exports = router;
