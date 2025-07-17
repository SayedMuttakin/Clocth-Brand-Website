const Setting = require('../models/settingModel');

// Get all settings
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    res.status(200).json({
      status: 'success',
      results: settings.length,
      data: { settings },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update a setting by key
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value, description },
      { new: true, runValidators: true, upsert: true } // upsert: true creates if not found
    );

    if (!setting) {
      return res.status(404).json({ status: 'fail', message: 'Setting not found' });
    }

    // Emit a Socket.IO event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('settingsUpdated', { key: setting.key, value: setting.value });
    }

    res.status(200).json({
      status: 'success',
      data: { setting },
    });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
};

// Get a single setting by key
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });

    if (!setting) {
      return res.status(404).json({ status: 'fail', message: 'Setting not found' });
    }

    res.status(200).json({
      status: 'success',
      data: { setting },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
