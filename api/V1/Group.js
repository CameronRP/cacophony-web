var models = require('../../models');
var util = require('./util');
var jwt = require('jsonwebtoken');
var config = require('../../config/config');
var passport = require('passport');
var responseUtil = require('./responseUtil');
require('../../passportConfig')(passport);

module.exports = function(app, baseUrl) {
  var apiUrl = baseUrl + '/groups';

  /**
   * @api {post} /api/v1/groups Create a new group
   * @apiName NewGroup
   * @apiGroup Group
   *
   * @apiDescription Creates a new group with the user used in the JWT as the admin.
   *
   * @apiUse V1UserAuthorizationHeader
   *
   * @apiParam {String} groupname Unique group name.
   *
   * @apiUse V1ResponseSuccess
   *
   * @apiUse V1ResponseError
   */
  app.post(apiUrl, passport.authenticate(['jwt'], { session: false }), function(req, res) {
    // Check that required data is given.
    if (!req.body.groupname) {
      return responseUtil.send(res, {
        statusCode: 400,
        success: false,
        messages: ['Missing groupname.']
      });
    }

    // Checks that groupname is free, creates group
    // then sets user as admin and group user.
    models.Group.getIdFromName(req.body.groupname)
      .then(function(groupId) {
        if (groupId) {  // Throw error if groupename is allready used.
          var err = new Error('Groupname in use.');
          err.invalidRequest = true;
          throw err;
        }
        return models.Group.create({ // Create new Group.
          groupname: req.body.groupname,
        });
      })
      .then(function(group) { // Created new Group.
        return group.addUser(req.user.id, {admin: true});
      })
      .then(function() {
        responseUtil.send(res, {
          statusCode: 200,
          success: true,
          messages: ['Created new group.']
        });
      })
      .catch(function(err) { // Error with creating Group.
        if (err.invalidRequest) {
          return responseUtil.send(res, {
            statusCode: 400,
            success: false,
            messages: [err.message]
          });
        } else {
          responseUtil.serverError(res, err);
        }
      });
  });
};
