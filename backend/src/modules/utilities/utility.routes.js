const { Router } = require('express');
const requireAuth = require('../../middleware/auth');
const {
  createUtility,
  getUtilities,
  getUtilityById,
  updateUtility,
  deleteUtility,
} = require('./utility.controller');
const {
  getSourcesByUtility,
  createSourceForUtility,
} = require('../sources/source.controller');

const router = Router();

router.use(requireAuth);

router.post('/', createUtility);
router.get('/', getUtilities);
router.get('/:id', getUtilityById);
router.patch('/:id', updateUtility);
router.delete('/:id', deleteUtility);

// Nested Source routes per Low-Level System Design § 11
router.get('/:utilityId/sources', getSourcesByUtility);
router.post('/:utilityId/sources', createSourceForUtility);

module.exports = router;

