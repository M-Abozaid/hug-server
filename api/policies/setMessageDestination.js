
module.exports = async function (req, res, proceed) {

  let consultation = await sails.models.consultation.findOne({
    or:[
      {owner: req.user.id , _id: req.body.consultation || req.params.consultation},
      {acceptedBy: req.user.id , _id: req.body.consultation || req.params.consultation}
    ]});

  if(!consultation){
    return res.forbidden();
  }

  req.body.from = req.user.id;
  // a doctor is sending the message
  if(consultation.acceptedBy === req.user.id && consultation.status !== 'pending'){
    req.body.to = consultation.owner;
  }
  // a nurse is sending the message
  else {
    req.body.to = consultation.acceptedBy;
  }

  return proceed();
};
