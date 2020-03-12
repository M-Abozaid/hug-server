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
  loginCert(req, res) {

    // return res.status(401).send()
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

    })(req, res, (err) => {
      console.log('Error with LOGIN CERT', err);
    });
  },

  loginInvite(req, res) {
    passport.authenticate('invite', (err, user) => {
      console.log("GOT", err, user);
      if ((err) || (!user)) {
        return res.status(401).send({
          err
        });
      }

      console.log("APP SECRET", sails.config.globals);
      user.token = jwt.sign(user, sails.config.globals.APP_SECRET);

      return res.json({
        user
      });

    })(req, res, (err) => {
      console.log('Error with LOGIN INVITE', err);
    });
  },

  // used only for admin
  loginLocal(req, res) {

    passport.authenticate('local', (err, user, info = {}) => {
      if ((err) || (!user)) {
        return res.json({
          message: info.message,
          user
        });
      }

      if (user.role !== 'admin' && process.env.NODE_ENV !== 'development') {
        return res.forbidden()
      }

      return res.send({
        message: info.message,
        user
      });


    })(req, res, (err) => {
      console.log('Error with LOGIN ', err);
    });
  },
  logout(req, res) {
    req.logout();
    res.redirect('/');
  },

  getUser(req, res) {

    const token = jwt.sign(req.user, sails.config.globals.APP_SECRET);
    req.user.token = token;
    res.json({
      user: req.user
    });

  },

  loginSaml(req, res) {
    passport.authenticate('saml', { failureRedirect: '/app/login' })(req, res, (err) => {
      console.log('Error with SAML ', err);
      // res.serverError();
      return res.view('pages/error', {

        error: err

      });
    });
  },



  samlCallback(req, res) {
    bodyParser.urlencoded({ extended: false })(req, res, () => {
      passport.authenticate('saml', (err, user, info = {}) => {

        if (err) {
          sails.log('error authenticating ', err);
          return res.view('pages/error', {
            error: err
          });
        }
        if (!user) {
          return res.json({
            message: info.message,
            user
          });
        }

        return res.redirect(`/app?tk=${user.token}`);

      })(req, res, (err) => {
        if (err) {
          sails.log('error authenticating ', err);
          return res.view('pages/error', {

            error: err

          });
        }
        res.redirect('/app/login');
      });
    });


  },

  metadata(req, res) {
    res.send(samlStrategy.generateServiceProviderMetadata(process.env.SAML_CERT, process.env.SAML_CERT));
  }
};
