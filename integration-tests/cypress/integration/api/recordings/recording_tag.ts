/// <reference path="../../../support/index.d.ts" />
import {
  HTTP_Forbidden,
  HTTP_Unprocessable,
  NOT_NULL_STRING,
} from "@commands/constants";

import { RecordingProcessingState, RecordingType } from "@typedefs/api/consts";
import { ApiRecordingSet } from "@commands/types";
import { getCreds } from "@commands/server";
import { getTestName } from "@commands/names";

import { TestCreateRecordingData } from "@commands/api/recording-tests";
import {
  ApiRecordingTagRequest,
  ApiRecordingTagResponse,
} from "@typedefs/api/tag";

const EXCLUDE_IDS = ["[].id"];

describe("Recordings: tag", () => {
  const templateRecording: ApiRecordingSet = {
    type: RecordingType.ThermalRaw,
    fileHash: null,
    duration: 15.6666666666667,
    recordingDateTime: "2021-07-17T20:13:17.248Z",
    location: [-45.29115, 169.30845],
    additionalMetadata: {
      algorithm: 31143,
      previewSecs: 5,
      totalFrames: 141,
    },
    metadata: {
      tracks: [
        {
          start_s: 2,
          end_s: 5,
          predictions: [{ confident_tag: "cat", confidence: 0.9, model_id: 1 }],
        },
      ],
    },
    comment: "This is a comment",
    processingState: RecordingProcessingState.Finished,
  };

  const tag1: ApiRecordingTagRequest = {
    detail: "animal in trap",
    confidence: 100,
  };

  const expectedTag1: ApiRecordingTagResponse = {
    id: -99,
    detail: "animal in trap",
    confidence: 100,
    startTime: null,
    duration: null,
    automatic: false,
    taggerId: 99,
    taggerName: "xxx",
    createdAt: NOT_NULL_STRING,
  };

  before(() => {
    //Create group1 with 2 devices, admin and member
    cy.testCreateUserGroupAndDevice("tagGroupAdmin", "tagGroup", "tagCamera1");
    cy.apiDeviceAdd("tagCamera1b", "tagGroup");
    cy.apiUserAdd("tagGroupMember");

    //Add admin & member to Camera1
    cy.apiUserAdd("tagDeviceAdmin");
    cy.apiUserAdd("tagDeviceMember");
    cy.apiGroupUserAdd("tagGroupAdmin", "tagGroupMember", "tagGroup", true);
    //!! cy.apiDeviceUserAdd("tagGroupAdmin", "tagDeviceAdmin", "tagCamera1", true);
    //!! cy.apiDeviceUserAdd("tagGroupAdmin", "tagDeviceMember", "tagCamera1", true);

    //Create group2 with admin and device
    cy.testCreateUserGroupAndDevice(
      "tagGroup2Admin",
      "tagGroup2",
      "tagCamera2"
    );
  });

  it("Group admin can add and delete device's tags", () => {
    const recording1 = TestCreateRecordingData(templateRecording);
    const expectedTag = JSON.parse(JSON.stringify(expectedTag1));
    expectedTag.taggerId = getCreds("tagGroupAdmin").id;
    expectedTag.taggerName = getTestName("tagGroupAdmin");

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording1");

    cy.log("Tag recording");
    cy.apiRecordingTagAdd("tagGroupAdmin", "tagRecording1", "tagTag1", tag1);

    cy.log("Check recording tag can be viewed correctly");
    cy.testRecordingTagCheck(
      "tagGroupAdmin",
      "tagRecording1",
      [expectedTag],
      EXCLUDE_IDS
    );
    cy.log("Delete tag");
    cy.apiRecordingTagDelete("tagGroupAdmin", "tagRecording1", "tagTag1");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagGroupAdmin", "tagRecording1", []);
  });

  it("Group member can add and delete device's tags", () => {
    const recording1 = TestCreateRecordingData(templateRecording);
    const expectedTag = JSON.parse(JSON.stringify(expectedTag1));
    expectedTag.taggerId = getCreds("tagGroupMember").id;
    expectedTag.taggerName = getTestName("tagGroupMember");

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording2");

    cy.log("Tag recording");
    cy.apiRecordingTagAdd("tagGroupMember", "tagRecording2", "tagTag2", tag1);

    cy.log("Check recording tag can be viewed correctly");
    cy.testRecordingTagCheck(
      "tagGroupMember",
      "tagRecording2",
      [expectedTag],
      EXCLUDE_IDS
    );
    cy.log("Delete tag");
    cy.apiRecordingTagDelete("tagGroupMember", "tagRecording2", "tagTag2");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagGroupMember", "tagRecording2", []);
  });

  it("Device admin can add and delete device's tags", () => {
    const recording3 = TestCreateRecordingData(templateRecording);
    const expectedTag = JSON.parse(JSON.stringify(expectedTag1));
    expectedTag.taggerId = getCreds("tagDeviceAdmin").id;
    expectedTag.taggerName = getTestName("tagDeviceAdmin");

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording3, undefined, "tagRecording3");

    cy.log("Tag recording");
    cy.apiRecordingTagAdd("tagDeviceAdmin", "tagRecording3", "tagTag3", tag1);

    cy.log("Check recording tag can be viewed correctly");
    cy.testRecordingTagCheck(
      "tagDeviceAdmin",
      "tagRecording3",
      [expectedTag],
      EXCLUDE_IDS
    );
    cy.log("Delete tag");
    cy.apiRecordingTagDelete("tagDeviceAdmin", "tagRecording3", "tagTag3");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagDeviceAdmin", "tagRecording3", []);
  });

  it("Device member can add and delete device's tags", () => {
    const recording1 = TestCreateRecordingData(templateRecording);
    const expectedTag = JSON.parse(JSON.stringify(expectedTag1));
    expectedTag.taggerId = getCreds("tagDeviceMember").id;
    expectedTag.taggerName = getTestName("tagDeviceMember");

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording4");

    cy.log("Tag recording");
    cy.apiRecordingTagAdd("tagDeviceMember", "tagRecording4", "tagTag4", tag1);

    cy.log("Check recording tag can be viewed correctly");
    cy.testRecordingTagCheck(
      "tagDeviceMember",
      "tagRecording4",
      [expectedTag],
      EXCLUDE_IDS
    );
    cy.log("Delete tag");
    cy.apiRecordingTagDelete("tagDeviceMember", "tagRecording4", "tagTag4");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagDeviceMember", "tagRecording4", []);
  });

  it("Cannot add tag for a device you don't have permissions for", () => {
    const recording1 = TestCreateRecordingData(templateRecording);

    cy.log("Add recording for a group 2 device");
    cy.apiRecordingAdd("tagCamera2", recording1, undefined, "tagRecording5");

    cy.log("Admin of group 1 cannot add a tag to group 2 recording");
    cy.apiRecordingTagAdd(
      "tagGroupAdmin",
      "tagRecording5",
      null,
      tag1,
      HTTP_Forbidden
    );

    cy.log("Check tag was not created");
    cy.testRecordingTagCheck("tagGroup2Admin", "tagRecording5", []);
  });

  it("Cannot delete tag for a device you don't have permissions for", () => {
    const recording1 = TestCreateRecordingData(templateRecording);
    const expectedTag = JSON.parse(JSON.stringify(expectedTag1));
    expectedTag.taggerId = getCreds("tagGroup2Admin").id;
    expectedTag.taggerName = getTestName("tagGroup2Admin");

    cy.log("Add recording for a group 2 device");
    cy.apiRecordingAdd("tagCamera2", recording1, undefined, "tagRecording6");

    cy.log("Add a tag to group 2 recording");
    cy.apiRecordingTagAdd("tagGroup2Admin", "tagRecording6", "tagTag6", tag1);

    cy.log("Check group 1 admin cannot delete group2 tag");
    cy.apiRecordingTagDelete(
      "tagGroupAdmin",
      "tagRecording6",
      "tagTag6",
      HTTP_Forbidden
    );

    cy.log("Check recording tag was not deleted");
    cy.testRecordingTagCheck(
      "tagGroup2Admin",
      "tagRecording6",
      [expectedTag],
      EXCLUDE_IDS
    );
  });

  it("Can delete another user's tag", () => {
    const recording1 = TestCreateRecordingData(templateRecording);

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording7");

    cy.log("groupAdmin Tags recording");
    cy.apiRecordingTagAdd("tagGroupAdmin", "tagRecording7", "tagTag7", tag1);

    cy.log("deviceMember can delete tag");
    cy.apiRecordingTagDelete("tagDeviceMember", "tagRecording7", "tagTag7");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagDeviceMember", "tagRecording7", []);
  });

  it("Correct handling of invalid recording id", () => {
    cy.log("Attempt to tag non-existant recording");
    cy.apiRecordingTagAdd(
      "tagGroupAdmin",
      "999999",
      null,
      tag1,
      HTTP_Forbidden,
      { useRawRecordingId: true }
    );
  });

  it("Can set all valid tag fields", () => {
    const fullTag: ApiRecordingTagRequest = {
      detail: "blah blah blah",
      confidence: 0.9,
      startTime: 13.4,
      duration: 2.3,
      what: "morepork",
      automatic: true,
      version: 1,
    };
    const expectedTag: ApiRecordingTagResponse = {
      id: -99,
      detail: "blah blah blah",
      confidence: 0.9,
      startTime: 13.4,
      duration: 2.3,
      what: "morepork",
      automatic: true,
      //TODO: version not returned
      //  version: 1,
      createdAt: NOT_NULL_STRING,
      taggerId: getCreds("tagGroupAdmin").id,
      taggerName: getTestName("tagGroupAdmin"),
    };

    const recording1 = TestCreateRecordingData(templateRecording);

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording9");

    cy.log("Tag recording");
    cy.apiRecordingTagAdd("tagGroupAdmin", "tagRecording9", "tagTag9", fullTag);

    cy.log("Check recording tag can be viewed correctly");
    cy.testRecordingTagCheck(
      "tagGroupAdmin",
      "tagRecording9",
      [expectedTag],
      EXCLUDE_IDS
    );
    cy.log("Delete tag");
    cy.apiRecordingTagDelete("tagGroupAdmin", "tagRecording9", "tagTag9");

    cy.log("Check tag no longer exists");
    cy.testRecordingTagCheck("tagGroupAdmin", "tagRecording9", []);
  });

  it("Correct handling of invalid tag data", () => {
    const fullTag: ApiRecordingTagRequest = {
      detail: "blah blah blah",
      confidence: 0.9,
      startTime: 13.4,
      duration: 2.3,
      what: "morepork",
      automatic: true,
      version: 1,
    };

    const recording1 = TestCreateRecordingData(templateRecording);

    cy.log("Add recording as device");
    cy.apiRecordingAdd("tagCamera1", recording1, undefined, "tagRecording10");

    cy.log("Missing mandatory params");
    const ft1 = JSON.parse(JSON.stringify(fullTag));
    delete ft1.condifence;
    //TODO: accepted without confidence despite API saying 'mandatory'
    //cy.apiRecordingTagAdd("tagGroupAdmin","tagRecording10","tagTag10",ft1, HTTP_Unprocessable);

    cy.log("additional params");
    const ft2 = JSON.parse(JSON.stringify(fullTag));
    ft2["badParam"] = "hello";
    cy.apiRecordingTagAdd(
      "tagGroupAdmin",
      "tagRecording10",
      "tagTag10",
      ft2,
      HTTP_Unprocessable
    );

    cy.log("Bad value");
    const ft3 = JSON.parse(JSON.stringify(fullTag));
    ft3["startTime"] = "hello";
    cy.apiRecordingTagAdd(
      "tagGroupAdmin",
      "tagRecording10",
      "tagTag10",
      ft3,
      HTTP_Unprocessable
    );
  });
});
