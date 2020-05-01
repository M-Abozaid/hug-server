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
      type: 'string', isIn: ['male', 'female', 'other', 'unknown'],
      required: true
    },
    birthDate: {
      type: 'string'
    },
    IMADTeam: {
      type: 'string',
      required: true
    },
    invitationToken: {
      type: 'string',
      required: false
    },
    status: {
      type: 'string',
      isIn: ['pending', 'active', 'closed'],
      // default:'pending',
      required: true
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
    // the doctor who sent the invite
    invitedBy: {
      model: 'user',
      required: false
    },
    invite: {
      model: 'PublicInvite',
      required: false
    },
    flagPatientOnline: {
      type: 'boolean',
      required: false
    },
  },

  async beforeCreate(consultation, cb) {

    if (!consultation.queue && !consultation.invitedBy && process.env.DEFAULT_QUEUE_ID) {
      const defaultQueue = await Queue.findOne({ id: process.env.DEFAULT_QUEUE_ID });
      if (defaultQueue) {
        console.log("Assigning the default queue to the consultation as no queue is set");
        consultation.queue = defaultQueue.id;
      }
    }
    cb();
  },


  async afterCreate(consultation, proceed) {

    const nurse = await User.findOne({ id: consultation.owner });
    const queue = await Queue.findOne({ id: consultation.queue })
    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'newConsultation',
      { event: 'newConsultation', data: { _id: consultation.id, unreadCount: 0, consultation, nurse, queue } });
    return proceed();
  },


  async beforeDestroy(criteria, proceed) {
    console.log("DELETE CONSULTATION", criteria);
    const consultation = await Consultation.findOne({ _id: criteria.where.id });
    await Message.destroy({ consultation: criteria.where.id });
    if (consultation.invitationToken) {
      await PublicInvite.updateOne({ inviteToken: consultation.invitationToken }).set({ status: 'SENT' });
    }

    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'consultationCanceled',
      { event: 'consultationCanceled', data: { _id: criteria.where.id, consultation: criteria.where } });
    return proceed();
  }

};
