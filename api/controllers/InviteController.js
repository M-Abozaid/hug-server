/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const schedule = require('node-schedule');
const moment = require('moment');
moment.locale('fr');

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
 *
 *
 * @param {string} inviteUrl - The URL of the invitation.
 * @returns {string} - The invitation SMS message.
 */
function getInviteReminderText(inviteUrl) {
  return `Votre consultation démarre dans une minute : ${inviteUrl}`;
}

/**
 *
 *
 * @param {number} scheduledFor -
 * @returns {string} - The invitation SMS message.
 */
function getInvite24HReminderText(scheduledFor) {
  return `Rappel J-1
  Votre consultation de télémédecine @home aura lieu demain à ${moment(scheduledFor).format('HH:mm')}.`;
}

/**
 *
 *
 * @param {string} testingUrl - The URL to hit the test page.
 * @returns {string} - The invitation SMS message.
 */
function getScheduledInviteText(testingUrl, scheduledFor) {
  return `Bonjour, Vous avez été invité pour une consultation de télémédecine @Home le ` +
  `${moment(scheduledFor).format('D MMMM à HH:mm')}. ` +
  `Nous vous conseillons dors et déjà de tester la compatibilité de votre appareil avec le lien suivant. ${testingUrl}`
  ;
}


/**
 * Creates the invitation email content to be sent to a patient.
 *
 * @param {string} inviteUrl - The URL of the invitation.
 * @returns {string} - The invitation email content.
 */
function getEmailText(inviteUrl) {
  return `Cliquez ici pour accéder à votre vidéo consultation avec votre médecin : ${inviteUrl}`;
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

    let queue;
    if(req.body.queue){
      queue = await Queue.findOne({
        or: [
          { name: req.body.queue },
          { id: req.body.queue }
        ]
      })
    }


    if (req.body.queue && !queue) {
      return res.status(400).json({
        error: true,
        message: `queue ${req.body.queue} doesn't exist`
      })
    }

    try {
      const inviteData = {
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress,
        gender: req.body.gender,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        invitedBy: req.user.id,
        scheduledFor: req.body.scheduledFor? new Date(req.body.scheduledFor): undefined
      }
      if(queue){
        inviteData.queue = queue.id
      }

      invite = await PublicInvite.create(inviteData).fetch();

    } catch (e) {
      console.log("error", e);
      return res.status(500).json({
        error: true
      });
    }

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`
    const testingUrl = `${process.env.PUBLIC_URL}/#test-call`

    if (invite.emailAddress) {
      try {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: 'Votre lien de consultation',
          text: invite.scheduledFor? getScheduledInviteText(testingUrl, invite.scheduledFor ):getEmailText(url),
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
          message: invite.scheduledFor? getScheduledInviteText(testingUrl, invite.scheduledFor ): getSmsText(url)
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

    if(invite.scheduledFor){
      if (invite.phoneNumber) {

        if(invite.scheduledFor - Date.now() > 24*60*60*1000){
          schedule.scheduleJob(new Date(invite.scheduledFor - 24*60*60*1000), async function(){
            await sails.helpers.sms.with({
              phoneNumber: req.body.phoneNumber,
              message: getInvite24HReminderText(invite.scheduledFor)
            })
          })
        }
        schedule.scheduleJob(new Date(invite.scheduledFor - 60*1000), async function(){
          await sails.helpers.sms.with({
            phoneNumber: req.body.phoneNumber,
            message: getInviteReminderText(url)
          })
        })
      }

      if (invite.emailAddress) {
        if(invite.scheduledFor - Date.now() > 24*60*60*1000){
          schedule.scheduleJob(new Date(invite.scheduledFor - 24*60*60*1000), async function(){
            await sails.helpers.email.with({
              to: invite.emailAddress,
              subject: 'Votre lien de consultation',
              text: getInvite24HReminderText(invite.scheduledFor),
            })

          })
        }
        schedule.scheduleJob(new Date(invite.scheduledFor - 60*1000), async function(){
          await sails.helpers.email.with({
            to: invite.emailAddress,
            subject: 'Votre lien de consultation',
            text: getInviteReminderText(url),
          })

        })
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
          subject: 'Votre lien de consultation',
          text: getEmailText(url),
        })
      }

      if (invite.phoneNumber) {
        await sails.helpers.sms.with({
          phoneNumber: invite.phoneNumber,
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

  },

  /**
   * Finds the public invite linked to a consultation
   */
  async findByConsultation(req, res) {
    req.params.consultation;

    const consultation = await Consultation.findOne({
      id: req.params.consultation
    });
    if (!consultation) {
      return res.notFound();
    }

    if(!consultation.invitationToken){
      return res.notFound();

    }
    const publicinvite = await PublicInvite.findOne({
      inviteToken: consultation.invitationToken
    });
    if (!publicinvite) {
      return res.notFound();
    }

    res.json(publicinvite);
  },


    /**
   * Finds the public invite By token
   */
  async findByToken(req, res) {

    const publicinvite = await PublicInvite.findOne({
      inviteToken: req.params.invitationToken
    });
    if (!publicinvite) {
      return res.notFound();
    }

    res.json(publicinvite);
  }
};
