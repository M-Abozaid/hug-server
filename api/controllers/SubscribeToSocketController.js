/**
 * SubscribeToSocketController
 *
 * @description :: subscribe users to a room with their id for socket communications.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


module.exports = {

  subscribe: async function(req, res){
    if (!req.isSocket) {
      return res.badRequest();
    }

    let user = await sails.models.user.findOne({id: req.user.id});
    if(!user){
      return res.forbidden();
    }

    sails.sockets.join(req, user.id, (err) => {
      if (err) {
        console.log('error joining session ', err);
        return res.serverError(err);
      }

      return res.json({
        message: 'Subscribed to a fun room called '+user.id+'!'
      });
    });
  }

};

