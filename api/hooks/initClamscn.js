const NodeClam = require('clamscan');
module.exports = function myBasicHook(sails) {
  return {
    initialize: async function(cb) {

      const clamscan = await new NodeClam().init({
        remove_infected: true });

      sails.config.globals.clamscan = clamscan;
      // Do some stuff here to initialize hook
      // And then call `cb` to continue
      return cb();

    }
  };
};
