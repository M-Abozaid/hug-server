/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const bcrypt = require('bcrypt');

module.exports = {
  attributes: {
    username: {
      type: 'string'
    },
    email: {
      type: 'string',
      isEmail: true,
      required: false,
    },
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    role: {
      type: 'string',
      isIn: ['doctor', 'nurse', 'admin', 'patient'],
      required: true
    },
    password: {
      type: 'string'
    },
    smsVerificationCode: {
      type: 'string'
    },
    temporaryAccount: {
      type: 'boolean'
    },
    inviteToken: {
      model: 'PublicInvite',
      required: false
    },
    phoneNumber: {
      type: 'string'
    },
    authPhoneNumber: {
      type: 'string'
    },
    // Add a reference to Consultation
    consultations: {
      collection: 'consultation',
      via: 'owner'
    },
    allowedQueues:{
      // columnType: 'array',
      collection:'queue'
    }
  },

  customToJSON() {
    return _.omit(this, ['password', 'smsVerificationCode'])
  },
  beforeCreate: async function (user, cb) {
    try {
      // if(user.role === 'nurse') {return cb();}
      if (!user.password) {
        return cb();
      }
      let existing = await User.findOne({ email: user.email });
      if (existing) {
        return cb({
          message: 'Email already used '
        });
      }
      bcrypt.genSalt(10, (err, salt) => {
        if (err) { return cb(err); }
        bcrypt.hash(user.password, salt, (err, hash) => {
          if (err) { return cb(err); }
          user.password = hash;
          return cb();
        });
      });
    } catch (error) {
      console.log('error ', error);
      return cb(error);
    }

  }

}
