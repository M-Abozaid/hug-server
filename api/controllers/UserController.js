/**
 * UserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {


  async ip(req, res) {


    res.json({ ip: req.ip })
  },

  async addDoctorToQueue(req, res) {

    if (!req.body.queue) {
      return res.status(400).json({ message: 'queue is required' })
    }

    await User.addToCollection(req.params.user, 'allowedQueues', req.body.queue);

    return res.status(200).json({ success: true })
  },

  async removeDoctorFromQueue(req, res) {

    if (!req.body.queue) {
      return res.status(400).json({ message: 'queue is required' })
    }

    try {
      let userAndQueueExist = await User.findOne({ id: req.params.user}).populate('allowedQueues', { id:req.body.queue }) ;

      if (!userAndQueueExist) {
        res.status(404)
        return res.json({ message: 'User not found' });
      }
      else if(userAndQueueExist.allowedQueues.length==0){
        res.status(404)
        return res.json({ message: 'Queue not found' });
      }

      await User.removeFromCollection(req.params.user, 'allowedQueues', req.body.queue);

      return res.status(200).json({ success: true });

    } catch (err) {
      return res.badRequest(err);
    }
  },

  async getDoctorQueues(req, res) {


    const user = await User.findOne({ id: req.params.user }).populate('allowedQueues');

    return res.status(200).json(user.allowedQueues)
  },


  // async count(req, res){
  //   let count
  //   if(req.query.where){

  //     try {
  //       count = await User.count( {where: JSON.parse(req.query.where)})
  //     } catch (error) {
  //       return res.status(400).json({
  //         success: false,
  //         error
  //       })
  //     }
  //   }else{
  //     count = await User.count( {})
  //   }
  //   return res.status(200).json({
  //     count
  //   })
  // }

};

