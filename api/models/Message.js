/**
 * Message.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const schedule = require('node-schedule');
const RINGING_TIMEOUT = 5 * 60 * 1000;
const CALL_DURATION_TIMEOUT = 2 * 60 * 60 * 1000;
module.exports = {
  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    from: {
      model: 'user'
    },
    to: {
      model: 'user'
    },
    text: {
      type: 'string'
    },
    consultation: {
      model: 'consultation',
      required: true
    },
    read: {
      type: 'boolean'
      // default:false
    },
    type: {
      type: 'string',
      isIn: ['attachment', 'text', 'videoCall', 'audioCall']
    },
    mimeType: {
      type: 'string'
    },
    fileName: {
      type: 'string'
    },
    filePath: {
      type: 'string'
    },
    acceptedAt: {
      type: 'number'
    },
    closedAt: {
      type: 'number'
    },
    isConferenceCall: {
      type: 'boolean'
    },
    participants: {
      collection: 'user'
    },
    status: {
      type: 'string',
      isIn: ['ringing', 'ongoing', 'ended']
    },
    openViduURL: {
      type: 'string'
    }
  },
  CALL_DURATION_TIMEOUT,
  async endCall (message, consultation, reason) {
    console.log('End call');
    await Message.updateOne({
      id: message.id,
      consultation: consultation.id
    })
    .set({
      closedAt: new Date(),
      status: 'ended'
    });

    const consultationParticipants = Consultation.getConsultationParticipants(consultation);

    consultationParticipants.forEach(participant => {
      sails.sockets.broadcast(participant, 'endCall', {
        data: {
          reason,
          consultation,
          message
        }
      });
    });
  },
  async afterCreate (message, proceed) {

    const consultation = await Consultation.findOne({ id: message.consultation });


    sails.sockets.broadcast(message.to || consultation.queue || consultation.invitedBy, 'newMessage', { data: message });

    if (message.type === 'audioCall' || message.type === 'videoCall') {

      sails.sockets.broadcast(message.from, 'newMessage', { data: message });
      schedule.scheduleJob(new Date(Date.now() + RINGING_TIMEOUT), async () => {
        message = await Message.findOne({ id: message.id });
        if (message.status === 'ringing') {
          Message.endCall(message, consultation, 'RINGING_TIMEOUT');
        }
      });

      schedule.scheduleJob(new Date(Date.now() + CALL_DURATION_TIMEOUT), async () => {
        message = await Message.findOne({ id: message.id });
        if (message.status !== 'ended') {
          Message.endCall(message, consultation, 'DURATION_TIMEOUT');
        }
      });

    }

    return proceed();

  },

  async leaveCall(callMessage, user){
       // if conference remove them from participants
       if (callMessage.isConferenceCall) {

        if (!callMessage.participants.length || callMessage.status === 'ended') {

          return
        }

        await Message.removeFromCollection(callMessage.id, 'participants', user.id);
        // if this is the last participant end the call and destroy the session
        const isParticipant = callMessage.participants.find(p => p.id === user.id);

        if (user.role === 'doctor' && isParticipant) {
          await Message.endCall(callMessage, callMessage.consultation, 'DOCTOR_LEFT');

        } else
        // and set closed at
        if (callMessage.participants.length <= 2 && isParticipant) {
          await Message.endCall(callMessage, callMessage.consultation, 'MEMBERS_LEFT');

        }

        return
      }

      await Message.updateOne({
        _id:  callMessage.id,
        consultation: callMessage.consultation.id
      })
      .set({
        closedAt: new Date()
      });

      await Message.endCall(callMessage, callMessage.consultation, 'MEMBERS_LEFT');

      sails.sockets.broadcast(callMessage.consultation.acceptedBy, 'rejectCall', {
        data: {
          consultation: callMessage.consultation,
          callMessage
        }
      });

      sails.sockets.broadcast(callMessage.consultation.owner, 'rejectCall', {
        data: {
          consultation: callMessage.consultation,
          callMessage
        }
      });

  }


};
