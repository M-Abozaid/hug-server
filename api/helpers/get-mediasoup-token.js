const axios = require('axios');
var Buffer = require('buffer/').Buffer
module.exports = {


  friendlyName: 'Get mediasoup token',


  description: '',


  inputs: {
    peerId: {
      type: 'string',
      required: true
    },
    roomId: {
      type: 'string',

      required: true
    },
    server: {
      type: {},
      required: true
    }
  },


  exits: {

    success: {
      outputFriendlyName: 'Mediasoup token',
    },

  },


  fn: async function (inputs, exists) {



    const response = await axios.post(
      inputs.server.url+'/session',
      {
        roomId:inputs.roomId,
        peerId: inputs.peerId
      },
      {
        headers: {
          'Authorization': 'Basic ' + Buffer(inputs.server.username+':' + inputs.server.password).toString('base64'),
          'Content-Type': 'application/json'
        }
      }
    );

    return inputs.server.url.replace(/^.+?\:/,'wss:') + `?token=${response.data.token}`

  }


};

