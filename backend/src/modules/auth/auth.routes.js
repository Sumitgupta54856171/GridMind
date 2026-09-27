const { Router } = require('express');
const requireAuth = require('../../middleware/auth');
const { register, login, getMe, logout } = require('./auth.controller');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

module.exports = router;
