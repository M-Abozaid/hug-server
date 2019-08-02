/**
 * AuthController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


const bodyParser = require('body-parser');
const passport = require('passport');

const { samlStrategy } = require('../../config/passport');
const jwt = require('jsonwebtoken');



module.exports = {

  // login using client certificate
  loginCert (req, res, next) {

    passport.authenticate('trusted-header', (err, user, info = {}) => {
      if ((err) || (!user)) {
        return res.send({
          message: info.message,
          user
        });
      }
      return res.json({
        message: info.message,
        user
      });

    })(req, res, next);
  },

  // used only for development
  loginLocal (req, res, next) {
    if (process.env.NODE_ENV === 'production') {
      return res.notFound();
    }
    passport.authenticate('local', (err, user, info = {}) => {
      if ((err) || (!user)) {
        return res.json({
          message: info.message,
          user
        });
      }


      return res.send({
        message: info.message,
        user
      });


    })(req, res, next);
  },
  logout (req, res) {
    req.logout();
    res.redirect('/');
  },

  getUser (req, res) {

    const token = jwt.sign(req.user, sails.config.globals.APP_SECRET);
    req.user.token = token;
    res.json({
      user: req.user
    });

  },

  loginSaml (req, res, next) {
    passport.authenticate('saml', { failureRedirect: '/app/login' })(req, res, next);
  },



  samlCallback (req, res) {
    bodyParser.urlencoded({ extended: false })(req, res, () => {
      passport.authenticate('saml', (err, user, info = {}) => {

        if (err) {
          sails.log('error authenticating ', err);
          return res.redirect('/app/login');
        }
        if (!user) {
          return res.json({
            message: info.message,
            user
          });
        }

        return res.redirect(`/app?tk=${ user.token}`);

      })(req, res, () => {
        res.redirect('/app/login');
      });
    });


  },

  metadata (req, res) {
    res.send(samlStrategy.generateServiceProviderMetadata(process.env.SAML_CERT, process.env.SAML_CERT));
  }
};
