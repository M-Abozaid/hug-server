/**
 * AuthController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;


const samlStrategy = new SamlStrategy(
  {
    path: '/api/v1/login-callback',
    entryPoint: 'https://login.microsoftonline.com/17e1281a-ff7f-4071-9ddd-60a77a0a0fe7/saml2',// 'https://idphug.hcuge.ch',
    issuer: 'de2981db-9607-451a-80ca-4a0a886ca206',
    cert:'MIIC8DCCAdigAwIBAgIQGz0VdfAb3Z1MMMQSglxZ+TANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQDEylNaWNyb3NvZnQgQXp1cmUgRmVkZXJhdGVkIFNTTyBDZXJ0aWZpY2F0ZTAeFw0xOTA3MDgxMzEyMDNaFw0yMjA3MDgxMzEyMDNaMDQxMjAwBgNVBAMTKU1pY3Jvc29mdCBBenVyZSBGZWRlcmF0ZWQgU1NPIENlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzRzkqrH8CT7KPU7ERXrJxqtVhYhKyznfqV8cSIk/DFSyYeYJPjYV+4DRQOAsp7RH6Ra+IwdDTrpuhBPdRBCZ8uJOeKNDT/Nq1B8sfLhdBU7tl4bDWW3kIx2Y6TpYmoR2kXQ0oESFrpVaeoBbruClIIkObFK/2yCLwnN4GvgqnwPWYDNorzaBpgbGqjngEpnywBJ9P6ww4+GcpALUEm0Bwe3sSEvvEACAbENTAmpfiHzm4Y07BsaANu0UzbLBfWX8f/HBQck5+vQNMh2GWV2Gq8lIASXnQCnhbjYmSl556deKHWvCMOx7v/jc0Rs6KRQWkwqj/FKb/i46bkwJW5W0XQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQAabpEx+RJyvFbWQXhQrjZDtseanAxtjjXixRXvn2UcEU/nNO6CCg5oR/EsohK3cZt4f/eMUwO4mEOasMi3iBvdW6BwyQoIzpom64ry+oEvn2lSxlVg/fPBp/S3mfW8a1XrV4kVL6SXhnILE+E/e7LZv6ZjvTWGXjdGuV7x2V0b0yyiVocBJSi/aXWnS8Fy13XXl4f5FkwBe9mvCwBbx2FiMsIYhVbrclUTbZPue2qTaUC9Kux90amaiFQP9hRRDgLOX6AAADTYGheDybzub0OkpM1rkOZ5dVATIctQifd1X7Qp3GUc/OXDRNdsl2mKRLd4WYlMfTfh4uERJ+cgO3sM</'
  },
  (async (profile, cb) => {
    let user = await User.findOne({email: profile.email, firstname: profile.givenname, lastname:profile.surname });
    if (err) {return cb(err);}
    if (!user) {

      user = await User.create({
        email,
        role: sails.config.globals.NURSE_DOCTOR
      });
    }

    let token = jwt.sign(user,  sails.config.globals.APP_SECRET);
    user.token = token;

    return cb(null, user, { message: 'Login Successful'});

  })

);

passport.use(samlStrategy);

function logIn(err, user, info)  {
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
}


module.exports = {
  loginCert: function(req, res, next){

    passport.authenticate('trusted-header', logIn)(req, res, next);
  },
  loginLocal: function(req, res, next){

    passport.authenticate('local', logIn)(req, res, next);
  },
  logout: function(req, res) {
    req.logout();
    res.redirect('/');
  },

  getUser: function(req, res) {

    if(req.isAuthenticated()){
      let token = jwt.sign(req.user,  sails.config.globals.APP_SECRET);
      req.user.token = token;
      res.send({
        user: req.user
      });
    }else{
      res.sendStatus(401);
    }
  },

  loginSaml: function(req, res, next) {
    passport.authenticate('saml', { failureRedirect: '/app/login'})(req, res, next);
  },



  samlCallback: function(req, res, next){
    bodyParser.urlencoded({ extended: false })(req,res,next);
    passport.authenticate('saml', { failureRedirect: '/app/login' })(req,res,next);

    setTimeout(()=>{
      if(!res.headerSent){
        res.redirect('/app/login');
      }
    },1);


  },

  metadata: function(req, res){
    res.send(samlStrategy.generateServiceProviderMetadata());
  }
};
