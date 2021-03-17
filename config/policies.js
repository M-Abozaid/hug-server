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
    '*': false,
    ip: ['isLoggedIn'],
    find: ['isLoggedIn', 'isAdmin'],
    findOne: ['isLoggedIn', 'isAdmin'],
    populate: ['isLoggedIn', 'isAdmin'],
    create: ['isLoggedIn', 'isAdmin'],
    update: ['isLoggedIn', 'isAdmin'],
    addDoctorToQueue: ['isLoggedIn', 'isAdmin'],
    removeDoctorFromQueue: ['isLoggedIn', 'isAdmin'],
    getDoctorQueues: ['isLoggedIn', 'isAdmin'],
    add: ['isLoggedIn', 'isAdmin'],
    destroy: ['isLoggedIn', 'isAdmin'],
    remove: ['isLoggedIn', 'isAdmin'],
    replace: ['isLoggedIn', 'isAdmin'],
    getUser: ['isLoggedIn', 'isDoctorOrAdmin'],
    updateNotif: ['isLoggedIn', 'isDoctor']
  },
  countController: {
    count: ['isLoggedIn', 'isAdmin']
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
    acceptConsultation: ['isLoggedIn', 'isDoctor', 'isAssignedTo'],
    closeConsultation: ['isLoggedIn', 'isDoctor', 'isConsultationOwner'],
    create: ['isLoggedIn', 'setConsultationOwner'],
    destroy: ['isLoggedIn', 'isNurseOrPatient'],
    uploadFile: ['isLoggedIn', 'setMessageDestination'],
    attachment: ['isLoggedIn', 'isConsultationOwner'],
    sendReport: ['isLoggedIn', 'isDoctor', 'isConsultationOwner'],
    call: ['isLoggedIn', 'isConsultationOwner'],
    rejectCall: ['isLoggedIn', 'isConsultationParticipant'],
    acceptCall: ['isLoggedIn', 'isConsultationParticipant'],
    patientFeedback: ['isLoggedIn', 'isNurseOrPatient'],
    doctorFeedback: ['isLoggedIn', 'isConsultationOwner'],
    consultationsCSV: ['isLoggedIn', 'isAdmin'],
    testCall: true,
    getCurrentCall: ['isLoggedIn', 'isConsultationParticipant']
    // findOne: ['isLoggedIn', 'isConsultationOwnerOrTranslator']

  },
  AuthController: {
    loginLocal: true,
    loginCert: true,
    loginSaml: true,
    loginInvite: true,
    loginSms: true,
    login2FA: true,
    metadata: true,
    forgotPassword: true,
    resetPassword: true,
    getCurrentUser: true,
    samlCallback: true,
    getConfig: true,
    logout: true,
  },
  SupportController: {
    supportRequest: ['isLoggedIn']
  },
  InviteController: {
    '*': false,
    invite: ['isLoggedIn', 'isDoctorOrAdmin', 'setPublicInviteOwner'],
    resend: ['isLoggedIn', 'isDoctor'],
    revoke: ['isLoggedIn', 'isDoctor'],
    findByConsultation: ['isLoggedIn', 'isDoctor'],
    findByToken: true
  },

  PublicInviteController: {
    '*': false,
    find: ['isLoggedIn', 'isDoctorOrAdmin', 'isInviteOwner']
  },

  QueueController: {
    '*': false,
    find: ['isLoggedIn', 'isDoctorOrAdmin'],
    create: ['isLoggedIn', 'isAdmin'],
    destroy: ['isLoggedIn', 'isAdmin'],
    update: ['isLoggedIn', 'isAdmin']
  },

  TranslationOrganizationController: {
    '*': false,
    find: ['isLoggedIn', 'isDoctorOrAdmin'],
    create: ['isLoggedIn', 'isAdmin'],
    destroy: ['isLoggedIn', 'isAdmin'],
    update: ['isLoggedIn', 'isAdmin']
  },

  Translator: {
    '*': ['isLoggedIn', 'isDoctorOrAdmin']
  },
  TranslatorController: {
    '*': false,
    acceptRequest: true,
    refuseRequest: true,
    findConsultation: ['isLoggedIn'],
    find:['isLoggedIn', 'isAdmin'],
    findOne:['isLoggedIn', 'isAdmin'],
    update:['isLoggedIn', 'isAdmin'],
    create:['isLoggedIn', 'isAdmin'],
    destroy: ['isLoggedIn', 'isAdmin'],
  },
  Language: {
    '*': false,
    find: ['isLoggedIn', 'isDoctorOrAdmin'],
    create: ['isLoggedIn', 'isAdmin'],
    destroy: ['isLoggedIn', 'isAdmin'],
    update: ['isLoggedIn', 'isAdmin']
  }
};
