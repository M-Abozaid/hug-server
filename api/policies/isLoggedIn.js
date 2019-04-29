module.exports = async function (req, res, proceed) {


  if(!req.headers.id){
    return res.sendStatus(401);

  }
  if(req.headers.id ){

    req.user = await sails.models.user.findOne({id:req.headers.id});


    return proceed();
  }

  if(  req.isAuthenticated() || req.isSocket){
    return proceed();

  }

  return res.sendStatus(401);
};
