/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



function notifyPatientBySms(phoneNumber, message) {
  if (!phoneNumber || phoneNumber.length === 0) {
    console.error('The phone number is mandatory to send an SMS');
    return;
  }
  if (!message || message.length === 0) {
    console.error('The message is mandatory to send an SMS');
    return;
  }

  if ('SMS_OVH_ENDPOINT' in process.env
    && 'SMS_OVH_APP_KEY' in process.env
    && 'SMS_OVH_APP_SECRET' in process.env
    && 'SMS_OVH_APP_CONSUMER_KEY' in process.env) {
    console.log(`Sending an SMS to ${phoneNumber} through OVH`);
    return sendSmsWithOvh(phoneNumber, message);
  } else if ('SMS_SWISSCOM_ACCOUNT' in process.env
    && 'SMS_SWISSCOM_PASSWORD' in process.env
    && 'SMS_SWISSCOM_SENDER' in process.env) {
    console.log(`Sending an SMS to ${phoneNumber} through Swisscom`);
    return sendSmsWithSwisscom(phoneNumber, message);
  } else {
    console.error('No SMS gateway configured');
  }
}

/**
 * Sends an SMS through the OVH SMS API.
 *
 * @param {string} phoneNumber
 * @param {string} message
 * @returns {void}
 */
function sendSmsWithOvh(phoneNumber, message) {
  const ovhConfig = {
    endpoint: process.env.SMS_OVH_ENDPOINT,
    appKey: process.env.SMS_OVH_APP_KEY,
    appSecret: process.env.SMS_OVH_APP_SECRET,
    consumerKey: process.env.SMS_OVH_APP_CONSUMER_KEY,
  };
  console.log(ovhConfig);
  const ovh = require('ovh')(ovhConfig);

  console.log('Sending SMS...');

  return new Promise((resolve, reject)=>{
    ovh.request('GET', '/sms', (err, serviceName) => {
      if (err) {
        console.log(err, serviceName);
        return reject(err);
      }

      // Send a simple SMS with a short number using your serviceName
      ovh.request('POST', `/sms/${serviceName}/jobs/`, {
        sender: process.env.SMS_OVH_SENDER,
        message,
        senderForResponse: false,
        receivers: [phoneNumber]
      }, (errsend, result) => {
        console.error(errsend, result);
        if(errsend){
         return reject(errsend)
        }
        return resolve()
      });
    });

  })

}

/**
 * Sends an SMS through the Swisscom REST plateform.
 *
 * @param {string} phoneNumber - The phone number to send the SMS to.
 * @param {string} message - The short message to send.
 * @returns {void}
 */
function sendSmsWithSwisscom(phoneNumber, message) {
  const https = require('https')

  const payload = {
    destination_addr: phoneNumber,
    dest_addr_ton: 1,
    dest_addr_npi: 1,
    source_addr: process.env.SMS_SWISSCOM_SENDER,
    source_addr_ton: 1,
    source_addr_npi: 1,
    short_message: message
  };

  return new Promise((resolve, reject)=>{
    const request = https.request(
      `https://messagingproxy.swisscom.ch:4300/rest/1.0.0/submit_sm/${process.env.SMS_SWISSCOM_ACCOUNT}`,
      {
        method: 'POST',
        auth: `${process.env.SMS_SWISSCOM_ACCOUNT}:${process.env.SMS_SWISSCOM_PASSWORD}`,
        headers: {
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            console.log(parsedData);
            if ('message_id' in parsedData) {
              return resolve();
            }
            console.error(parsedData);
            return reject(parsedData)
          } catch (e) {
            console.error(e.message);
            return reject(e)
          }
        });
      }
    );
    try {
    request.on('error', (e) => {
      console.error(e.message);
      return reject(e)
    });
    console.log('Siss come auth header  ', `${process.env.SMS_SWISSCOM_ACCOUNT}:${process.env.SMS_SWISSCOM_PASSWORD}`)
    console.log('SISSCOME URI',  `https://messagingproxy.swisscom.ch:4300/rest/1.0.0/submit_sm/${process.env.SMS_SWISSCOM_ACCOUNT}`)
      console.log('SWISSCOM JSON PAYLOAD..............')
      console.log(JSON.stringify(payload))
      request.write(JSON.stringify(payload));
      request.end();
    } catch (error) {

      console.log('error write to request ', error)
      return reject(error)
    }


  })

}

/**
 * Creates the invitation SMS text to be sent to a patient.
 *
 * @param {string} inviteUrl - The URL of the invitation.
 * @returns {string} - The invitation SMS message.
 */
function getSmsText(inviteUrl) {
  return `Cliquez ici pour accéder à votre vidéo consultation avec votre médecin HUG : ${inviteUrl}`;
}

/**
 * Creates the invitation email content to be sent to a patient.
 *
 * @param {string} inviteUrl - The URL of the invitation.
 * @returns {string} - The invitation email content.
 */
function getEmailText(inviteUrl) {
  return `Cliquez ici pour accéder à votre vidéo consultation avec votre médecin HUG : ${inviteUrl}`;
}

/**
 *
 * returns array of errors
 *
 * @param {object} invite
 */
function validateInviteRequest(invite){
  const errors = []
  if(!invite.phoneNumber && !invite.emailAddress){
    errors.push({ message: 'emailAddress or phoneNumber are required'})
  }

  if(!invite.gender){
    errors.push({ message: 'gender is required'})

  }
  if(invite.gender){
    if(!['male','female'].includes(invite.gender)){
      errors.push({message:'gender must be either male or female'})
    }
  }
  if(!invite.firstName){
    errors.push({ message: 'firstName is required'})

  }
  if(!invite.lastName){
    errors.push({ message: 'lastName is required'})

  }
  if(!invite.queue){
    errors.push({ message: 'queue is required'})
  }


  return errors
}

module.exports = {
  async invite(req, res) {
    let invite = null;
    console.log("create invite now");

    const errors = validateInviteRequest(req.body)
    if(errors.length){
      return res.status(400).json(errors)
    }

    const queue = await Queue.findOne({ or : [
      { name: req.body.queue },
      { id: req.body.queue }
    ]})

    if(!queue){
      return res.status(400).json({
        error: true,
        message: `queue ${req.body.queue} doesn't exist`
      })
    }

    try {
      invite = await PublicInvite.create({
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress,
        gender: req.body.gender,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        queue: queue.id
      }).fetch();

    } catch (e) {
      console.log("error", e);
      return res.status(500).json({
        error: true
      });
    }

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`

    if (invite.emailAddress) {
      try {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: 'Invite',
          text: getEmailText(url),
        })
      } catch (error) {
        if(!invite.phoneNumber){
          await PublicInvite.destroyOne({ id: invite.id })
          return res.status(500).json({
            error: true,
            message: 'Error sending email'
          });
        }

      }
    }

    if (invite.phoneNumber) {
      try {
        await notifyPatientBySms(req.body.phoneNumber, getSmsText(url));
      } catch (error) {
        console.log('ERROR SENDING SMS>>>>>>>> ', error)
        await PublicInvite.destroyOne({ id: invite.id })
        return res.status(500).json({
          error: true,
          message: 'Error sending SMS'
        });
      }
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



  /**
   * resend invite
   * @param {*} req
   * @param {*} res
   */
  async resend(req, res) {
    try {
      const invite = await PublicInvite.findOne({ id: req.params.invite })
      const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`

      if (invite.emailAddress) {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: 'Invite',
          text: getEmailText(url),
        })
      }

      if (invite.phoneNumber) {
        notifyPatientBySms(invite.phoneNumber, getSmsText(url));
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

  async revoke(req, res) {

    try {
      await PublicInvite.destroyOne({ id: req.params.invite })

      return res.status(200).send()
    } catch (error) {
      sails.log('error deleting Invite ', error);

      return res.status(500).send()
    }

  }

};
