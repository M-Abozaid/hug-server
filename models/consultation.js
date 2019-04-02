const mongoose = require('mongoose');
const { Schema } = mongoose;


const ConsultationSchema = new Schema({
  firstName: {
    required: true,
    type: String
  },
  lastName: {
    required: true,
    type: String
  },
  gender: {
    type: String, enum: ['male', 'female', 'other']
  },
  birthDate: {
    type: Date
  },
  IMADTeam: {
    type: Number
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Consultation', ConsultationSchema);