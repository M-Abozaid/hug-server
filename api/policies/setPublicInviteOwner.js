module.exports = function (req, res, proceed) {


  req.body.owner = req.user.id;
  return proceed();
};
