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

  SubscribeToSocketController:{
    subscribe: ['isLoggedIn']
  },
  SubscribeToDoctorsController:{
    subscribe: ['isLoggedIn', 'isDoctor']
  },
  // '/api/v1/subscribe-to-socket':['isLoggedIn'],
  UserController:{
    '*': 'isLoggedIn',
    create:'setRole',
    'login': true
  },
  MessageController:{

    '*': 'isLoggedIn',
    create: ['isLoggedIn', 'setMessageDestination'],
    find:['isLoggedIn', 'isConsultationOwner'],
    readMessages:['isLoggedIn', 'isConsultationOwner'],
  },
  ConsultationController:{

    '*': 'isLoggedIn',
    acceptConsultation:['isLoggedIn', 'isDoctor'],
    create:['isLoggedIn', 'isNurse', 'setConsultationOwner'],
    destroy:['isLoggedIn', 'isNurse', 'setConsultationOwner']
  }

};
