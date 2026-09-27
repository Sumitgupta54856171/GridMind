const express = require('express');
const router = express.Router();
const requireAuth = require('../../middleware/auth');
const {
  getAllProjects,
  getProjectStats,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('./project.controller');

// All project routes require authentication
router.use(requireAuth);

router.get('/stats', getProjectStats);
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
