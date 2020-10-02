const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Strategy } = require('passport-trusted-header');


const passportCustom = require('passport-custom');

const CustomStrategy = passportCustom.Strategy;

function getUserDetails (user) {
  return {
    email: user.email,
    username: user.username,
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    authPhoneNumber: user.authPhoneNumber,
    viewAllQueues: user.viewAllQueues,
    doctorClientVersion: user.doctorClientVersion,
    notifPhoneNumber: user.notifPhoneNumber,
    enableNotif: user.enableNotif
  };
}

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});
passport.deserializeUser((id, cb) => {
  User.findOne({ id }, (err, user) => {
    cb(err, user);
  });
});


passport.use('invite', new CustomStrategy(
  (async (req, callback) => {
    // Do your custom user finding logic here, or set to false based on req object
    const invite = await PublicInvite.findOne({ inviteToken: req.body.inviteToken });

    if (!invite) {
      return callback({ invite: 'not-found' }, null);
    }


    if (invite.type === 'TRANSLATOR_REQUEST') {
      return callback({ invite: 'cannot use this invite for login' }, null);
    }

    if (invite.status === 'ACCEPTED' || invite.status === 'COMPLETED' || invite.status === 'REFUSED') {
      return callback({ invite: 'invite have already been accepted' }, null);
    }

    if (invite.status === 'SENT') {
      await PublicInvite.updateOne({ inviteToken: req.body.inviteToken }).set({ status: 'ACCEPTED' });
    }

    let user = await User.findOne({ username: invite.id });

    if (user) {
      return callback(null, user);
    }

    const newUser = {
      username: invite.id,
      firstName: '',
      lastName: '',
      role: invite.type.toLowerCase(),
      password: '',
      temporaryAccount: true,
      inviteToken: invite.id
    };

    if (invite.emailAddress) {
      newUser.email = invite.emailAddress;
    }
    if (invite.phoneNumber) {

      newUser.phoneNumber = invite.phoneNumber;
    }
    if (req.body.phoneNumber) {

      newUser.phoneNumberEnteredByPatient = req.body.phoneNumber;
    }

    user = await User.create(newUser).fetch();

    if (invite.type === 'GUEST') {
      const patientInvite = await PublicInvite.findOne({ guestInvite: invite.id });
      if (patientInvite) {
        const [consultation] = await Consultation.update({ invite: patientInvite.id }).set({ guest: user.id }).fetch();
        if(consultation){

          Consultation.getConsultationParticipants(consultation).forEach(participant=>{
                sails.sockets.broadcast(participant, 'consultationUpdated', {
                  data: {consultation}
                })
              })
        }

      }
    }


    callback(null, user);
  })
));

passport.use('sms', new CustomStrategy(
  (async (req, cb) => {

    const user = await User.findOne({ id: req.body.user });
    if (!user) { return cb(null, false, { message: 'User not found' }); }
    jwt.verify(user.smsVerificationCode, sails.config.globals.APP_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return cb(null, false, { message: 'Expired code' });
        }
        console.error('error ', err);
        return cb(null, false, { message: 'Invalid token' });
      }


      if (decoded.code !== req.body.smsVerificationCode) {
        user.smsAttempts++;
        if (user.smsAttempts > 9) {
          await User.updateOne({ id: req.body.user }).set({ smsVerificationCode: '' });
          return cb(null, false, { message: 'MAX_ATTEMPTS' });
        }
        else {
          await User.updateOne({ id: req.body.user }).set({ smsAttempts: user.smsAttempts });
          return cb(null, false, { message: 'Invalid verification code' });
        }

      }

      return cb(null, user, { message: 'SMS Login Successful' });

    });
    // bcrypt.compare(req.body.smsVerificationCode, user.smsVerificationCode, (err, res) => {
    //   if (err) { return cb(err); }

    //   if (!res) { return cb(null, false, { message: 'Invalid token' }); }

    //   return cb(null, user, { message: 'SMS Login Successful' });
    // });
  })
));

passport.use('2FA', new CustomStrategy(
  (async (req, cb) => {

    const user = await User.findOne({ id: req.body.user });
    if (!user) { return cb(null, false, { message: 'User not found' }); }

    jwt.verify(req.body.localLoginToken, sails.config.globals.APP_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return cb(null, false, { message: 'Expired token' });
        }
        console.error('error ', err);
        return cb(null, false, { message: 'Invalid Token' });
      }


      if (decoded.id !== user.id) {
        return cb(null, false, { message: 'Invalid Token' });
      }

      jwt.verify(req.body.smsLoginToken, sails.config.globals.APP_SECRET, async (err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return cb(null, false, { message: 'Expired token' });
          }
          console.error('error ', err);
          return cb(null, false, { message: 'Invalid Token' });
        }


        if (decoded.id !== user.id) {
          return cb(null, false, { message: 'Invalid Token' });
        }

        const userDetails = getUserDetails(user);
        const token = jwt.sign(userDetails, sails.config.globals.APP_SECRET);
        userDetails.token = token;

        return cb(null, userDetails, { message: '2FA Login Successful' });
      });

    });

  })
));
passport.use(new LocalStrategy({
  usernameField: 'email',
  passportField: 'password'
}, ((email, password, cb) => {
  User.findOne({ email: email.toLowerCase(), temporaryAccount: { '!=': true } }, (err, user) => {
    if (err) { return cb(err); }
    if (!user) { return cb(null, false, { message: 'Email ou mot de passe incorrect' }); }
    bcrypt.compare(password, user.password, (err, res) => {
      if (err) { return cb(err); }

      if (!res) { return cb(null, false, { message: 'Email ou mot de passe incorrect' }); }
      if (user.role === 'doctor') {
        if (!user.doctorClientVersion) {
          return cb(null, false, { message: 'Le cache de votre navigateur n\'est pas à jour, vous devez le raffraichir avec CTRL+F5 !' });
        }

      }
      const userDetails = getUserDetails(user);

      const token = jwt.sign(userDetails, sails.config.globals.APP_SECRET);
      userDetails.token = token;
      userDetails.smsVerificationCode = user.smsVerificationCode;
      return cb(null, userDetails, { message: 'Login Successful' });
    });
  });
})));

const options = {
  headers: ['x-ssl-client-s-dn']
};

passport.use(new Strategy(options, (async (requestHeaders, cb) => {

  let user = null;
  const userDn = requestHeaders['x-ssl-client-s-dn'];
  const CNMatch = userDn.match(/CN=([^\/]+)/);
  const emailMatch = userDn.match(/emailAddress=([^\/\s]+)/);
  // let email =  emailMatch? emailMatch[1] : null;
  const login = (CNMatch && CNMatch[1]) ? CNMatch[1].split(/\s+/)[0] : null;
  const firstName = login;
  const email = `${firstName}@imad.ch`;
  const lastName = 'UNKNOWN';
  // let lastName = (CNMatch && CNMatch[1])? CNMatch[1].split(/\s+/)[1] : null;

  sails.log.debug('headers ', userDn, firstName, lastName, email);

  if (!firstName) {
    return cb(new Error('CN field is not present'), null, { message: 'CN field is not present' });
  }
  if (email) {
    user = await User.findOne({ email });
    if (!user) {
      try {
        user = await User.create({
          email,
          firstName,
          lastName,
          role: sails.config.globals.ROLE_NURSE
        }).fetch();
      } catch (error) {
        return cb(error, null, { message: 'Login Unsuccessful' });
      }

    }

    const token = jwt.sign(user, sails.config.globals.APP_SECRET);
    user.token = token;

    return cb(null, user, { message: 'Login Successful' });

  } else {
    return cb(null, null, { message: 'email not found' });
  }

})));



const SamlStrategy = require('passport-saml').Strategy;
let samlStrategy;
console.log('env >>>> ', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'development' && process.env.SAML_CALLBACK) {


  samlStrategy = new SamlStrategy(
    {
      callbackUrl: process.env.SAML_CALLBACK || 'https://dev-hug-at-home.oniabsis.com/api/v1/saml-callback',
      path: '/api/v1/login-callback',
      entryPoint: process.env.SAML_ENTRY_POINT || 'https://login.microsoftonline.com/17e1281a-ff7f-4071-9ddd-60a77a0a0fe7/saml2',
      logoutUrl: process.env.LOGOUT_URL,
      issuer: process.env.SAML_ISSUER || 'de2981db-9607-451a-80ca-4a0a886ca206',
      decryptionCert: process.env.SAML_CERT,
      decryptionPvk: fs.readFileSync(process.env.SAML_PATH_KEY, 'utf-8'),
      signingCert: process.env.SAML_CERT,
      privateCert: fs.readFileSync(process.env.SAML_PATH_KEY, 'utf-8'),
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified'
      //    cert: process.env.SAML_CERT_IDENTITY
    },
    (async (profile, cb) => {



      try {
        const user = await User.findOne({ email: profile[process.env.EMAIL_FIELD] });

        if (!user) {
          // user = await User.create({
          //   email: profile[process.env.EMAIL_FIELD],
          //   firstName: profile[process.env.FIRSTNAME_FIELD],
          //   lastName: profile[process.env.LASTNAME_FIELD],
          //   role: sails.config.globals.ROLE_DOCTOR
          // }).fetch();
          return cb(new Error('User not found'));
        }


        const token = jwt.sign(user, sails.config.globals.APP_SECRET);
        user.token = token;

        return cb(null, user, { message: 'Login Successful' });

      } catch (error) {
        sails.log('error cerating user ', error);
        return cb(error);
      }

    })

  );

  passport.use(samlStrategy);


}


exports.samlStrategy = samlStrategy;
