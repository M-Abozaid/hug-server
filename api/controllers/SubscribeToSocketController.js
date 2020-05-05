/**
 * SubscribeToSocketController
 *
 * @description :: subscribe users to a room with their id for socket communications.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


module.exports = {

  async subscribe(req, res) {
    if (!req.isSocket) {
      return res.badRequest();
    }

    const user = await User.findOne({ id: req.user.id });

    if (!user) {
      return res.forbidden();
    }



    const  socketId =   sails.sockets.getId(req);

    const socket = sails.sockets.get(socketId)

    socket.once('disconnect', async (reason) => {
      // ...
      console.log('disconnected >>>>' , reason)
      const consultations = await Consultation.update({owner : user.id}).set({flagPatientOnline:false}).fetch();
      console.log("flagPatientOnline > set false", user.id)

      consultations.forEach(consultation=>{

        sails.sockets.broadcast(consultation.acceptedBy || consultation.queue || consultation.invitedBy, 'patientOffline', { data: consultation });
      })
    });
    sails.sockets.join(req, user.id, (err) => {
      if (err) {
        sails.log('error joining session ', err);
        return res.serverError(err);
      }

      return res.json({
        message: `Subscribed to a fun room called ${user.id}!`
      });
    });

  }

};

