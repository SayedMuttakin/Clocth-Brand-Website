const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'A setting must have a key'],
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can be any type (string, number, boolean, object, array)
    required: [true, 'A setting must have a value'],
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
