module.exports = async function (req, res, proceed) {

  let consultationId = (req.body? req.body.consultation: null) || req.params.consultation;
  if(req.query.where){
    try{
      consultationId = JSON.parse(req.query.where).consultation;
    }catch(err){

    }
  }


  let consultation = await sails.models.consultation.count({
    id:consultationId,
    or:[
      {owner: req.headers.id , _id: consultationId},
      {acceptedBy: req.headers.id , _id: consultationId},
      {acceptedBy: null}
    ]});

  if(!consultation){

    return res.forbidden();
  }

  return proceed();
};
