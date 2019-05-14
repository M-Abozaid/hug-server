/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */
const fs = require('fs');
const { promisify } = require('util');

const readdirP = promisify(fs.readdir);

module.exports.bootstrap = async function() {

  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //
  // await User.createEach([
  //   { emailAddress: 'ry@example.com', fullName: 'Ryan Dahl', },
  //   { emailAddress: 'rachael@example.com', fullName: 'Rachael Shaw', },
  //   // etc.
  // ]);
  // ```

  // set ttl index
  const db = sails.models.consultation.getDatastore().manager;

  const consultationCollection = db.collection('consultation');
  const messageCollection = db.collection('message');
  await consultationCollection.createIndex({closedAtISO:1}, { expireAfterSeconds: 86400}); // expires after a day
  await messageCollection.createIndex({consultationClosedAtISO:1}, { expireAfterSeconds: 86400}); // expires after a day


  // delete expired files
  setInterval(async ()=>{

    try {
      let files = await readdirP(sails.config.globals.attachmentsDir);

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        let found = await messageCollection.count({filePath});

        if(!found){
          fs.unlink(sails.config.globals.attachmentsDir + '/' + filePath, err=>{

            if(err){
              console.log('error deleting file ', err);
            }

          });
        }
      }
    } catch (err) {
      console.log(err);
    }


    // every 5 min
  },300000);

};
