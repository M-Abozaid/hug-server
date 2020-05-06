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

    try {
      const serversStatues =  await  Promise.all(servers.map(async server=>{
        try {
            const start = Date.now()
            const openvidu = new OpenVidu(server.url, server.password);
            console.log('getting server info ', server.url)
            await openvidu.fetch();
            console.log('got server info ', server.url, Date.now()- start)

            server.activeSessions = openvidu.activeSessions.length
            server.reachable = true
            return server

        } catch (error) {
          console.log(error)
          console.log('Server ', server.url, ' is Not reachable', Date.now()-start)
          return Promise.resolve({reachable:false})
        }

      }))




      const availableServers = serversStatues.filter(server=>{
        return (server.activeSessions < server.maxNumberOfSessions) && server.reachable
      })

      console.log('AVAILABLE SERVERS:: ', JSON.stringify(availableServers))
      if(!availableServers.length){
        return exits.success([fallbackOpenvidu])
      }

      exits.success(availableServers)
    } catch (error) {
      console.log('Error with getting openvidu server ',error)
    }
  }


};

