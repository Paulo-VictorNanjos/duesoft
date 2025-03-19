const express = require('express');
const router = express.Router();
const RewardController = require('../controllers/RewardController');
const { isAuthenticated } = require('../middleware/auth');

// Rota para processar recompensas
router.post('/process/:type', isAuthenticated, RewardController.processReward);

module.exports = router; 