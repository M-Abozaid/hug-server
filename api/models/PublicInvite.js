/**
 * PublicInvite.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const crypto = require("crypto");
async function generateToken() {
  const buffer = await new Promise((resolve, reject) => {
    crypto.randomBytes(256, function (ex, buffer) {
      if (ex) {
        reject("error generating token");
      }
      resolve(buffer);
    });
  });
  const token = crypto
    .createHash("sha1")
    .update(buffer)
    .digest("hex");

  console.log(token);
  return token;
}

module.exports = {
  attributes: {
    phoneNumber: {
      type: 'string'
    },
    emailAddress: {
      type: 'string'
    },
    inviteToken: {
      type: 'string',
    },
    status: {
      type: 'string',
      isIn: ['SENT', 'ACCEPTED', 'COMPLETE'],
      defaultsTo: "SENT",
    },
  },

  async beforeCreate(obj, proceed) {
    obj.inviteToken = await generateToken();
    return proceed();
  }
}