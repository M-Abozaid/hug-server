/**
 * Queue.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {


    name: {
      type: 'string',
      required: true
    },
  },

};

