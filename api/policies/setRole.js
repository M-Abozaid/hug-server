module.exports = async function (req, res, proceed) {

  console.log('set role ');
  // set role for newly created users
  return proceed();

};
