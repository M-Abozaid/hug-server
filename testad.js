
require('dotenv').config();

const ActiveDirectory = require('activedirectory2');
const config = { url: process.env.AD_URIS,
               baseDN: process.env.AD_BASE,
               username: process.env.AD_USER,
               password: process.env.AD_PASSWORD }
const ad = new ActiveDirectory(config);

var opts = {
  filter: `mail=Maryline.Bovero@hcuge.ch`,
  includeMembership : ['user'],
  includeDeleted : false,
  attributes: []
};
ad.find(opts, async function(err, results) {
  if (err) {
    console.error('ERROR: ' +JSON.stringify(err));
    return;
  }
  console.log('results: ' + JSON.stringify(results));
})
