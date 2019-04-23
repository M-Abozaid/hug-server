/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const bcrypt = require('bcrypt-nodejs');

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
    password: {
      type: 'string'
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
      if(user.role === 'nurse') {return cb();}
      if(!user.password) {
        return cb({
          message:'password is required '
        });
      }
      let existing = await User.findOne({email:user.email});
      if(existing){
        return cb({
          message:'Email already used '
        });
      }
      bcrypt.genSalt(10, (err, salt) => {
        if(err) {return cb(err);}
        bcrypt.hash(user.password, salt, null, (err, hash) => {
          if(err) {return cb(err);}
          user.password = hash;
          return cb();
        });
      });
    } catch (error) {
      console.log('error ', error);
      return cb(error);
    }

  }
};
