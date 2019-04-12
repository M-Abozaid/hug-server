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
      type: 'string',
      required: true
    },
    lastName: {
      type: 'string',
      required: true
    },
    role: {
      type:'string',
      isIn: ['doctor', 'nurse'],
      required: true
    },


    // Add a reference to Consultation
    consultations: {
      collection: 'consultation',
      via: 'owner'
    }
  }
};
