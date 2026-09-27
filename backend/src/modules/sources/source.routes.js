const { Router } = require('express');
const requireAuth = require('../../middleware/auth');
const {
  getAllSources,
  getSourceById,
  updateSource,
  deleteSource,
  triggerSourceExtraction,
} = require('./source.controller');

const upload = require('../../middleware/upload');
const { createSourceForUtility } = require('./source.controller');

const router = Router();

router.use(requireAuth);

router.get('/', getAllSources);
router.post('/', upload.single('file'), (req, res, next) => {
  req.params.utilityId = req.body.utilityId;
  return createSourceForUtility(req, res, next);
});
router.get('/:id', getSourceById);
router.patch('/:id', updateSource);
router.delete('/:id', deleteSource);
router.post('/:id/extract', triggerSourceExtraction);

module.exports = router;


