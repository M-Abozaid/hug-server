/**
 * PublicInviteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const ObjectId = require('mongodb').ObjectID;
const db = PublicInvite.getDatastore().manager;

module.exports = {

  // async find (req, res) {
  //   console.log('getting public invites');
  //   const publicInviteCollection = db.collection('publicInvite');



  //   const parseBlueprintOptions = req.options.parseBlueprintOptions
  //   || req._sails.config.blueprints.parseBlueprintOptions
  //   || req._sails.hooks.blueprints.parseBlueprintOptions;
  //   const queryOptions = parseBlueprintOptions(req);
  //   console.log('query opetions ', queryOptions);
  //   let queues = [];
  //   if (req.user.allowedQueues && req.user.allowedQueues.length > 0) {
  //     queues = req.user.allowedQueues.map(q => q.id);
  //   } else if (req.user.viewAllQueues) {
  //     queues = await Queue.find({});
  //     queues = queues.map(q => q.id);
  //   }


  //   const publicInvites = await PublicInvite.find({
  //     where: {
  //       or: [
  //         {
  //           doctor: req.user.id
  //         }, {
  //           queue: queues
  //         }
  //       ]
  //     }
  //   });


  //   return res.json(publicInvites);
  // }


};
