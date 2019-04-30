/**
 * SubscribeToDoctorsController
 *
 * @description ::  subscribe doctor users to a doctors  room .
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



module.exports = {

  subscribe: async function(req, res){
    if (!req.isSocket) {
      return res.badRequest();
    }

    let user = await sails.models.user.findOne({id: req.user.id});
    if(!user) {return res.forbidden();}
    if(user.role !== 'doctor'){
      return res.forbidden();
    }

    sails.sockets.join(req, 'doctors', (err) => {
      if (err) {
        return res.serverError(err);
      }

      return res.json({
        message: 'Subscribed to doctors!'
      });
    });
  }

};

