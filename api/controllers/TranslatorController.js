/**
 * TranslatorController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */





module.exports = {


  async acceptRequest (req, res) {

    const locale = req.headers.locale || process.env.DEFAULT_PATIENT_LOCALE;
    try {

      const translatorRequestInvite = await PublicInvite.findOne({ type: 'TRANSLATOR_REQUEST', inviteToken: req.params.translationRequestToken });

      if (!translatorRequestInvite) {
        return res.status(404).json({
          success: false,
          error: {
            name: 'ERROR_NO_INVITE',
            message: 'invite doesn\'t exist',
            userMessage: sails._t(locale, 'invalid invite')
          }
        });

      }

      // if it has been accepted return error
      if (translatorRequestInvite.status === 'ACCEPTED') {
        return res.status(400).json({
          success: false,
          error: {
            name: 'ERROR_INVITE_ACCEPTED',
            message: 'invite have already been accepted',
            userMessage: sails._t(locale, 'invite have been accepted')
          }
        });
      }



      // set invite as accepted
      await PublicInvite.updateOne({ type: 'TRANSLATOR_REQUEST', inviteToken: req.params.translationRequestToken }).set({ status: 'ACCEPTED' });

      try {
        const translatorInviteData = {
          patientInvite: translatorRequestInvite.patientInvite,
          organization: translatorRequestInvite.organization,
          invitedBy: translatorRequestInvite.invitedBy,
          scheduledFor: translatorRequestInvite.scheduledFor,
          patientLanguage: translatorRequestInvite.patientLanguage,
          doctorLanguage: translatorRequestInvite.doctorLanguage,
          type: 'TRANSLATOR',
          translatorRequestInvite: translatorRequestInvite.id
        };

        const translatorInvite = await PublicInvite.create(translatorInviteData).fetch();


        const newUser = {
          username: translatorInvite.id,
          firstName: '',
          lastName: '',
          role: 'translator',
          password: '',
          temporaryAccount: true,
          inviteToken: translatorInvite.id
        };

        newUser.firstName = req.body.name;
        newUser.direct = req.body.direct;
        newUser.email = req.body.email;


        await User.create(newUser);


        await PublicInvite.sendTranslatorInvite(translatorInvite, newUser.email);

        // send patient invite
        const patientInvite = await PublicInvite.findOne({ id: translatorRequestInvite.patientInvite });

        await PublicInvite.sendPatientInvite(patientInvite);

        if (patientInvite.scheduledFor) {
          await PublicInvite.setPatientInviteReminders(invite);
        }

      } catch (err) {
        console.log('Error accepting translation request', err);
        await PublicInvite.updateOne({ type: 'TRANSLATOR_REQUEST', inviteToken: req.params.translationRequestToken }).set({ status: 'SENT' });

        return res.status(500).send();
      }



      return res.status(200).json({
        success: true
      });

    } catch (err) {
      console.log('Error accepting translation request', err);

      return res.status(500).send();
    }


  },
  async findConsultation (req, res) {
    const consultation = await Consultation.findOne({ translator: req.user.id });

    if (!consultation) {
      return res.status(404).send();
    }

    return res.status(200).json(consultation);
  }
};

