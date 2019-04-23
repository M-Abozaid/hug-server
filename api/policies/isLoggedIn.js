module.exports = async function (req, res, proceed) {


  if(req.headers.id ){
  // set role for newly created users
    req.user = await sails.models.user.findOne({id:req.headers.id});


    return proceed();
  }

  if(  req.isAuthenticated() || req.isSocket){
    return proceed();

  }

  return res.sendStatus(401);
};
