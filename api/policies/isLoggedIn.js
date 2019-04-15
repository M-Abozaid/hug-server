module.exports = async function (req, res, proceed) {


  if(!req.headers.id ){
  // set role for newly created users
    return res.forbidden();
  }


  return proceed();
};
