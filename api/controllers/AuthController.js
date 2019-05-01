/**
 * AuthController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const passport = require('passport');
module.exports = {
  login: function(req, res, next) {
    if((req.body.email || req.body.password) && req.headers['x-ssl-client-s-dn']){
      return res.status(400).send({error:'Can\'t user two authentication methods '});
    }
    passport.authenticate(['local', 'trusted-header'], (err, user, info) => {
      if((err) || (!user)) {
        return res.send({
          message: info.message,
          user
        });
      }
      req.logIn(user, (err) => {
        if(err) {return res.send(err);}
        try {
          return res.send({
            message: info? info.message: '',
            user
          });
        } catch (error) {
          console.log(error);
        }

      });
    })(req, res, next);
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  }
};
