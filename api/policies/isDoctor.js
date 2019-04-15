module.exports = async function (req, res, proceed) {


  let user = await sails.models.user.count({_id:req.headers.id , role:'doctor'});
  if(!user){
  // set role for newly created users
    return res.forbidden();
  }


  return proceed();
};
