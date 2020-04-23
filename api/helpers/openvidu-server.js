const {
  OpenVidu
} = require('openvidu-node-client');

// const servers = [
//   {
//     url:'https://localhost:4443',
//     password:'MY_SECRET',
//     maxNumberOfSessions: 1
//   },
//   {
//     url:'https://openvidu.oniabsis.com:443',
//     password:'testtest',
//     maxNumberOfSessions: 2
//   }
// ]

const fallbackOpenvidu = {
  url:sails.config.OPENVIDU_URL,
  password: sails.config.OPENVIDU_SECRET
}


module.exports = {


  friendlyName: 'Openvidu server',


  description: '',


  inputs: {

  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs, exits) {
    // TODO



    const servers = await OpenviduServer.find();

    const serversStatues =  await  Promise.all(servers.map(server=>{
      const openvidu = new OpenVidu(server.url, server.password);
      return openvidu.fetch().then(change=>{
        console.log('change ', openvidu.activeSessions)
        server.activeSessions = openvidu.activeSessions.length
        return server
      })
    }))


    const availableServers = serversStatues.filter(server=>{
      return server.activeSessions < server.maxNumberOfSessions
    })

    if(!availableServers.length){
      return exits.success([fallbackOpenvidu])
    }

    exits.success(availableServers)


  }


};

