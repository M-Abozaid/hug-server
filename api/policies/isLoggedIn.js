const jwt = require('jsonwebtoken');

module.exports = function (req, res, proceed) {


  if (!req.headers['x-access-token'] && !req.query.token) {return res.forbidden();}
  jwt.verify(req.headers['x-access-token'] || req.query.token, sails.config.globals.APP_SECRET, (err, decoded) => {
    if (err) {
      console.error('error ', err);
      return res.forbidden(401);
    }

    req.user = decoded;
    return proceed();
  });


};
