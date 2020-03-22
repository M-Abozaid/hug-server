module.exports = function (req, res, proceed) {

  req.body.invitedBy = req.user.id;
  return proceed();
};
