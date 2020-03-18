/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


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
function validateInviteRequest(invite) {
  const errors = []
  if (!invite.phoneNumber && !invite.emailAddress) {
    errors.push({ message: 'emailAddress or phoneNumber are required' })
  }

  if (!invite.gender) {
    errors.push({ message: 'gender is required' })

  }
  if (invite.gender) {
    if (!['male', 'female'].includes(invite.gender)) {
      errors.push({ message: 'gender must be either male or female' })
    }
  }
  if (!invite.firstName) {
    errors.push({ message: 'firstName is required' })

  }
  if (!invite.lastName) {
    errors.push({ message: 'lastName is required' })

  }
  if (!invite.queue) {
    errors.push({ message: 'queue is required' })
  }


  return errors
}

module.exports = {
  async invite(req, res) {
    let invite = null;
    console.log("create invite now");

    const errors = validateInviteRequest(req.body)
    if (errors.length) {
      return res.status(400).json(errors)
    }

    const queue = await Queue.findOne({
      or: [
        { name: req.body.queue },
        { id: req.body.queue }
      ]
    })

    if (!queue) {
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
          subject: 'Votre lien de consultation',
          text: getEmailText(url),
        })
      } catch (error) {
        if (!invite.phoneNumber) {
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
        await sails.helpers.sms.with({
          phoneNumber: req.body.phoneNumber,
          message: getSmsText(url)
        })

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
        await sails.helpers.sms.with({
          phoneNumber: req.body.phoneNumber,
          message: getSmsText(url)
        })
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
