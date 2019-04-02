const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const { DB_URI } = require('../config');
exports.initDB = function (server) {
  mongoose.connect(DB_URI, { useNewUrlParser: true });

  const db = mongoose.connection;
  db.on('error', function (error) {
    console.error('connection error:', error);
    server.close(() => process.exit(0));

  });
  db.once('open', function callback () {
    console.log('connection open');
  });


  require('../models/user');
  require('../models/consultation');
};