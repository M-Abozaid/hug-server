/**
 * SubscribeToChatController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  subscribe: function(req, res){
    if (!req.isSocket) {
      return res.badRequest();
    }

    var roomName = req.param('roomName');
    sails.sockets.join(req, roomName, (err) => {
      if (err) {
        return res.serverError(err);
      }

      return res.json({
        message: 'Subscribed to a fun room called '+roomName+'!'
      });
    });
  }

};

