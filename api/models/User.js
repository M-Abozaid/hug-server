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
    },
    lastName: {
      type: 'string',
    },
    role: {
      type:'string',
      isIn: ['doctor', 'nurse', 'admin'],
      required: true
    },


    // Add a reference to Consultation
    consultations: {
      collection: 'consultation',
      via: 'owner'
    }
  },


  customToJSON: function() {
    return _.omit(this, ['password']);
  },

  beforeCreate: async function(user, cb){
    try {

      let existing = await User.findOne({email:user.email});
      if(existing){
        return cb({
          message:'Email already used '
        });
      }

    } catch (error) {
      console.log('error ', error);
      return cb(error);
    }

  }
};
