/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /** *************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  '*': false,
  DashboardController: {
    get: true
  },
  SubscribeToSocketController: {
    subscribe: ['isLoggedIn']
  },
  SubscribeToDoctorsController: {
    subscribe: ['isLoggedIn', 'isDoctor']
  },
  // '/api/v1/subscribe-to-socket':['isLoggedIn'],
  UserController: {
    login: true,
    ip: ['isLoggedIn'],
    '*': false,
    create: ['isLoggedIn', 'isAdmin']
  },
  MessageController: {
    '*': false,
    create: ['isLoggedIn', 'setMessageDestination'],
    find: ['isLoggedIn', 'isConsultationOwner'],
    readMessages: ['isLoggedIn', 'isConsultationOwner']
  },
  ConsultationController: {
    '*': false,
    consultationOverview: ['isLoggedIn'],
    acceptConsultation: ['isLoggedIn', 'isDoctor'],
    closeConsultation: ['isLoggedIn', 'isDoctor', 'isConsultationOwner'],
    create: ['isLoggedIn', 'isNurseOrPatient', 'setConsultationOwner'],
    destroy: ['isLoggedIn', 'isNurseOrPatient'],
    uploadFile: ['isLoggedIn', 'setMessageDestination'],
    attachment: ['isLoggedIn', 'isConsultationOwner'],
    sendReport: ['isLoggedIn', 'isDoctor', 'isConsultationOwner'],
    call: ['isLoggedIn', 'isConsultationOwner'],
    rejectCall: ['isLoggedIn', 'isConsultationOwner'],
    acceptCall: ['isLoggedIn', 'isConsultationOwner'],
    feedback: ['isLoggedIn', 'isNurseOrPatient'],
  },
  AuthController: {
    loginLocal: true,
    loginCert: true,
    loginSaml: true,
    loginInvite: true,
    loginSms: true,
    login2FA: true,
    metadata: true,
    getUser: ['isLoggedIn'],
    samlCallback: true
  },
  SupportController: {
    supportRequest: ['isLoggedIn'],
  },
  InviteController:{
    '*':false,
    invite: ['isLoggedIn', 'isDoctor'],
    resend: ['isLoggedIn', 'isDoctor'],
    revoke: ['isLoggedIn', 'isDoctor'],
    findByConsultation: ['isLoggedIn', 'isDoctor'],
  },

  PublicInviteController: {
    '*':false,
    find: ['isLoggedIn', 'isDoctor'],
  },

  QueueController: {
    '*':false,
    find: ['isLoggedIn', 'isDoctor'],
    create: ['isLoggedIn', 'isAdmin'],
  }
};
