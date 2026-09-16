import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  shortCode: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  ip: String,
  userAgent: String,
  device: String,
  browser: String,
  referrer: String 
});

const Click = mongoose.model('Click', clickSchema);

export default Click;