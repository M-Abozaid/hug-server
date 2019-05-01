module.exports = async function (req, res, proceed) {

  let consultationId = (req.body? req.body.consultation: null) || req.params.consultation;
  if(req.query.where){
    try{
      consultationId = JSON.parse(req.query.where).consultation;
    }catch(err){
      res.send(err);
    }
  }
  let consultation;
  if(req.user.role === 'nurse'){

    consultation = await sails.models.consultation.count({
      id:consultationId,
      owner:req.user.id
    });

  }else if(req.user.role === 'doctor'){

    consultation = await sails.models.consultation.count({
      id:consultationId,
      or:[
        {acceptedBy: req.user.id , _id: consultationId},
        {acceptedBy: null}
      ]});

  }

  if(!consultation){

    return res.forbidden();
  }

  return proceed();
};
