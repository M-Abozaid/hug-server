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

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/
  'get /app/*': 'DashboardController.get',
  'get /app': 'DashboardController.get',
  'get /' :'/app/dashboard',
  // '/dashboard': { view: 'pages/homepage' },
  'post /api/openvidu-session': 'OpenviduSessionController.getToken',
  'get /api/subscribe-to-socket': 'SubscribeToSocketController.subscribe',
  'get /api/subscribe-to-doctors':'SubscribeToDoctorsController.subscribe',
  'patch /api/read-messages':'MessageController.readMessages',
  'get /api/consultations-overview':'ConsultationController.consultationOverview',
  'post /api/consultation/:consultation/accept': 'ConsultationController.acceptConsultation',
  'post /api/consultation/:consultation/call': 'ConsultationController.call',
  'post /api/consultation/:consultation/reject-call': 'ConsultationController.rejectCall',
  'POST /api/login': 'AuthController.login',
  '/logout': 'AuthController.logout',

  /***************************************************************************
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
