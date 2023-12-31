/**
 * AnonymousConsultation.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    IMADTeam: {
      type: 'string'
    },
    queue: {
      model: 'queue',
      required: false
    },
    acceptedBy: {
      model: 'user'
    },
    owner: {
      model: 'user',
      required: false
    },
    acceptedAt: {
      type: 'number'
    },
    closedAt: {
      type: 'number'
    },
    patientRating: {
      type: 'string',
      required: false
    },
    patientComment: {
      type: 'string',
      required: false
    },
    doctorRating: {
      type: 'string',
      required: false
    },
    doctorComment: {
      type: 'string',
      required: false
    },
    consultationCreatedAt:{
      type:'number'
    }
  },

};

