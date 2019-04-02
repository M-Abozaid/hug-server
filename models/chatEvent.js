const mongoose = require('mongoose');
const { Schema } = mongoose;


const UserSchema = new Schema({
  from: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String, enum: ['text', 'audio']
  },
  text: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);