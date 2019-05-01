const jwt = require('jsonwebtoken');

module.exports = async function (req, res, proceed) {



  if(!req.headers['x-access-token']) {return res.sendStatus(400);}
  jwt.verify(req.headers['x-access-token'], sails.config.globals.APP_SECRET, (err, decoded) => {
    if(err){
      console.log('error ', err);
      return res.sendStatus(400);
    }
    console.log(decoded); // bar
    req.user = decoded;
    return proceed();
  });


};
