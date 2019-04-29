const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');

var Strategy = require('passport-trusted-headers').Strategy;

var options =  {
  headers: ['TLS_CLIENT_DN']
};


passport.serializeUser((user, cb) => {
  cb(null, user.id);
});
passport.deserializeUser((id, cb) => {
  User.findOne({id}, (err, user) => {
    cb(err, user);
  });
});

passport.use(new LocalStrategy({
  usernameField: 'email',
  passportField: 'password'
}, ((email, password, cb) => {
  User.findOne({email: email, role:'doctor'}, (err, user) => {
    if (err) {return cb(err);}
    if (!user) {return cb(null, false, {message: 'email not found'});}
    bcrypt.compare(password, user.password, (err, res) => {
      if (err) {return cb(err);}

      if (!res) {return cb(null, false, { message: 'Invalid Password' });}
      let userDetails = {
        email: user.email,
        username: user.username,
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };
      let token = jwt.sign(userDetails,  sails.config.globals.APP_SECRET);
      userDetails.token = token;
      return cb(null, userDetails, { message: 'Login Successful'});
    });
  });
})));

passport.use(new Strategy(options, ((requestHeaders, done) => {
  var user = null;
  var userDn = requestHeaders.TLS_CLIENT_DN;

  console.log('headers ',requestHeaders,  requestHeaders['X-SSL-client-s-dn'], requestHeaders['X-SSL-client-i-dn'], requestHeaders['X-SSL-client-session-id'], requestHeaders['X-SSL-client-verify']);
  // Authentication logic here!
  if(userDn === 'CN=test-cn') {
    user = { name: 'Test User' };
  }

  done(null, user);


})));
