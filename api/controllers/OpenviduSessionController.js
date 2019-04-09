/**
 * OpenviduSessionController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { OpenVidu } = require('openvidu-node-client');
const openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
module.exports = {
  getToken: async function(req, res){

    const session = await openvidu.createSession(req.body);
    const token = await session.generateToken();
    res.json({ token, id: session.id });
  }

};

