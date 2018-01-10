var models = require('../../models');
var passport = require('passport');
var requestUtil = require('./requestUtil');
var responseUtil = require('./responseUtil');
var tagsUtil = require('./tagsUtil');


module.exports = function(app, baseUrl) {
  var apiUrl = baseUrl + '/tags';

  /**
   * @api {post} /api/v1/tags Adds a new tag
   * @apiName AddTag
   * @apiGroup Tag
   *
   * @apiDescription This call is used to tag a recording. Only users that can
   * view a recording can tag it. It takes a `tag` field which contains a JSON
   * object string that may contain any of the following fields:
   * - animal
   * - confidence
   * - startTime
   * - duration
   * - number
   * - trapType
   * - trapInteractionTime
   * - trapInteractionDuration
   * - trappedTime
   * - killedTime
   * - poisionedTime
   * - sex
   * - age
   *
   * @apiUse V1UserAuthorizationHeader
   *
   * @apiParam {Number} recordingId ID of the recording that you want to tag.
   * @apiparam {JSON} tag Tag data in JSON format.
   *
   * @apiUse V1ResponseSuccess
   * @apiSuccess {Number} tagId ID of the tag just added.
   *
   * @apiuse V1ResponseError
   *
   */
  app.post(
    apiUrl,
    passport.authenticate(['jwt'], { session: false }),
    async function(req, res) {
      // Check that authentication was from a user not a device.
      if (req.user !== null && !requestUtil.isFromAUser(req)) {
        return responseUtil.notFromAUser(res);
      }
      return tagsUtil.handleRecordingPOST(req, res);
    }
  );

  // Delete a tag
  app.delete(apiUrl, passport.authenticate(['jwt'], { session: false }),
    async function(req, res) {

      // Check that authentication was from a user not a device.
      if (req.user !== null && !requestUtil.isFromAUser(req)) {
        return responseUtil.notFromAUser(res);
      }

      // Check that the required field is given.
      var id = parseInt(req.body.tagId);
      if (!id) {
        return responseUtil.send(res, {
          statusCode: 400,
          success: false,
          messages: ['Missing "tagId" field.'],
        });
      }

      // Check that user has permission to delete the tag.
      //TODO
      /*
      var userCanDeleteTag = await models.Tag.userCanDelete(req.body.tagId,
        req.user);
      if (!userCanDeleteTag)
        return responseUtil.send(res, {
          statusCode: 400,
          success: false,
          messages: [
            "Given user does not have permission to delete the tag."
          ]
        })
      */

      // Delete the tag
      var tagDeleteResult = await models.Tag.deleteFromId(req.body.tagId, req.user);
      if (tagDeleteResult) {
        return responseUtil.send(res, {
          statusCode: 200,
          success: true,
          messages: ["Deleted tag."]
        });
      } else {
        return responseUtil.send(res, {
          statusCode: 400,
          success: false,
          messages: ["Failed to delete tag."]
        });
      }
    });
};
