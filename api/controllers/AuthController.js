/**
 * AuthController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const passport = require('passport');
module.exports = {
  login: function(req, res, next) {
    passport.authenticate(['local', 'trusted-header'], (err, user, info) => {
      if((err) || (!user)) {
        return res.send({
          message: info.message,
          user
        });
      }
      req.logIn(user, (err) => {
        if(err) {return res.send(err);}
        return res.send({
          message: info.message,
          user
        });
      });
    })(req, res, next);
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  }
};
