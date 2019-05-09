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

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  '*': false,
  DashboardController:{
    get:true
  },
  SubscribeToSocketController:{
    subscribe: ['isLoggedIn']
  },
  SubscribeToDoctorsController:{
    subscribe: ['isLoggedIn', 'isDoctor']
  },
  // '/api/v1/subscribe-to-socket':['isLoggedIn'],
  UserController:{
    'login': true,
    '*': false ,
    create:[ 'isLoggedIn', 'isAdmin'],

  },
  MessageController:{

    '*': false,
    create: ['isLoggedIn', 'setMessageDestination'],
    find:['isLoggedIn', 'isConsultationOwner'],
    readMessages:['isLoggedIn', 'isConsultationOwner'],
  },
  ConsultationController:{

    '*': false,
    consultationOverview: ['isLoggedIn'],
    acceptConsultation:['isLoggedIn', 'isDoctor'],
    create:['isLoggedIn', 'isNurse', 'setConsultationOwner'],
    destroy:['isLoggedIn', 'isNurse', 'setConsultationOwner'],
    uploadFile: ['isLoggedIn', 'setMessageDestination'],
    attachment: ['isLoggedIn', 'isConsultationOwner'],
    sendReport: ['isLoggedIn', 'isConsultationOwner']
  },
  AuthController: {
    login:true
  }

};
