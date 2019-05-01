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
      type: 'string',
      required: true
    },
    status:{
      type: 'string',
      isIn: ['pending', 'active', 'closed', 'terminated'],
      // default:'pending',
      required: true
    },
    acceptedBy:{
      model: 'user'
    },
    owner: {
      model: 'user'
    },
    acceptedAt:{
      type:'number'
    },
    closedAt:{
      type:'number'
    }

  },

  afterCreate: async function (consultation, proceed) {

    let nurse = await sails.models.user.find({id:consultation.owner});

    sails.sockets.broadcast('doctors', 'newConsultation', {event:'newConsultation',data:{_id:consultation.id, unreadCount: 0, consultation, nurse}});
    return proceed();
  },


  beforeDestroy: async function (criteria, proceed) {

   await sails.models.message.destroy({consultation:criteria.where.id});


    sails.sockets.broadcast('doctors', 'consultationCanceled', {event:'consultationCanceled',data:{_id:criteria.where.id, consultation:criteria.where}});
    return proceed();
  },

};
