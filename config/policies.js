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
    create: ['isLoggedIn', 'isNurse', 'setConsultationOwner'],
    destroy: ['isLoggedIn', 'isNurse'],
    uploadFile: ['isLoggedIn', 'setMessageDestination'],
    attachment: ['isLoggedIn', 'isConsultationOwner'],
    sendReport: ['isLoggedIn', 'isDoctor', 'isConsultationOwner'],
    call: ['isLoggedIn', 'isConsultationOwner'],
    rejectCall: ['isLoggedIn', 'isConsultationOwner'],
    acceptCall: ['isLoggedIn', 'isConsultationOwner']
  },
  AuthController: {
    loginLocal: true,
    loginCert: true,
    loginSaml: true,
    loginInvite: true,
    metadata: true,
    getUser: ['isLoggedIn'],
    samlCallback: true
  },
  SupportController: {
    supportRequest: ['isLoggedIn'],
  },
  InviteController:{
    '*':false,
    invite: true,//['isLoggedIn', 'isDoctor'],
  },

  PublicInviteController: {
    '*':false,
    find:true
  }
};
