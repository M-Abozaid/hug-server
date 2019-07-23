/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /** *************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/
  'get /app/*': 'DashboardController.get',
  'get /app': '/app/dashboard',
  'get /': '/app/dashboard',
  // '/dashboard': { view: 'pages/homepage' },
  'get /api/v1/subscribe-to-socket': 'SubscribeToSocketController.subscribe',
  'get /api/v1/subscribe-to-doctors': 'SubscribeToDoctorsController.subscribe',
  'post /api/v1/consultation/:consultation/read-messages': 'MessageController.readMessages',
  'get /api/v1/consultations-overview': 'ConsultationController.consultationOverview',
  'post /api/v1/consultation/:consultation/accept': 'ConsultationController.acceptConsultation',
  'post /api/v1/consultation/:consultation/close': 'ConsultationController.closeConsultation',
  'post /api/v1/consultation/:consultation/call': 'ConsultationController.call',
  'post /api/v1/consultation/:consultation/:message/reject-call': 'ConsultationController.rejectCall',
  'post /api/v1/consultation/:consultation/:message/accept-call': 'ConsultationController.acceptCall',
  'post /api/v1/consultation/:consultation/upload-file': 'ConsultationController.uploadFile',
  'post /api/v1/consultation/:consultation/send-report': 'ConsultationController.sendReport',
  'get /api/v1/consultation/:consultation/attachment/:attachment': 'ConsultationController.attachment',
  'POST /api/v1/login-local': 'AuthController.loginLocal',
  'GET /api/v1/login-cert': 'AuthController.loginCert',
  'GET /api/v1/login-saml': 'AuthController.loginSaml',
  'GET /api/v1/get-user': 'AuthController.getUser',
  'GET /api/v1/metadata': 'AuthController.metadata',
  'POST /api/v1/saml-callback': 'AuthController.samlCallback',

  '/logout': 'AuthController.logout'

  /** *************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/
  //

};
