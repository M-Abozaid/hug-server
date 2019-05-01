const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');

var Strategy = require('passport-trusted-header').Strategy;



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

var options =  {
  headers: ['x-ssl-client-s-dn']
};

passport.use(new Strategy(options, ( async (requestHeaders, cb) => {

  var user = null;
  var userDn = requestHeaders['x-ssl-client-s-dn'];
  let CNMatch = userDn.match(/CN=([^\/]+)/);
  let emailMatch = userDn.match(/emailAddress=([^\/\s]+)/);
  let email =  emailMatch? emailMatch[1] : null;
  let firstName = (CNMatch && CNMatch[1])? CNMatch[1].split(/\s+/)[0] : null;
  let lastName = (CNMatch && CNMatch[1])? CNMatch[1].split(/\s+/)[1] : null;

  console.log('headers ',firstName, lastName, email);

  if(email) {
    user = await User.findOne({email:email});
    if(!user){
      try {
        user = await User.create({
          email,
          firstName,
          lastName,
          role: sails.config.globals.NURSE_DOCTOR
        });
      } catch (error) {
        return cb(error, null, { message: 'Login Unsuccessful'});
      }

    }

    let token = jwt.sign(user,  sails.config.globals.APP_SECRET);

    user.token = token;

    return cb(null, user, { message: 'Login Successful'});

  }else{
    return cb(null, null, {message: 'email not found'});
  }

})));
