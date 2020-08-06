/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */



const db = PublicInvite.getDatastore().manager;
const ObjectId = require('mongodb').ObjectID;





// /**
//  *
//  *
//  * @param {string} inviteUrl the url for the translator invite page
//  * @returns {string} - The invitation Email text
//  */
// function getTranslationInviteText (inviteUrl, scheduledFor, languageOne, languageTwo) {
//   const scheduledForText = (scheduledFor ? ` at ${moment(scheduledFor).format('D MMMM à HH:mm')}. ` : ' ');
//   return `Bonjour, You have been invited to translate between ${languageOne} and ${languageTwo}${
//     scheduledForText
//   } Please visit this url to accept the invite ${inviteUrl}`;
// }


/**
 *
 * returns array of errors
 *
 * @param {object} invite
 */
function validateInviteRequest (invite) {
  const errors = [];
  if (!invite.phoneNumber && !invite.emailAddress) {
    errors.push({ message: 'emailAddress or phoneNumber are required' });
  }

  if (!invite.gender) {
    errors.push({ message: 'gender is required' });

  }
  if (invite.gender) {
    if (!['male', 'female'].includes(invite.gender)) {
      errors.push({ message: 'gender must be either male or female' });
    }
  }
  if (!invite.firstName) {
    errors.push({ message: 'firstName is required' });

  }
  if (!invite.lastName) {
    errors.push({ message: 'lastName is required' });

  }


  return errors;
}



async function createTranslationRequest (translationInvite, organization) {

  // if organization has main email sent to that email
  if (organization.mainEmail) {
    return PublicInvite.sendTranslationRequestInvite(translationInvite, organization.mainEmail);
  }
  // if not
  // get all translators under organization
  const translatorCollection = db.collection('translator');
  const translator = await translatorCollection.findOne({ organization: new ObjectId(organization.id), languages: { $all: [translationInvite.doctorLanguage, translationInvite.patientLanguage] } });

  if (!translator) {
    return Promise.reject(`There are no translators for ${ translationInvite.patientLanguage }${translationInvite.doctorLanguage}`);
  }

  return PublicInvite.sendTranslationRequestInvite(translationInvite, translator.email);

}

// createTranslationRequest({patientLanguage:'fr', doctorLanguage:'en'},{id:"5f1aca5ff9c3b531dd462f5c"})




module.exports = {
  async invite (req, res) {
    let invite = null;
    console.log('create invite now');

    const errors = validateInviteRequest(req.body);
    if (errors.length) {
      return res.status(400).json(errors);
    }

    let queue;
    if (req.body.queue) {
      queue = await Queue.findOne({
        or: [
          { name: req.body.queue },
          { id: req.body.queue }
        ]
      });
    }


    if (req.body.queue && !queue) {
      return res.status(400).json({
        error: true,
        message: `queue ${req.body.queue} doesn't exist`
      });
    }

    let translationOrganization;
    if (req.body.translationOrganization) {
      translationOrganization = await TranslationOrganization.findOne({
        or: [
          { name: req.body.translationOrganization },
          { id: req.body.translationOrganization }
        ]
      });
    }

    if (req.body.translationOrganization && !translationOrganization) {
      return res.status(400).json({
        error: true,
        message: `translationOrganization ${req.body.translationOrganization} doesn't exist`
      });
    }


    try {
      // add other invite info
      // send invite to translator and guest
      const inviteData = {
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress,
        gender: req.body.gender,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        invitedBy: req.user.id,
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        patientLanguage: req.body.language,
        type: 'PATIENT'
      };
      if (queue) {
        inviteData.queue = queue.id;
      }


      if (translationOrganization) {
        inviteData.translationOrganization = translationOrganization.id;
      }

      if (req.body.guestEmailAddress) {
        inviteData.guestEmailAddress = req.body.guestEmailAddress;
      }

      if (req.body.guestPhoneNumber) {
        inviteData.guestPhoneNumber = req.body.guestPhoneNumber;
      }


      invite = await PublicInvite.create(inviteData).fetch();


      let guestInvite;
      if (inviteData.guestPhoneNumber || inviteData.guestEmailAddress) {

        const guestInviteDate = {
          patientInvite: invite.id,
          invitedBy: req.user.id,
          scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
          type: 'GUEST',
          guestEmailAddress: inviteData.guestEmailAddress,
          guestPhoneNumber: inviteData.guestPhoneNumber
        };

        guestInvite = await PublicInvite.create(guestInviteDate).fetch();
      }

      if (translationOrganization) {
        // create and send translator invite
        const translatorRequestInviteData = {
          patientInvite: invite.id,
          organization: translationOrganization.id,
          invitedBy: req.user.id,
          scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
          patientLanguage: req.body.language,
          doctorLanguage: req.body.doctorLanguage,
          type: 'TRANSLATOR_REQUEST'
        };

        const translatorRequestInvite = await PublicInvite.create(translatorRequestInviteData).fetch();

        createTranslationRequest(translatorRequestInvite, translationOrganization);

        return res.status(200).json({
          success: true,
          invite
        });
      }



      // send gust invite
      // guestInvite;

    } catch (e) {
      console.log('error', e);
      return res.status(500).json({
        error: true
      });
    }


    try {
      await PublicInvite.sendPatientInvite(invite);
    } catch (error) {
      console.log('ERROR SENDING Invite>>>>>>>> ', error);
      await PublicInvite.destroyOne({ id: invite.id });
      return res.status(500).json({
        error: true,
        message: 'Error sending Invite'
      });
    }


    if (invite.scheduledFor) {
      await PublicInvite.setPatientInviteReminders(invite);
    }

    return res.json({
      success: true,
      invite
    });

  },



  /**
   * resend invite
   * @param {*} req
   * @param {*} res
   */
  async resend (req, res) {
    try {
      const invite = await PublicInvite.findOne({ id: req.params.invite });

      await PublicInvite.sendPatientInvite(invite);


      return res.json({
        success: true,
        invite
      });
    } catch (error) {
      console.log('error ', error);
      res.send();
    }

  },

  async revoke (req, res) {

    try {
      await PublicInvite.destroyOne({ id: req.params.invite });

      return res.status(200).send();
    } catch (error) {
      sails.log('error deleting Invite ', error);

      return res.status(500).send();
    }

  },

  /**
   * Finds the public invite linked to a consultation
   */
  async findByConsultation (req, res) {
    req.params.consultation;

    const consultation = await Consultation.findOne({
      id: req.params.consultation
    });
    if (!consultation) {
      return res.notFound();
    }

    if (!consultation.invitationToken) {
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
  async findByToken (req, res) {

    const publicinvite = await PublicInvite.findOne({
      inviteToken: req.params.invitationToken
    });
    if (!publicinvite) {
      return res.notFound();
    }


    res.json(publicinvite);
  }

};
