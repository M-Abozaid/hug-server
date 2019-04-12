/**
 * SubscribeToDoctorsController
 *
 * @description ::  subscribe doctor users to a doctors  room .
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const ROLE_DOCTOR = 'doctor';
module.exports = {

  subscribe: async function(req, res){
    if (!req.isSocket) {
      return res.badRequest();
    }

    //

    let user = await sails.models.user.findOne({id: req.headers.id});
    if(user.role !== ROLE_DOCTOR){
      return res.forbidden();
    }

    sails.sockets.join(req, user.id, (err) => {
      if (err) {
        return res.serverError(err);
      }

      return res.json({
        message: 'Subscribed to a fun room called '+user.id+'!'
      });
    });
  }

};

