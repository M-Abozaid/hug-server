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


const SMS_CODE_LIFESPAN = 5 * 60
function generateVerificationCode() {
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

  async forgotPassword(req, res) {

    const emailRegex = new RegExp(`${req.body.email}`, 'i');
    const db = sails.getDatastore().manager;
    const resetPasswordToken = jwt.sign({ email: req.body.email.toLowerCase() }, sails.config.globals.APP_SECRET, { expiresIn: SMS_CODE_LIFESPAN });

    // Always return succes directly, so an attacker could not guess if the email exists or not...
    res.json({
      success: true
    });


    const user = await db.collection('user').findOne({
      email: {
        '$regex': emailRegex
      }
    });

    if (user) {
      await db.collection('user').update({
        email: {
          '$regex': emailRegex
        }
      }, {
        $set: {
          resetPasswordToken
        }
      });

      const url = `${process.env.DOCTOR_URL}/app/reset-password?token=${resetPasswordToken}`;

      await sails.helpers.email.with({
        to: user.email,
        subject: 'Mot de passe oublié',
        text: `Vous nous avez indiqué que vous avez oublié votre mot de passe. Merci de cliquer sur le lien suivant afin de changer votre mot de passe ${url}. Ce lien ne fonctionnera que 5 minutes.`,
      });
    }
  },

  async resetPassword(req, res) {
    const passwordFormat = new RegExp("^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})");

    if (!req.body.token) {
      return res.status(400).json({
        message: "token-missing"
      });
    }

    if (!passwordFormat.test(req.body.password)) {
      return res.status(400).json({
        message: "password-too-weak"
      });
    }

    try {
      //const decoded = jwt.verify(req.body.token, sails.config.globals.APP_SECRET);

      const password = await User.generatePassword(req.body.password);

      const user =  await User.findOne({resetPasswordToken: req.body.token});
      await User.updateOne({
        resetPasswordToken: req.body.token
      }).set({
        password,
        resetPasswordToken: ''
      })
      console.log("GOT USER", user);

      if (!user) {
        throw new Error("token-expired");
      }

    } catch (err) {
      console.log("ERROR", err);
      if (err.name == 'TokenExpiredError') {
        return res.status(400).json({
          message: "token-expired"
        });
      } else {
        return res.status(400).json({
          message: "unknown"
        });
      }
    }

    res.json({
      success: true
    });
  },

  // used only for admin
  async loginLocal(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    const isAdmin = await User.count({email: req.body.email, role:'admin'})
    if(req.body._version){
      await  User.updateOne({email: req.body.email, role: {in:['doctor','admin']} } ).set({doctorClientVersion: req.body._version})
    }else{
      if(!isAdmin){
        await  User.updateOne({email: req.body.email }).set({doctorClientVersion: 'invalid'})
        return res.status(400).json({
          message: "Le cache de votre navigateur n'est pas à jour, vous devez le raffraichir avec CTRL+F5 !",
        });
      }
    }

    passport.authenticate('local', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if (err) {
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

      if (process.env.NODE_ENV !== 'development' && user.role === 'doctor'
        //|| user.role === 'admin'
      ) {
        const localLoginDetails = {
          id: user.id,
          localLoginToken: true,
          singleFactor: true,
        }
        const localLoginToken = jwt.sign(localLoginDetails, sails.config.globals.APP_SECRET);

        let verificationCode;
        if (user.smsVerificationCode) {
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
        const smsToken = jwt.sign({ code: verificationCode }, sails.config.globals.APP_SECRET, { expiresIn: SMS_CODE_LIFESPAN });

        await User.updateOne({ id: user.id }).set({ smsVerificationCode: smsToken })

        try {
          await sails.helpers.sms.with({
            phoneNumber: user.authPhoneNumber,
            message: `Votre code de vérification est ${verificationCode}. Ce code est utilisable ${SMS_CODE_LIFESPAN / 60} minutes`
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

      } else {
        if (user.smsVerificationCode) {
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
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    passport.authenticate('sms', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if (err) {
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

      await User.updateOne({ id: user.id }).set({ smsVerificationCode: '' })


      const localLoginDetails = {
        id: user.id,
        smsToken: true,
        singleFactor: true,
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
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'password' && process.env.LOGIN_METHOD !== 'both')) {
      console.log('Password login is disabled');
      return res.status(500).json({
        message: 'Password login is disabled',
      });
    }

    passport.authenticate('2FA', async (err, user, info = {}) => {
      console.log("Authenticate now", err, user);
      if (err) {
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

    if (!req.headers['x-access-token'] && !req.query.token) { return res.status(401).json({ error: "Unauthorized" }); }
    jwt.verify(req.headers['x-access-token'] || req.query.token, sails.config.globals.APP_SECRET, async (err, decoded) => {
      if (err) {
        console.error('error ', err);
        return res.status(401).json({ error: "Unauthorized" });
      }

      if(decoded.singleFactor){
        return res.status(401).json({ error: "Unauthorized" });
      }

      try {


        if(req.query._version){
          await  User.updateOne({email: decoded.email, role: {in:['doctor','admin']} } ).set({doctorClientVersion: req.query._version})
        }else{
          await  User.updateOne({email: decoded.email }).set({doctorClientVersion: 'invalid'})
          return res.status(400).json({
            message: "Le cache de votre navigateur n'est pas à jour, vous devez le raffraichir avec CTRL+F5 !",
          });
        }


        const user = await User.findOne({
          id: decoded.id
        })

        if(!user){
          console.error('No user from a valid token ')
          res.status(500).json({message:'UNKNOWN ERROR'})
        }

        if(user.role === 'doctor' ){
          if(!user.doctorClientVersion){
            return res.status(401).json({ error: "Unauthorized App version needs to be updated" });
          }
        }

        const token = jwt.sign(user, sails.config.globals.APP_SECRET);
        user.token = token;
        res.json({
          user
        });
      } catch (error) {
        console.error(error)
        res.status(500).json({message:'UNKNOWN ERROR'})

      }
    })

  },

  loginSaml(req, res) {
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'saml' && process.env.LOGIN_METHOD !== 'both')) {
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
    if (!process.env.LOGIN_METHOD || (process.env.LOGIN_METHOD !== 'saml' && process.env.LOGIN_METHOD !== 'both')) {
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
