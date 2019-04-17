module.exports = async function (req, res, proceed) {


  // if(!req.headers.id ){
  // // set role for newly created users
  //   return res.forbidden();
  // }

  // if(  req.isAuthenticated() || req.isSocket){
  return proceed();

  // }

  // return res.sendStatus(401);
};
