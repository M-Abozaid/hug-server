module.exports = async function (req, res, proceed) {


  if(req.user && reqw.user.role === 'nurse'){
    return proceed();

  }
  return res.forbidden();


};
