const { Router } = require('express');
const requireAuth = require('../../middleware/auth');
const {
  getAllSources,
  getSourceById,
  updateSource,
  deleteSource,
} = require('./source.controller');

const router = Router();

router.use(requireAuth);

router.get('/', getAllSources);
router.get('/:id', getSourceById);
router.patch('/:id', updateSource);
router.delete('/:id', deleteSource);

module.exports = router;
