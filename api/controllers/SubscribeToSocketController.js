/**
 * SubscribeToSocketController
 *
 * @description :: subscribe users to a room with their id for socket communications.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


module.exports = {

  async subscribe(req, res) {
    if (!req.isSocket) {
      return res.badRequest();
    }

    let user = null;

    if (req.user.withoutAccount) {
      user = req.user;
    } else {
      user = await User.findOne({ id: req.user.id });
    }

    if (!user) {
      return res.forbidden();
    }

    sails.sockets.join(req, user.id, (err) => {
      if (err) {
        sails.log('error joining session ', err);
        return res.serverError(err);
      }

      return res.json({
        message: `Subscribed to a fun room called ${user.id}!`
      });
    });
  }

};

