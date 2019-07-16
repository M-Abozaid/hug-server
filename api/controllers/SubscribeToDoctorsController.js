/**
 * SubscribeToDoctorsController
 *
 * @description ::  subscribe doctor users to a doctors  room .
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



module.exports = {

  async subscribe (req, res) {
    if (!req.isSocket) {
      return res.badRequest();
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) {return res.forbidden();}
    if (user.role !== 'doctor') {
      return res.forbidden();
    }

    sails.sockets.join(req, 'doctors', (err) => {
      if (err) {
        return res.serverError(err);
      }

      res.status(200);
      return res.json({
        message: 'Subscribed to doctors!'
      });
    });
  }

};

