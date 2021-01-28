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
    await PublicInvite.sendTranslationRequestInvite(translationInvite, organization.mainEmail);
    return PublicInvite.setTranslatorRequestTimer(translationInvite);
  }
  // if not
  // get all translators under organization
  const translatorCollection = db.collection('translator');
  const translator = await translatorCollection.findOne({ organization: new ObjectId(organization.id), languages: { $all: [translationInvite.doctorLanguage, translationInvite.patientLanguage] } });

  if (!translator) {
    return Promise.reject(`There are no translators for ${ translationInvite.patientLanguage }${translationInvite.doctorLanguage}`);
  }

  await PublicInvite.sendTranslationRequestInvite(translationInvite, translator.email);
  return PublicInvite.setTranslatorRequestTimer(translationInvite);

}

// createTranslationRequest({patientLanguage:'fr', doctorLanguage:'en'},{id:"5f1aca5ff9c3b531dd462f5c"})




module.exports = {
  async invite (req, res) {
    let invite = null;
    console.log('create invite now');

    if (req.body.isPatientInvite) {

      const errors = validateInviteRequest(req.body);
      if (errors.length) {
        return res.status(400).json(errors);
      }
    } else {
      if (!req.body.translationOrganization && !req.body.guestPhoneNumber && !req.body.guestEmailAddress) {

        return res.status(400).json({
          success: false,
          error: 'You must invite at least a patient translator or a guest!'
        });
      }
    }


    if(req.user.role === 'scheduler'){
      if(!req.body.doctorEmail){
        return res.status(400).json({
          success: false,
          error: 'doctorEmail is required.'
        });
      }
    }

    let doctor;
    if(req.body.doctorEmail){
      // get doctor
      [doctor] = await User.find({role: 'doctor', email: req.body.doctorEmail})

      if(!doctor){
        return res.status(400).json({success: false, error: `Doctor with email ${req.body.doctorEmail} not found`})
      }
      // a
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



    if (translationOrganization && (translationOrganization.languages || []).indexOf(req.body.language) === -1) {
      return res.status(400).json({
        error: true,
        message: `patientLanguage ${req.body.language} doesn't exist`
      });
    }


    let guestInvite;

    try {
      // add other invite info
      // send invite to translator and guest
      const inviteData = {
        phoneNumber: req.body.phoneNumber,
        emailAddress: req.body.emailAddress,
        gender: req.body.gender,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        doctor: doctor? doctor.id: req.user.id,
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


      if (inviteData.guestPhoneNumber || inviteData.guestEmailAddress) {

        const guestInviteDate = {

          patientInvite: invite.id,
          doctor: doctor? doctor.id: req.user.id,
          invitedBy: req.user.id,
          scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
          type: 'GUEST',
          guestEmailAddress: inviteData.guestEmailAddress,
          guestPhoneNumber: inviteData.guestPhoneNumber,
          emailAddress: inviteData.guestEmailAddress,
          phoneNumber: inviteData.guestPhoneNumber,
          patientLanguage: req.body.language
        };

        guestInvite = await PublicInvite.create(guestInviteDate).fetch();

        await PublicInvite.updateOne({ id: invite.id }).set({ guestInvite: guestInvite.id });
      }

      if (translationOrganization) {
        // create and send translator invite
        const translatorRequestInviteData = {
          patientInvite: invite.id,
          translationOrganization: translationOrganization.id,
          doctor: doctor? doctor.id: req.user.id,
          invitedBy: req.user.id,
          scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
          patientLanguage: req.body.language,
          doctorLanguage: req.body.doctorLanguage || process.env.DEFAULT_DOCTOR_LOCALE,
          type: 'TRANSLATOR_REQUEST'
        };

        const translatorRequestInvite = await PublicInvite.create(translatorRequestInviteData).fetch();

        await PublicInvite.updateOne({ id: invite.id }).set({ translatorRequestInvite: translatorRequestInvite.id });

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
      if(req.user.role !== 'scheduler'){
        await PublicInvite.sendPatientInvite(invite);
      }
      if (guestInvite) {
        await PublicInvite.sendGuestInvite(guestInvite);
      }
    } catch (error) {
      console.log('ERROR SENDING Invite>>>>>>>> ', error);
      await PublicInvite.destroyOne({ id: invite.id });
      return res.status(500).json({
        error: true,
        message: 'Error sending Invite'
      });
    }


    if (invite.scheduledFor) {
      await PublicInvite.setPatientOrGuestInviteReminders(invite);
      if (guestInvite) {
        await PublicInvite.setPatientOrGuestInviteReminders(guestInvite);
      }
    }


    invite.patientURL = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    invite.doctorURL  = process.env.DOCTOR_URL
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
      const patientInvite = await PublicInvite.findOne({ id: req.params.invite }).populate('guestInvite').populate('translatorInvite').populate('translatorRequestInvite');

      if (!patientInvite) {
        return res.notFound();
      }

      if (patientInvite.translatorRequestInvite &&
        patientInvite.translatorRequestInvite.status !== 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          error: 'Translation invite have NOT been accepted'
        });
      }

      await PublicInvite.updateOne({ id: req.params.invite }).set({
        status: 'SENT'
      });
      await PublicInvite.sendPatientInvite(patientInvite);



      if (patientInvite.translatorInvite) {
        const translator = await User.findOne({ username: patientInvite.translatorInvite.id });
        await PublicInvite.updateOne({ id: patientInvite.translatorInvite.id }).set({
          status: 'SENT'
        });

        await PublicInvite.sendTranslatorInvite(patientInvite.translatorInvite, translator.email);
      }


      if (patientInvite.guestInvite) {
        await PublicInvite.updateOne({ id: patientInvite.guestInvite.id }).set({
          status: 'SENT'
        });

        await PublicInvite.sendGuestInvite(patientInvite.guestInvite);
      }


      return res.json({
        success: true,
        patientInvite
      });
    } catch (error) {
      console.log('error ', error);
      res.json({
        success: false,
        error: error.message
      });
    }

  },

  async revoke (req, res) {

    try {
      const invite = await PublicInvite.findOne({ id: req.params.invite });

      await PublicInvite.destroyPatientInvite(invite);

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
    }).populate('translationOrganization').populate('doctor');
    if (!publicinvite) {
      return res.notFound();
    }
    publicinvite.doctor = _.pick(publicinvite.doctor, ['firstName', 'lastName']);


    res.json(publicinvite);
  },

  async getConsultation(req, res){

    const [consultation] = await Consultation.find({invite: req.params.invite})

    if(!consultation){
      return res.notFound()
    }
    if(consultation.closedAt){
      consultation.duration = consultation.createAt = consultation.closedAt
    }

    consultation.doctorURL  = process.env.DOCTOR_URL + '/app/consultation' + consultation.id

    return res.status(200).json(consultation)
  }

};
