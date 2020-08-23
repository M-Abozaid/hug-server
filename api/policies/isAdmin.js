module.exports = function (req, res, proceed) {



  const parseBlueprintOptions = req.options.parseBlueprintOptions
  || req._sails.config.blueprints.parseBlueprintOptions
  || req._sails.hooks.blueprints.parseBlueprintOptions;
  const queryOptions = parseBlueprintOptions(req);
  console.log('query opetions ', queryOptions);

  req.query.where = '{"role":"patient"}';


  if (req.user && req.user.role === 'admin') {
    return proceed();

  }
  return res.forbidden();


};
