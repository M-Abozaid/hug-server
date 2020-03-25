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

const SMS_CODE_LIFESPAN = 5*60
function generateVerificationCode(){
  let possible = '0123456789'
  let string = ''
  for (let i = 0; i < 6; i++) {
    string += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return string
}

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
      if ((err) || (!user)) {
        return res.status(401).send({
          err
        });
      }

      user.token = jwt.sign(user, sails.config.globals.APP_SECRET);

      return res.json({
        user
      });

    })(req, res, (err) => {
    });
  },

  // used only for admin
  loginLocal(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    passport.authenticate('local', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if(err){
        return res.status(500).json({
          message: info.message || 'Server Error',
        });
      }
      if ((!user)) {
        return res.status(400).json({
          message: info.message,
          user
        });
      }

      // if (user.role !== 'admin' && process.env.NODE_ENV !== 'development') {
      //   return res.forbidden()
      // }

      if(user.role === 'doctor'
      //|| user.role === 'admin'
      ){
        const localLoginDetails = {
          id: user.id,
          localLoginToken:true,
          singleFactor:true,
        }
        const localLoginToken = jwt.sign(localLoginDetails, sails.config.globals.APP_SECRET);

        let verificationCode;
        if(user.smsVerificationCode){
          try {
            const decoded = jwt.verify(user.smsVerificationCode, sails.config.globals.APP_SECRET);
            verificationCode = decoded.code
          } catch (error) {
            console.error(error)

          }
        }
        verificationCode = verificationCode || generateVerificationCode();
        // const salt = await bcrypt.genSalt(10)
        // const hash = await bcrypt.hash(verificationCode, salt)
        const smsToken = jwt.sign({code :verificationCode}, sails.config.globals.APP_SECRET, {expiresIn: SMS_CODE_LIFESPAN});

        await User.updateOne({id: user.id}).set({smsVerificationCode: smsToken})

        try {
          await sails.helpers.sms.with({
            phoneNumber: user.authPhoneNumber,
            message: `Votre code de vérification est ${verificationCode}. Ce code est utilisable ${SMS_CODE_LIFESPAN/60} minutes`
          })
        } catch (err) {
          return res.status(500).json({
            message: "Echec d'envoi du SMS"
          })
        }

        return res.status(200).json({
          localLoginToken,
          user: user.id
        });

      }else{
        if(user.smsVerificationCode){
          delete user.smsVerificationCode;
        }

        return res.status(200).send({
          message: info.message,
          user
        });
      }

    })(req, res, (err) => {
      console.log('Error with LOGIN ', err);
    });
  },

  // used only for admin
  loginSms(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    passport.authenticate('sms', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if(err){
        return res.status(500).json({
          message: info.message || 'Server Error',
        });
      }
      if ((!user)) {
        return res.status(400).json({
          message: info.message,
          user
        });
      }

      await User.updateOne({id: user.id}).set({smsVerificationCode: ''})


        const localLoginDetails = {
          id: user.id,
          smsToken:true,
          singleFactor:true,
        }
        const smsLoginToken = jwt.sign(localLoginDetails, sails.config.globals.APP_SECRET);
        return res.status(200).json({
          smsLoginToken,
          user: user.id
        });


    })(req, res, (err) => {
      console.log('Error with LOGIN ', err);
    });
  },


  login2FA(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    passport.authenticate('2FA', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if(err){
        return res.status(500).json({
          message: info.message || 'Server Error',
        });
      }
      if ((!user)) {
        return res.status(400).json({
          message: info.message,
          user
        });
      }

      return res.status(200).send({
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
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'saml' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('SAML login is disabled');
      return res.status(500).json({
        message: 'SAML login is disabled',
      });
    }

    passport.authenticate('saml', { failureRedirect: '/app/login' })(req, res, (err) => {
      console.log('Error with SAML ', err);
      // res.serverError();
      return res.view('pages/error', {

        error: err

      });
    });
  },



  samlCallback(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'saml' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('SAML login is disabled');
      return res.status(500).json({
        message: 'SAML login is disabled',
      });
    }

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
  },

  getConfig(req, res) {
    res.json({
      method: process.env.LOGIN_METHOD ? process.env.LOGIN_METHOD : 'both',
    })
  }
};
