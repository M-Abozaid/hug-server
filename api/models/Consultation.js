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
    status: {
      type: 'string',
      isIn: ['pending', 'active', 'closed'],
      // default:'pending',
      required: true
    },
    queue: {
      type: 'string',
      isIn: ['general', 'covid19'],
      default:'general',
      required: true
    },
    acceptedBy: {
      model: 'user'
    },
    owner: {
      model: 'user'
    },
    acceptedAt: {
      type: 'number'
    },
    closedAt: {
      type: 'number'
    }

  },

  async afterCreate (consultation, proceed) {

    const nurse = await User.findOne({ id: consultation.owner });

    sails.sockets.broadcast('doctors', 'newConsultation',
    { event: 'newConsultation', data: { _id: consultation.id, unreadCount: 0, consultation, nurse } });
    return proceed();
  },


  async beforeDestroy (criteria, proceed) {

    await Message.destroy({ consultation: criteria.where.id });


    sails.sockets.broadcast('doctors', 'consultationCanceled',
    { event: 'consultationCanceled', data: { _id: criteria.where.id, consultation: criteria.where } });
    return proceed();
  }

};
