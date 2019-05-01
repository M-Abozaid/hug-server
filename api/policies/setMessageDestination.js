
module.exports = async function (req, res, proceed) {

  let consultation;
  if(req.user.role === sails.config.globals.ROLE_DOCTOR){
    consultation = await sails.models.consultation.findOne({
      or:[
        {status: 'pending' , id: req.body.consultation || req.params.consultation},
        {acceptedBy: req.user.id , id: req.body.consultation || req.params.consultation}
      ]});

  }
  if(req.user.role === sails.config.globals.ROLE_NURSE){
    consultation = await sails.models.consultation.findOne(
        {owner: req.user.id , _id: req.body.consultation || req.params.consultation}
    );

  }

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
