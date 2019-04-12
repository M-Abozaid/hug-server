/**
 * Consultation.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    firstName: {
      type: 'string',
      required: true
    },
    lastName: {
      type: 'string',
      required: true
    },
    gender: {
      type: 'string', isIn: ['male', 'female', 'other'],
      required: true
    },
    birthDate: {
      type: 'string',
      required: true
    },
    IMADTeam: {
      type: 'number',
      required: true
    },
    accepted:{
      type: 'boolean'
    },
    acceptedBy:{
      model: 'user'
    },
    owner: {
      model: 'user'
    }

  },

  afterCreate: function (consultation, proceed) {

    sails.sockets.broadcast('doctors', {event:'newConsultation',data:consultation});
    return proceed();
  }
};
