/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  async invite(req, res) {
    console.log("REQ", req);

    let invite = null;


    try {
      invite = await PublicInvite.create({
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress
      }).fetch();
    } catch (e) {
      return res.status(500).json({
        error: true
      });
    }

    console.log("INVITE", invite);

    return res.json({
      auccess: true,
      invite
    });
    // const invite = {
    //   firename: req.query.firstname
    // }
    // try {
    //   await Message.updateOne({
    //     _id: req.params.message,
    //     consultation: req.params.consultation
    //   })
    //     .set({
    //       acceptedAt: new Date()
    //     });

    //   res.json({
    //     status: 200
    //   });
    // } catch (error) {
    //   return res.json(error);
    // }

  },


};
