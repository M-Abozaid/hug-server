/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



async function notifyPatientBySms(phoneNumber, message) {
  console.log(process.env);
  const ovhConfig = {
    endpoint: process.env.SMS_OVH_ENDPOINT,
    appKey: process.env.SMS_OVH_APP_KEY,
    appSecret: process.env.SMS_OVH_APP_SECRET,
    consumerKey: process.env.SMS_OVH_APP_CONSUMER_KEY,
  };
  console.log(ovhConfig);
  const ovh = require('ovh')(ovhConfig);

  console.log('Sending SMS...');

  ovh.request('GET', '/sms', (err, serviceName) => {
    if (err) {
      console.log(err, serviceName);
      return;
    }

    // Send a simple SMS with a short number using your serviceName
    ovh.request('POST', `/sms/${serviceName}/jobs/`, {
      sender: process.env.SMS_OVH_SENDER,
      message,
      senderForResponse: false,
      receivers: [phoneNumber]
    }, (errsend, result) => {
      console.error(errsend, result);
    });
  });
}

module.exports = {
  async invite(req, res) {
    let invite = null;


    try {
      invite = await PublicInvite.create({
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress,
        gender: req.body.gender,
        firstName: req.body.firstName,
        lastName: req.body.lastName
      }).fetch();

    } catch (e) {
      return res.status(500).json({
        error: true
      });
    }

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`

    if(invite.emailAddress){
      await sails.helpers.email.with({
        to: invite.emailAddress,
        subject: 'Invite',
        text: `Cliquer ici pour accéder à votre consultation en ligne ${url}`,
      })
    }

    if(invite.phoneNumber){

      notifyPatientBySms(req.body.phoneNumber, `Cliquer ici pour accéder à votre consultation en ligne ${url}`);
    }

    return res.json({
      success: true,
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



  async resend(req, res){
    try {
      const invite = await PublicInvite.findOne({id: req.params.invite})

      const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`

      if(invite.emailAddress){
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: 'Invite',
          text: `Cliquer ici pour accéder à votre consultation en ligne ${url}`,
        })
      }

      if(invite.phoneNumber){

        notifyPatientBySms(req.body.phoneNumber, `Cliquer ici pour accéder à votre consultation en ligne ${url}`);
      }


    return res.json({
      success: true,
      invite
    });
    } catch (error) {
      console.log('error ', error)
      res.send()
    }

  },

  async revoke(req, res){

    try {
      await PublicInvite.destroyOne({id: req.params.invite})

      return res.status(200).send()
    } catch (error) {

      return res.status(500).send()
    }

  }

};
