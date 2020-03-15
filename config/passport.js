const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Strategy } = require('passport-trusted-header');


const passportCustom = require('passport-custom');
const CustomStrategy = passportCustom.Strategy;



passport.serializeUser((user, cb) => {
  cb(null, user.id);
});
passport.deserializeUser((id, cb) => {
  User.findOne({ id }, (err, user) => {
    cb(err, user);
  });
});


passport.use('invite', new CustomStrategy(
  async function (req, callback) {
    // Do your custom user finding logic here, or set to false based on req object

    const invite = await PublicInvite.findOne({ inviteToken: req.body.inviteToken });

    if (!invite) {
      return callback({ inviteToken: "not-found" }, null);
    }
    if (invite.status === 'SENT') {
      await PublicInvite.updateOne({ inviteToken: req.body.inviteToken }).set({ status: 'ACCEPTED' })
    }
    const phoneNumber = invite.phoneNumber.replace("+", "00");

    const newUser = {
      username: invite.id,
      email: "",
      firstName: "",
      lastName: "",
      role: 'patient',
      password: "",
      phoneNumber: invite.phoneNumber,
      phoneNumberEnteredByPatient: req.body.phoneNumber,
      temporaryAccount: true,
      inviteToken: invite.id,
    }

    let user = await User.findOne({ username: phoneNumber });
    if (user) {
      console.log("FIND USER ", { id: user.id })
      user = await User.updateOne(user.id).set({ inviteToken: invite.id });
      console.log("UPdated");
    } else {
      user = await User.create(newUser).fetch();
    }


    callback(null, user)
  }
))

passport.use(new LocalStrategy({
  usernameField: 'email',
  passportField: 'password'
}, ((email, password, cb) => {
  User.findOne({ email }, (err, user) => {
    if (err) { return cb(err); }
    if (!user) { return cb(null, false, { message: 'email not found' }); }
    bcrypt.compare(password, user.password, (err, res) => {
      if (err) { return cb(err); }

      if (!res) { return cb(null, false, { message: 'Email ou mot de passe incorrect' }); }
      const userDetails = {
        email: user.email,
        username: user.username,
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };
      const token = jwt.sign(userDetails, sails.config.globals.APP_SECRET);
      userDetails.token = token;
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
let samlStrategy
console.log('env >>>> ', process.env.NODE_ENV)
if (process.env.NODE_ENV !== 'development') {


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
        let user = await User.findOne({ email: profile[process.env.EMAIL_FIELD] });

        if (!user) {
          // user = await User.create({
          //   email: profile[process.env.EMAIL_FIELD],
          //   firstName: profile[process.env.FIRSTNAME_FIELD],
          //   lastName: profile[process.env.LASTNAME_FIELD],
          //   role: sails.config.globals.ROLE_DOCTOR
          // }).fetch();
          return cb(new Error('User not found'))
        }

        // remove unnecessary fields
        user = (({
          firstName, lastName, id, role
        }) => ({
          firstName, lastName, id, role
        }))(user);


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
