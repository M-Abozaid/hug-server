const NodeClam = require('clamscan');
module.exports = function myBasicHook (sails) {
  return {
    async initialize (cb) {

      const clamscan = await new NodeClam().init({
        remove_infected: true,
        clamdscan: {
          socket: '/var/run/clamd.scan/clamd.sock', // Socket file for connecting via TCP
      },
        preference: 'clamdscan'
      });

      sails.config.globals.clamscan = clamscan;
      // Do some stuff here to initialize hook
      // And then call `cb` to continue
      return cb();

    }
  };
};
