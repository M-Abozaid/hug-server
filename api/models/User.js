/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    username: {
      type: 'string'
    },
    email: {
      type: 'string',
      isEmail: true
    },
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    role: {
      type: 'string',
      isIn: ['doctor', 'nurse', 'admin'],
      required: true
    },
    password: {
      type: 'string'
    },
    phoneNumber: {
      type: 'string'
    },
    // Add a reference to Consultation
    consultations: {
      collection: 'consultation',
      via: 'owner'
    }
  },

  customToJSON() {
    return _.omit(this, ['password'])
  }

}
