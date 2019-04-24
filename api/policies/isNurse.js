module.exports = async function (req, res, proceed) {


  let user = await sails.models.user.count({_id:req.user.id , role:'nurse'});
  if(!user){

    return res.forbidden();
  }


  return proceed();
};
