/**
 * Message.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

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
    }
  },

  async afterCreate (message, proceed) {

    const consultation = await Consultation.findOne({id: message.consultation})
    sails.sockets.broadcast(message.to || consultation.queue || consultation.invitedBy, 'newMessage', { data: message });

    if (message.type === 'audioCall' || message.type === 'videoCall') {
      sails.sockets.broadcast(message.from, 'newMessage', { data: message });
    }

    return proceed();

  }
};
