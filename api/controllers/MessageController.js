/**
 * MessageController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  readMessages: async function(req, res){
    let id = req.headers.id;
    let senderId = req.query.senderId;

    await sails.models.user.update({ from: senderId, to:id, read:false })
    .set({
      read:true
    });

    res.ok(200);
  }

};

