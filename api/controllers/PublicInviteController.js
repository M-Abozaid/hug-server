/**
 * PublicInviteController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const ObjectId = require('mongodb').ObjectID;
const db = PublicInvite.getDatastore().manager;

module.exports = {

    async find(req, res) {
        console.log("getting public invites")
        const publicInviteCollection = db.collection('publicInvite');
        let publicInvites;
        if (req.user.allowedQueues && req.user.allowedQueues.length > 0) {
            let queues = req.user.allowedQueues.map(queue => queue.id);
            publicInvites = await PublicInvite.find({queue:queues});         
            return res.json(publicInvites);
        }
        //if the user have no queue by default he can see alls invite
        else {
            publicInvites = await PublicInvite.find({});
            return res.json(publicInvites);
        }
    }
};