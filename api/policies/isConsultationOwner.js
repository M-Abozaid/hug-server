module.exports = async function (req, res, proceed) {


  let consultation = await sails.models.consultation.count({
    or:[
      {owner: req.headers.id , _id: req.body.consultation || req.params.consultation},
      {acceptedBy: req.headers.id , _id: req.body.consultation || req.params.consultation}
    ]});

  if(!consultation){
  // set role for newly created users
    return res.forbidden();
  }

  return proceed();
};
