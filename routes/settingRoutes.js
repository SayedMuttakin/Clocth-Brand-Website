const express = require('express');
const settingController = require('../controllers/settingController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// All setting routes are protected and only accessible by admins
router.use(adminController.protect);

router.route('/')
  .get(settingController.getAllSettings);

router.route('/:key')
  .get(settingController.getSettingByKey)
  .patch(settingController.updateSetting);

module.exports = router;
