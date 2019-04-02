const express = require('express');
const router = express.Router();// eslint-disable-line new-cap
const config = require('../config');
const { OpenVidu } = require('openvidu-node-client');
const openvidu = new OpenVidu(config.OPENVIDU_URL, config.OPENVIDU_SECRET);

/* GET home page. */
router.post('/session', async function (req, res, next) {
  const session = await openvidu.createSession(req.body);
  const token = await session.generateToken();
  res.json({ token, id: session.id });
});


module.exports = router;