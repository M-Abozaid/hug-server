/**
 * Consultation.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const ObjectId = require('mongodb').ObjectID;


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
    type: {
      type: 'string',
      isIn: ['PATIENT', 'GUEST', 'TRANSLATOR']
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
    translator: {
      model: 'user',
      required: false
    },
    guest: {
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
    scheduledFor: {
      type: 'number'
    }
  },

  async beforeCreate (consultation, cb) {

    if (!consultation.queue && !consultation.invitedBy && process.env.DEFAULT_QUEUE_ID) {
      const defaultQueue = await Queue.findOne({ id: process.env.DEFAULT_QUEUE_ID });
      consultation.flagPatientOnline = true;
      if (defaultQueue) {
        console.log('Assigning the default queue to the consultation as no queue is set');
        consultation.queue = defaultQueue.id;
      }
    }
    cb();
  },


  async afterCreate (consultation, proceed) {

    await Consultation.broadcastNewConsultation(consultation);
    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'patientOnline',
      { data: consultation });
    return proceed();
  },


  async beforeDestroy (criteria, proceed) {
    console.log('DELETE CONSULTATION', criteria);
    const consultation = await Consultation.findOne({ _id: criteria.where.id });
    await Message.destroy({ consultation: criteria.where.id });
    if (consultation.invitationToken) {
      await PublicInvite.updateOne({ inviteToken: consultation.invitationToken }).set({ status: 'SENT' });
    }

    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'consultationCanceled',
      { event: 'consultationCanceled', data: { _id: criteria.where.id, consultation: criteria.where } });
    return proceed();
  },

  async broadcastNewConsultation (consultation) {
    const nurse = await User.findOne({ id: consultation.owner });
    const translator = await User.findOne({ id: consultation.translator });
    const queue = await Queue.findOne({ id: consultation.queue });
    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'newConsultation',
      { event: 'newConsultation', data: { _id: consultation.id, unreadCount: 0, consultation, nurse, queue, translator } });
    if (translator) {
      sails.sockets.broadcast(translator.id, 'newConsultation',
          { event: 'newConsultation', data: { _id: consultation.id, unreadCount: 0, consultation, nurse, translator } });
    }

  },
  getConsultationParticipants (consultation) {
    const consultationParticipants = [consultation.owner];
    if (consultation.translator) {
      consultationParticipants.push(consultation.translator);
    }
    if (consultation.acceptedBy) {
      consultationParticipants.push(consultation.acceptedBy);
    }
    if (consultation.guest) {
      consultationParticipants.push(consultation.guest);
    }

    return consultationParticipants;
  },

  async saveAnonymousDetails (consultation) {

    // consultation = await Consultation.findOne({id:'5e81e3838475f6352ef40aec'})
    const anonymousConsultation = {

      consultationId: consultation.id,
      IMADTeam: consultation.IMADTeam,
      acceptedAt: consultation.acceptedAt,
      closedAt: consultation.closedAt || Date.now(),
      consultationCreatedAt: consultation.createdAt,
      queue: consultation.queue,
      owner: consultation.owner,
      acceptedBy: consultation.acceptedBy,

      patientRating: consultation.patientRating,
      patientComment: consultation.patientComment,
      doctorRating: consultation.doctorRating,
      doctorComment: consultation.doctorComment

    };
    if (consultation.invite) {

      try {

        const invite = await PublicInvite.findOne({ id: consultation.invite });
        if (invite) {
          anonymousConsultation.inviteScheduledFor = invite.scheduledFor;
          anonymousConsultation.invitedBy = invite.invitedBy;
          anonymousConsultation.inviteCreatedAt = invite.createdAt;
        }
      } catch (error) {
        console.log('Error finding invite ', error);

      }
    }

    try {

      const doctorTextMessagesCount = await Message.count({ from: consultation.acceptedBy, consultation: consultation.id, type: 'text' });
      const patientTextMessagesCount = await Message.count({ from: consultation.owner, consultation: consultation.id, type: 'text' });
      const missedCallsCount = await Message.count({ consultation: consultation.id, type: { in: ['videoCall', 'audioCall'] }, acceptedAt: 0 });
      const successfulCalls = await Message.find({ consultation: consultation.id, type: { in: ['videoCall', 'audioCall'] }, acceptedAt: { '!=': 0 }, closedAt: { '!=': 0 } });
      const successfulCallsCount = await Message.count({ consultation: consultation.id, type: { in: ['videoCall', 'audioCall'] }, acceptedAt: { '!=': 0 } });

      const callDurations = successfulCalls.map(c => c.closedAt - c.acceptedAt);
      const sum = callDurations.reduce((a, b) => a + b, 0);
      const averageCallDurationMs = (sum / callDurations.length) || 0;
      const averageCallDuration = averageCallDurationMs / 60000;


      anonymousConsultation.doctorTextMessagesCount = doctorTextMessagesCount;
      anonymousConsultation.patientTextMessagesCount = patientTextMessagesCount;
      anonymousConsultation.missedCallsCount = missedCallsCount;
      anonymousConsultation.successfulCallsCount = successfulCallsCount;
      anonymousConsultation.averageCallDuration = averageCallDuration;

      console.log('anonymous consultation ', anonymousConsultation);
    } catch (error) {

      console.log('Error counting messages ', error);
    }
    console.log('create anonymous ', anonymousConsultation);
    await AnonymousConsultation.create(anonymousConsultation);


  },
  sendConsultationClosed (consultation) {
    // emit consultation closed event with the consultation
    Consultation.getConsultationParticipants(consultation).forEach(participant => {

      sails.sockets.broadcast(participant, 'consultationClosed', {
        data: {
          consultation,
          _id: consultation.id
        }
      });
    });
  },
  async closeConsultation (consultation) {
    const db = Consultation.getDatastore().manager;

    const closedAt = new Date();


    try {

      await Consultation.saveAnonymousDetails(consultation);
    } catch (error) {
      console.error('Error Saving anonymous details ', error);
    }

    if (consultation.invitationToken) {
      try {
        const patientInvite = await PublicInvite.findOne({ inviteToken: consultation.invitationToken });
        await PublicInvite.destroyPatientInvite(patientInvite);

      } catch (error) {
        console.error('Error destroying Invite ', error);
      }
    }



    const messageCollection = db.collection('message');
    const consultationCollection = db.collection('consultation');
    try {


      const callMessages = await Message.find({ consultation: consultation.id, type: { in: ['videoCall', 'audioCall'] } });
      // const callMessages = await callMessagesCursor.toArray();
      // save info for stats
      try {

        await AnonymousCall.createEach(callMessages.map(m => {
          delete m.id;
          return m;
        }));
      } catch (error) {
        console.log('Error creating anonymous calls ', error);
      }

    } catch (error) {
      console.log('Error finding messages ', error);
    }
    if (!consultation.queue) {
      consultation.queue = null;
    }


    // mark consultation as closed and set closedAtISO for mongodb ttl
    const { result } = await consultationCollection.update({ _id: new ObjectId(consultation.id) }, {
      $set: {
        status: 'closed',
        closedAtISO: closedAt,
        closedAt: closedAt.getTime()
      }
    });



    // set consultationClosedAtISO for mongodb ttl index
    await messageCollection.update({ consultation: new ObjectId(consultation.id) }, {
      $set: {
        consultationClosedAtISO: closedAt,
        consultationClosedAt: closedAt.getTime()
      }
    }, { multi: true });




    consultation.status = 'closed';
    consultation.closedAtISO = closedAt;
    consultation.closedAt = closedAt.getTime();

    // emit consultation closed event with the consultation
    Consultation.sendConsultationClosed(consultation);
  }

};
