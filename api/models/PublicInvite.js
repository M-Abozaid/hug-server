/**
 * PublicInvite.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
const moment = require('moment');
moment.locale('fr');
const schedule = require('node-schedule');

const FIRST_INVITE_REMINDER = 24 * 60 * 60 * 1000;
const SECOND_INVITE_REMINDER = 60 * 1000;
const TRANSLATOR_REQUEST_TIMEOUT = 24 * 60 * 60 * 1000;
const testingUrl = `${process.env.PUBLIC_URL}/#test-call`;
const crypto = require('crypto');
async function generateToken () {
  const buffer = await new Promise((resolve, reject) => {
    crypto.randomBytes(256, (ex, buffer) => {
      if (ex) {
        reject('error generating token');
      }
      resolve(buffer);
    });
  });
  const token = crypto
    .createHash('sha1')
    .update(buffer)
    .digest('hex');

  return token;
}

module.exports = {
  attributes: {
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    },
    gender: {
      type: 'string',
      isIn: ['male', 'female', 'other', 'unknown']
    },
    phoneNumber: {
      type: 'string'
    },
    emailAddress: {
      type: 'string',
      isEmail: true
    },
    inviteToken: {
      type: 'string'
    },
    status: {
      type: 'string',
      isIn: ['SENT', 'ACCEPTED', 'COMPLETE', 'REFUSED', 'CANCELED'],
      defaultsTo: 'SENT'
    },
    queue: {
      model: 'queue'
    },
    scheduledFor: {
      type: 'number'
    },
    // the doctor who sent the invite
    invitedBy: {
      model: 'user',
      required: false
    },
    type: {
      type: 'string',
      isIn: ['GUEST', 'PATIENT', 'TRANSLATOR_REQUEST', 'TRANSLATOR']
    },
    patientInvite: {
      model: 'publicInvite'
    },
    patientLanguage: {
      type: 'string'
    },
    doctorLanguage: {
      type: 'string'
    },
    translationOrganization: {
      model: 'translationOrganization'
    },
    guestEmailAddress: {
      type: 'string',
      isEmail: true
    },
    guestPhoneNumber: {
      type: 'string'
    },
    translator: {
      model: 'user',
      required: false
    },
    translatorRequestInvite: {
      model: 'publicInvite',
      required: false
    },
    translatorInvite: {
      model: 'publicInvite',
      required: false
    },
    guestInvite: {
      model: 'publicInvite',
      required: false
    }

  },
  customToJSON () {
    return _.omit(this, ['inviteToken']);
  },
  async beforeCreate (obj, proceed) {
    obj.inviteToken = await generateToken();
    return proceed();
  },
  generateToken,
  sendTranslationRequestInvite (invite, email) {
    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    const doctorLangCode = invite.doctorLanguage || process.env.DEFAULT_DOCTOR_LOCALE;
    const inviteTime = invite.scheduledFor ? moment(invite.scheduledFor).local(doctorLangCode).format('D MMMM YYYY HH:mm') : '';
    const nowDate = moment().local(doctorLangCode).format('D MMMM YYYY');
    const doctorLanguage = sails._t(doctorLangCode, doctorLangCode);
    const patientLanguage = sails._t(doctorLangCode, invite.patientLanguage);
    return sails.helpers.email.with({
      to: email,
      subject: sails._t(doctorLangCode, 'translation request email subject', { doctorLanguage, patientLanguage }),
      text: invite.scheduledFor ? sails._t(doctorLangCode, 'scheduled translation request email', { doctorLanguage, patientLanguage, inviteTime, url }) :
      sails._t(doctorLangCode, 'translation request email', { doctorLanguage, patientLanguage, inviteTime: nowDate, url })
    });
  },

  sendTranslatorInvite (invite, email) {
    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    const doctorLang = invite.doctorLanguage || process.env.DEFAULT_DOCTOR_LOCALE;

    return sails.helpers.email.with({
      to: email,
      subject: sails._t(doctorLang, 'translator login link email subject'),
      text: sails._t(doctorLang, 'translator login link email', url)
    });
  },

  setTranslatorRequestTimer (invite) {
    schedule.scheduleJob(new Date(Date.now() + TRANSLATOR_REQUEST_TIMEOUT), async () => {


      const translatorRequestInvite = await PublicInvite.findOne({ type: 'TRANSLATOR_REQUEST',
        id: invite.id }).populate('invitedBy').populate('patientInvite').populate('translationOrganization');
      if (translatorRequestInvite.status === 'SENT') {

        await PublicInvite.updateOne({ type: 'TRANSLATOR_REQUEST', id: invite.id }).set({ status: 'REFUSED' });
        await PublicInvite.updateOne({ id: translatorRequestInvite.patientInvite.id }).set({ status: 'CANCELED' });

        if (translatorRequestInvite.patientInvite.guestInvite) {
          await PublicInvite.updateOne({ id: translatorRequestInvite.patientInvite.guestInvite }).set({ status: 'CANCELED' });
        }

        if (translatorRequestInvite.invitedBy.email) {
          const docLocale = translatorRequestInvite.invitedBy.preferredLanguage || process.env.DEFAULT_DOCTOR_LOCALE;
          await sails.helpers.email.with({
            to: translatorRequestInvite.invitedBy.email,
            subject: sails._t(docLocale, 'translation request refused subject'),
            text: sails._t(docLocale, 'translation request refused body')
          });
        }
      }
    });
  },

  async sendPatientInvite (invite) {

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    const locale = invite.patientLanguage || process.env.DEFAULT_PATIENT_LOCALE;
    const inviteTime = invite.scheduledFor ? moment(invite.scheduledFor).local(locale).format('HH:mm') : '';

    const message = invite.scheduledFor ? sails._t(locale, 'scheduled patient invite', testingUrl, inviteTime) : sails._t(locale, 'patient invite', url);
    // don't send invite if there is a translator required
    if (invite.emailAddress) {
      try {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: sails._t(locale, 'your consultation link'),
          text: message
        });
      } catch (error) {
        console.log('error Sending patient invite email', error);
        if (!invite.phoneNumber) {
          // await PublicInvite.destroyOne({ id: invite.id });
          return Promise.reject(error);
        }

      }
    }

    if (invite.phoneNumber) {
      try {
        await sails.helpers.sms.with({
          phoneNumber: invite.phoneNumber,
          message
        });

      } catch (error) {
        console.log('ERROR SENDING SMS>>>>>>>> ', error);
        // await PublicInvite.destroyOne({ id: invite.id });
        return Promise.reject(error);
      }
    }
  },

  async sendGuestInvite (invite) {

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    const locale = invite.patientLanguage || process.env.DEFAULT_PATIENT_LOCALE;
    const inviteTime = invite.scheduledFor ? moment(invite.scheduledFor).local(locale).format('HH:mm') : '';

    const message = invite.scheduledFor ? sails._t(locale, 'scheduled guest invite', inviteTime, testingUrl) : sails._t(locale, 'guest invite', url);
    // don't send invite if there is a translator required
    if (invite.emailAddress) {
      try {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: sails._t(locale, 'your consultation link'),
          text: message
        });
      } catch (error) {
        console.log('error Sending guest invite email', error);
        if (!invite.phoneNumber) {
          // await PublicInvite.destroyOne({ id: invite.id });
          return Promise.reject(error);
        }

      }
    }


    if (invite.phoneNumber) {
      try {
        await sails.helpers.sms.with({
          phoneNumber: invite.phoneNumber,
          message
        });

      } catch (error) {
        console.log('ERROR SENDING SMS>>>>>>>> ', error);
        // await PublicInvite.destroyOne({ id: invite.id });
        return Promise.reject(error);
      }
    }
  },


  setPatientOrGuestInviteReminders (invite) {

    const url = `${process.env.PUBLIC_URL}?invite=${invite.inviteToken}`;
    const locale = invite.patientLanguage || process.env.DEFAULT_PATIENT_LOCALE;
    const inviteTime = moment(invite.scheduledFor).local(locale).format('HH:mm');
    const firstReminderMessage = invite.type === 'PATIENT' ? sails._t(locale, 'first invite reminder', inviteTime) : sails._t(locale, 'first guest invite reminder', inviteTime);
    const secondReminderMessage = invite.type === 'PATIENT' ? sails._t(locale, 'second invite reminder', url) : sails._t(locale, 'second guest invite reminder', url);

    if (invite.phoneNumber) {

      if (invite.scheduledFor - Date.now() > FIRST_INVITE_REMINDER) {
        schedule.scheduleJob(new Date(invite.scheduledFor - FIRST_INVITE_REMINDER), async () => {
          await sails.helpers.sms.with({
            phoneNumber: invite.phoneNumber,
            message: firstReminderMessage
          });
        });
      }
      schedule.scheduleJob(new Date(invite.scheduledFor - SECOND_INVITE_REMINDER), async () => {
        await sails.helpers.sms.with({
          phoneNumber: invite.phoneNumber,
          message: secondReminderMessage
        });
      });
    }

    if (invite.emailAddress) {
      if (invite.scheduledFor - Date.now() > FIRST_INVITE_REMINDER) {
        schedule.scheduleJob(new Date(invite.scheduledFor - FIRST_INVITE_REMINDER), async () => {
          await sails.helpers.email.with({
            to: invite.emailAddress,
            subject: sails._t(locale, 'your consultation link'),
            text: firstReminderMessage
          });

        });
      }
      schedule.scheduleJob(new Date(invite.scheduledFor - SECOND_INVITE_REMINDER), async () => {
        await sails.helpers.email.with({
          to: invite.emailAddress,
          subject: sails._t(locale, 'your consultation link'),
          text: secondReminderMessage
        });

      });
    }

  },
  async destroyPatientInvite (invite) {
    if (invite.guestInvite) {
      await PublicInvite.destroyOne({ id: invite.guestInvite });
      await User.destroyOne({ username: invite.guestInvite });
    }
    if (invite.translatorRequestInvite) {
      await PublicInvite.destroyOne({ id: invite.translatorRequestInvite });

    }
    if (invite.translatorInvite) {
      await PublicInvite.destroyOne({ id: invite.translatorInvite });
      await User.destroyOne({ username: invite.translatorInvite });
    }

    await PublicInvite.destroyOne({ id: invite.id });
    await User.destroyOne({ username: invite.id });
  },
  async refuseTranslatorRequest (translatorRequestInvite) {


    translatorRequestInvite = await PublicInvite.findOne({ id: translatorRequestInvite.id }).populate('invitedBy').populate('patientInvite').populate('translationOrganization');

    await PublicInvite.updateOne({ type: 'TRANSLATOR_REQUEST', id: translatorRequestInvite.id }).set({ status: 'REFUSED' });
    await PublicInvite.updateOne({ id: translatorRequestInvite.patientInvite.id }).set({ status: 'CANCELED' });

    if (translatorRequestInvite.patientInvite.guestInvite) {
      await PublicInvite.updateOne({ id: translatorRequestInvite.patientInvite.guestInvite }).set({ status: 'CANCELED' });
    }

    if (translatorRequestInvite.invitedBy.email) {
      const docLocale = translatorRequestInvite.invitedBy.preferredLanguage || process.env.DEFAULT_DOCTOR_LOCALE;
      await sails.helpers.email.with({
        to: translatorRequestInvite.invitedBy.email,
        subject: sails._t(docLocale, 'translation request refused subject'),
        text: sails._t(docLocale, 'translation request refused body')
      });
    }

  }

};
