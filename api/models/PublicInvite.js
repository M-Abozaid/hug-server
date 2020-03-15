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
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    gender: {
      type: 'string',
      isIn: ['male', 'female', 'other', 'unknown'],
    },
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
    queue: {
      model: 'queue',
      required:true
    },
  },
  customToJSON() {
    return _.omit(this, ['inviteToken'])
  },
  async beforeCreate(obj, proceed) {
    obj.inviteToken = await generateToken();
    return proceed();
  }
}
