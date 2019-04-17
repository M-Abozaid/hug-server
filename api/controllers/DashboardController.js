/**
 * DashboardController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const path = require('path');
module.exports = {

  get : function(req, res){
    res.view('pages/homepage');
  }

};

