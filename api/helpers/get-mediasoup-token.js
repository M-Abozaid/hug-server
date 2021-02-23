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
  },


  exits: {

    success: {
      outputFriendlyName: 'Mediasoup token',
    },

  },


  fn: async function (inputs) {



    const response = await axios.post(
      process.env.MEDIASOUP_URL+'/session',
      {
        roomId:inputs.roomId,
        peerId: inputs.peerId
      },
      {
        headers: {
          'Authorization': 'Basic ' + Buffer(process.env.MEDIASOUP_USER+':' + process.env.MEDIASOUP_SECRET).toString('base64'),
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.token;
  }


};

