const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const {
  getAllConflicts,
  getConflictById,
  updateConflictStatus,
} = require('./conflict.controller');

router.use(requireAuth);

router.get('/', getAllConflicts);
router.get('/:id', getConflictById);
router.patch('/:id/status', updateConflictStatus);

module.exports = router;
