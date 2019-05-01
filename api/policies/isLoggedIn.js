const jwt = require('jsonwebtoken');

module.exports = async function (req, res, proceed) {



  if(!req.headers['x-access-token'] && !req.query.token) {return res.sendStatus(400);}
  jwt.verify(req.headers['x-access-token'] || req.query.token , sails.config.globals.APP_SECRET, (err, decoded) => {
    if(err){
      console.log('error ', err);
      return res.sendStatus(401);
    }

    req.user = decoded;
    return proceed();
  });


};
