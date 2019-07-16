
module.exports = async function (req, res, proceed) {

  let consultation;
  const { user } = req;
  if (user.role === sails.config.globals.ROLE_DOCTOR) {
    // doctors can respond to pending consultation
    consultation = await Consultation.findOne({
      or: [
        { status: 'pending', id: req.body.consultation || req.params.consultation },
        { acceptedBy: user.id, id: req.body.consultation || req.params.consultation }
      ] });
  }

  if (user.role === sails.config.globals.ROLE_NURSE) {
    consultation = await Consultation.findOne(
        { owner: user.id, _id: req.body.consultation || req.params.consultation }
    );

  }

  if (!consultation) {
    return res.forbidden();
  }

  req.body.from = user.id;
  // a doctor is sending the message
  if (consultation.acceptedBy === user.id && consultation.status !== 'pending') {
    req.body.to = consultation.owner;
  }
  // a nurse is sending the message
  else {
    req.body.to = consultation.acceptedBy;
  }

  return proceed();
};
