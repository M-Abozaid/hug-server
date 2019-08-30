const jwt = require('jsonwebtoken');

module.exports = function (req, res, proceed) {


  if (!req.headers['x-access-token'] && !req.query.token) {return res.status(401).json({error: "Unauthorized"});}
  jwt.verify(req.headers['x-access-token'] || req.query.token, sails.config.globals.APP_SECRET, (err, decoded) => {
    if (err) {
      console.error('error ', err);
      return res.status(401).json({error: "Unauthorized"});
    }

    req.user = decoded;
    return proceed();
  });


};
