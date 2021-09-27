/// <reference path="../../../support/index.d.ts" />
import {
  //  HTTP_Unprocessable,
  //  HTTP_BadRequest,
  //HTTP_Forbidden,
  //HTTP_OK200,
  NOT_NULL,
} from "../../../commands/constants";
import {
  ApiRecordingReturned,
  ApiRecordingSet,
  ApiRecordingForProcessing,
  ApiAlertConditions,
} from "../../../commands/types";
import { getCreds } from "../../../commands/server";

import {
  TestCreateExpectedRecordingData,
  TestCreateRecordingData,
  TestCreateExpectedProcessingData,
} from "../../../commands/api/recording-tests";

describe("Recordings - processing tests", () => {
  const superuser = getCreds("superuser")["name"];
  const suPassword = getCreds("superuser")["password"];

  //Do not validate IDs
  //TODO: workaround for issue 81 - imprecise locations by default.  Remove location from here when fixed.
  const EXCLUDE_IDS = [
    ".Tracks[].TrackTags[].TrackId",
    ".Tracks[].id",
    ".location.coordinates",
  ];

  //Do not validate keys
  const EXCLUDE_KEYS = [".jobKey", ".rawFileKey"];

  const templateExpectedRecording: ApiRecordingReturned = {
    id: 892972,
    // TODO: Issue 87.  Filehash missing on returned values
    // fileHash: null,
    rawMimeType: "application/x-cptv",
    fileMimeType: null,
    processingState: "FINISHED",
    duration: 16.6666666666667,
    recordingDateTime: "2021-07-17T20:13:17.248Z",
    relativeToDawn: null,
    relativeToDusk: null,
    location: { type: "Point", coordinates: [-45.29115, 169.30845] },
    version: "345",
    batteryLevel: null,
    batteryCharging: null,
    airplaneModeOn: null,
    type: "thermalRaw",
    additionalMetadata: { algorithm: 31143, previewSecs: 5, totalFrames: 141 },
    GroupId: 246,
    StationId: 25,
    comment: "This is a comment",
    processing: null,
  };

  const templateExpectedProcessing: ApiRecordingForProcessing = {
    id: 475,
    type: "thermalRaw",
    jobKey: "e6ef8335-42d2-4906-a943-995499bd84e2",
    rawFileKey: "raw/2021/09/07/4d08a991-27e8-49c0-8c5a-fcf1031a42b8",
    rawMimeType: "application/x-cptv",
    fileKey: null,
    fileMimeType: null,
    processingState: "analyse",
    processingMeta: null,
    GroupId: 66,
    DeviceId: 99,
    StationId: null,
    recordingDateTime: "2021-07-17T20:13:17.248Z",
    duration: 15.6666666666667,
    location: { type: "Point", coordinates: [-45.29115, 169.30845] },
    hasAlert: false,
    processingStartTime: NOT_NULL,
    processingEndTime: null,
    processing: true,
    updatedAt: NOT_NULL,
  };

  const templateExpectedAudioProcessing: ApiRecordingForProcessing = {
    id: 475,
    type: "audio",
    jobKey: "e6ef8335-42d2-4906-a943-995499bd84e2",
    rawFileKey: "raw/2021/09/07/4d08a991-27e8-49c0-8c5a-fcf1031a42b8",
    //TODO: Issue 88 -should this be audio/mpeg
    rawMimeType: "video/mp4",
    fileKey: null,
    fileMimeType: null,
    processingState: "analyse",
    processingMeta: null,
    GroupId: 66,
    DeviceId: 99,
    StationId: null,
    recordingDateTime: "2021-07-17T20:13:17.248Z",
    duration: 60,
    location: { type: "Point", coordinates: [-43.53345, 172.64745] },
    hasAlert: false,
    processingStartTime: NOT_NULL,
    processingEndTime: null,
    processing: true,
    updatedAt: NOT_NULL,
  };

  const templateRecording: ApiRecordingSet = {
    type: "thermalRaw",
    fileHash: null,
    duration: 15.6666666666667,
    recordingDateTime: "2021-07-17T20:13:17.248Z",
    location: [-45.29115, 169.30845],
    version: "345",
    relativeToDawn: null,
    relativeToDusk: null,
    batteryCharging: null,
    batteryLevel: null,
    airplaneModeOn: null,
    additionalMetadata: {
      algorithm: 31143,
      previewSecs: 5,
      totalFrames: 141,
    },
    metadata: {},
    comment: "This is a comment",
    processingState: "analyse",
  };

  const templateAudioRecording: ApiRecordingSet = {
    type: "audio",
    fileHash: null,
    duration: 60,
    recordingDateTime: "2021-08-24T01:35:00.000Z",
    relativeToDawn: null,
    relativeToDusk: -17219,
    location: [-43.53345, 172.64745],
    version: "1.8.1",
    batteryCharging: "DISCHARGING",
    batteryLevel: 87,
    airplaneModeOn: false,
    additionalMetadata: {
      normal: "0",
      "SIM IMEI": "990006964660319",
      analysis: {
        cacophony_index: [
          { end_s: 20, begin_s: 0, index_percent: 80.8 },
          { end_s: 40, begin_s: 20, index_percent: 77.1 },
          { end_s: 60, begin_s: 40, index_percent: 71.6 },
        ],
        species_identify: [],
        cacophony_index_version: "2020-01-20_A",
        processing_time_seconds: 50.7,
        species_identify_version: "2021-02-01",
      },
      "SIM state": "SIM_STATE_READY",
      "Auto Update": false,
      "Flight Mode": false,
      "Phone model": "SM-G900V",
      amplification: 1.0721460589601806,
      SimOperatorName: "Verizon",
      "Android API Level": 23,
      "Phone manufacturer": "samsung",
      "App has root access": false,
    },
    comment: null,
    processingState: "analyse",
  };

  const POSSUM_ALERT: ApiAlertConditions[] = [
    { tag: "possum", automatic: true },
  ];

  //TODO: These tests will not currently work unless we have SU access as we need to be able to delete any
  //recordings that are in analyse state that do not belong to us.  This can be removed once
  //the analyse.test state has been implemented.  All analyse states in this test suite except the
  //first test below can then be changed to analyse.test
  if (Cypress.env("running_in_a_dev_environment") == true) {
    before(() => {
      //Create a group with 2 devices, admin user
      cy.testCreateUserGroupAndDevice("rpGroupAdmin", "rpGroup", "rpCamera1");
      cy.apiDeviceAdd("rpCamera1b", "rpGroup");

      //Add an alert to the 2nd device
      cy.apiAlertAdd(
        "rpGroupAdmin",
        "rpAlert1b",
        POSSUM_ALERT,
        "rpCamera1b",
        0
      );

      //Create a 2nd group with device and admin
      cy.testCreateUserGroupAndDevice("rpGroup2Admin", "rpGroup2", "rpCamera2");

      //Sign is as superuser so we have their JWT
      cy.apiSignInAs(null, null, superuser, suPassword);
    });

    beforeEach(() => {
      cy.testDeleteRecordingsInState(superuser, "thermalRaw", "analyse");
      cy.testDeleteRecordingsInState(superuser, "audio", "analyse");
    });

    it("Check default state for uploaded recording is analyse", () => {
      const recording1 = TestCreateRecordingData(templateRecording);
      delete recording1.processingState;
      let expectedRecording1: ApiRecordingReturned;
      cy.log("Add recording as device");
      cy.apiRecordingAdd(
        "rpCamera1",
        recording1,
        "oneframe.cptv",
        "rpRecording1"
      ).then(() => {
        expectedRecording1 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording1",
          "rpCamera1",
          "rpGroup",
          null,
          recording1
        );

        cy.log("Check recording status is 'analyse'");
        expectedRecording1.processingState = "analyse";
        expectedRecording1.processing = null;
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording1",
          expectedRecording1,
          EXCLUDE_IDS
        );
      });
    });

    it("Uploaded recording passes through correct processing steps", () => {
      const recording1 = TestCreateRecordingData(templateRecording);
      let expectedRecording1: ApiRecordingReturned;
      let expectedRecording1b: ApiRecordingReturned;
      let expectedRecording1c: ApiRecordingReturned;
      let expectedProcessing1: ApiRecordingForProcessing;

      cy.log("Add recording as device");
      cy.apiRecordingAdd(
        "rpCamera1",
        recording1,
        "oneframe.cptv",
        "rpRecording1"
      ).then(() => {
        expectedRecording1 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording1",
          "rpCamera1",
          "rpGroup",
          null,
          recording1
        );
        expectedProcessing1 = TestCreateExpectedProcessingData(
          templateExpectedProcessing,
          "rpRecording1",
          "rpCamera1",
          "rpGroup",
          null,
          recording1
        );

        cy.log("Check recording status is 'analyse'");
        expectedRecording1.processingState = "analyse";
        expectedRecording1.processing = null;
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording1",
          expectedRecording1,
          EXCLUDE_IDS
        );

        cy.log("Send for processing (tracking)");
        expectedProcessing1.processingStartTime = NOT_NULL;
        expectedProcessing1.updatedAt = NOT_NULL;
        cy.processingApiCheck(
          "thermalRaw",
          "analyse",
          "rpRecording1",
          expectedProcessing1,
          EXCLUDE_KEYS
        );

        cy.log("Check status");
        expectedRecording1b = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording1",
          "rpCamera1",
          "rpGroup",
          null,
          recording1
        );
        expectedRecording1b.processingState = "analyse";
        expectedRecording1b.processing = true;
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording1",
          expectedRecording1b,
          EXCLUDE_IDS
        );

        cy.log("Mark processing as done");
        cy.processingApiPut("rpRecording1", true, {}, true, undefined);

        cy.log("Check status (FINISHED)");
        expectedRecording1c = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording1",
          "rpCamera1",
          "rpGroup",
          null,
          recording1
        );
        expectedRecording1c.processingState = "FINISHED";
        expectedRecording1c.processing = false;
        expectedRecording1c.Tracks = [];
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording1",
          expectedRecording1c,
          EXCLUDE_IDS
        );

        cy.log("Check status (FINISHED)");
      });
    });

    it("Multiple recordings are procesed in 'oldest first' order", () => {
      const recording3 = TestCreateRecordingData(templateRecording);
      const recording4 = TestCreateRecordingData(templateRecording);
      const recording5 = TestCreateRecordingData(templateRecording);
      recording3.recordingDateTime = "2020-01-01T00:03:00.000Z";
      recording4.recordingDateTime = "2021-01-01T00:03:00.000Z";
      recording5.recordingDateTime = "2020-01-01T00:04:00.000Z";
      cy.apiRecordingAdd(
        "rpCamera1",
        recording3,
        "oneframe.cptv",
        "rpRecording3"
      ).then(() => {
        cy.apiRecordingAdd(
          "rpCamera1",
          recording4,
          "oneframe.cptv",
          "rpRecording4"
        ).then(() => {
          cy.apiRecordingAdd(
            "rpCamera1",
            recording5,
            "oneframe.cptv",
            "rpRecording5"
          ).then(() => {
            const expectedProcessing3 = TestCreateExpectedProcessingData(
              templateExpectedProcessing,
              "rpRecording3",
              "rpCamera1",
              "rpGroup",
              null,
              recording3
            );
            const expectedProcessing4 = TestCreateExpectedProcessingData(
              templateExpectedProcessing,
              "rpRecording4",
              "rpCamera1",
              "rpGroup",
              null,
              recording4
            );
            const expectedProcessing5 = TestCreateExpectedProcessingData(
              templateExpectedProcessing,
              "rpRecording5",
              "rpCamera1",
              "rpGroup",
              null,
              recording5
            );

            cy.log("Check recordings ordered by recordingDateTime (3,5,4)");
            cy.processingApiCheck(
              "thermalRaw",
              "analyse",
              "rpRecording3",
              expectedProcessing3,
              EXCLUDE_KEYS
            );
            cy.processingApiCheck(
              "thermalRaw",
              "analyse",
              "rpRecording5",
              expectedProcessing5,
              EXCLUDE_KEYS
            );
            cy.processingApiCheck(
              "thermalRaw",
              "analyse",
              "rpRecording4",
              expectedProcessing4,
              EXCLUDE_KEYS
            );

            //TODO: repeat for each stage of processing when multi-step processing is introduced
          });
        });
      });
    });

    it("Process recordings for device with animal-alerts before recordings from devices without", () => {
      //camera1 has no alerts, camera1b has 1 alert
      const recording6 = TestCreateRecordingData(templateRecording);
      const recording7 = TestCreateRecordingData(templateRecording);
      const recording8 = TestCreateRecordingData(templateRecording);
      const recording9 = TestCreateRecordingData(templateRecording);
      recording6.recordingDateTime = "2021-01-01T00:09:00.000Z";
      recording7.recordingDateTime = "2021-01-01T00:08:00.000Z";
      recording8.recordingDateTime = "2021-01-01T00:07:00.000Z";
      recording9.recordingDateTime = "2021-01-01T00:06:00.000Z";
      cy.apiRecordingAdd(
        "rpCamera1",
        recording6,
        "oneframe.cptv",
        "rpRecording6"
      ).then(() => {
        cy.apiRecordingAdd(
          "rpCamera1b",
          recording7,
          "oneframe.cptv",
          "rpRecording7"
        ).then(() => {
          cy.apiRecordingAdd(
            "rpCamera1",
            recording8,
            "oneframe.cptv",
            "rpRecording8"
          ).then(() => {
            cy.apiRecordingAdd(
              "rpCamera1b",
              recording9,
              "oneframe.cptv",
              "rpRecording9"
            ).then(() => {
              const expectedProcessing6 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording6",
                "rpCamera1",
                "rpGroup",
                null,
                recording6
              );
              const expectedProcessing7 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording7",
                "rpCamera1b",
                "rpGroup",
                null,
                recording7
              );
              expectedProcessing7.hasAlert = true;
              const expectedProcessing8 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording8",
                "rpCamera1",
                "rpGroup",
                null,
                recording8
              );
              const expectedProcessing9 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording9",
                "rpCamera1b",
                "rpGroup",
                null,
                recording9
              );
              expectedProcessing9.hasAlert = true;

              cy.log(
                "Check recordings ordered by alerts first, oldest first (9,7,8,6)"
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording9",
                expectedProcessing9,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording7",
                expectedProcessing7,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording9",
                expectedProcessing8,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording6",
                expectedProcessing6,
                EXCLUDE_KEYS
              );

              //TODO: repeat for each stage of processing when multi-step processing is introduced
            });
          });
        });
      });
    });

    it("Process thermalRaw and audio recordings in separate queues", () => {
      const recording10 = TestCreateRecordingData(templateRecording);
      const recording11 = TestCreateRecordingData(templateAudioRecording);
      const recording12 = TestCreateRecordingData(templateRecording);
      const recording13 = TestCreateRecordingData(templateAudioRecording);
      recording10.recordingDateTime = "2021-01-01T00:09:00.000Z";
      recording11.recordingDateTime = "2021-01-01T00:08:00.000Z";
      recording12.recordingDateTime = "2021-01-01T00:07:00.000Z";
      recording13.recordingDateTime = "2021-01-01T00:06:00.000Z";
      cy.apiRecordingAdd(
        "rpCamera1",
        recording10,
        "oneframe.cptv",
        "rpRecording10"
      ).then(() => {
        cy.apiRecordingAdd(
          "rpCamera1",
          recording11,
          "60sec-audio.mp4",
          "rpRecording11"
        ).then(() => {
          cy.apiRecordingAdd(
            "rpCamera1",
            recording12,
            "oneframe.cptv",
            "rpRecording12"
          ).then(() => {
            cy.apiRecordingAdd(
              "rpCamera1",
              recording13,
              "60sec-audio.mp4",
              "rpRecording13"
            ).then(() => {
              const expectedProcessing10 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording10",
                "rpCamera1",
                "rpGroup",
                null,
                recording10
              );
              const expectedProcessing11 = TestCreateExpectedProcessingData(
                templateExpectedAudioProcessing,
                "rpRecording11",
                "rpCamera1",
                "rpGroup",
                null,
                recording11
              );
              const expectedProcessing12 = TestCreateExpectedProcessingData(
                templateExpectedProcessing,
                "rpRecording12",
                "rpCamera1",
                "rpGroup",
                null,
                recording12
              );
              const expectedProcessing13 = TestCreateExpectedProcessingData(
                templateExpectedAudioProcessing,
                "rpRecording13",
                "rpCamera1",
                "rpGroup",
                null,
                recording13
              );

              cy.log(
                "Check recordings ordered by oldest first with audio and thermal in different queues"
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording12",
                expectedProcessing12,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "thermalRaw",
                "analyse",
                "rpRecording10",
                expectedProcessing10,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "audio",
                "analyse",
                "rpRecording13",
                expectedProcessing13,
                EXCLUDE_KEYS
              );
              cy.processingApiCheck(
                "audio",
                "analyse",
                "rpRecording11",
                expectedProcessing11,
                EXCLUDE_KEYS
              );

              //TODO: repeat for each stage of processing once GP's changes are integrated
            });
          });
        });
      });
    });

    it("Tracking stage can add tracks and tags to the recording", () => {
      const recording18 = TestCreateRecordingData(templateRecording);
      cy.apiRecordingAdd(
        "rpCamera1",
        recording18,
        "oneframe.cptv",
        "rpRecording18"
      ).then(() => {
        const expectedProcessing18 = TestCreateExpectedProcessingData(
          templateExpectedProcessing,
          "rpRecording18",
          "rpCamera1",
          "rpGroup",
          null,
          recording18
        );
        const expectedRecording18 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording18",
          "rpCamera1",
          "rpGroup",
          null,
          recording18
        );

        cy.log("Send for processing");
        cy.processingApiCheck(
          "thermalRaw",
          "analyse",
          "rpRecording18",
          expectedProcessing18,
          EXCLUDE_KEYS
        );

        cy.log("Look up algorithm and then post tracks");
        cy.processingApiAlgorithmPost({ "tracking-format": 42 }).then(
          (algorithmId) => {
            cy.processingApiTracksPost(
              "rpTrack18",
              "rpRecording18",
              { start_s: 1, end_s: 4 },
              algorithmId
            );

            cy.log("Check tracks added to recording");
            expectedRecording18.processing = true;
            expectedRecording18.processingState = "analyse";
            expectedRecording18.Tracks = [
              {
                TrackTags: [],
                data: { start_s: 1, end_s: 4 },
                id: 1,
              },
            ];
            cy.apiRecordingCheck(
              "rpGroupAdmin",
              "rpRecording18",
              expectedRecording18,
              EXCLUDE_IDS
            ).then(() => {
              cy.log("Check tags added to recording/track");
              expectedRecording18.Tracks = [
                {
                  TrackTags: [
                    {
                      what: "possum",
                      automatic: true,
                      TrackId: getCreds("rpTrack18").id,
                      confidence: 0.9,
                      UserId: null,
                      data: "master",
                      User: null,
                    },
                  ],
                  data: { start_s: 1, end_s: 4 },
                  id: 1,
                },
              ];

              cy.processingApiTracksTagsPost(
                "rpTrack18",
                "rpRecording18",
                "possum",
                0.9,
                { name: "master" }
              );
              cy.apiRecordingCheck(
                "rpGroupAdmin",
                "rpRecording18",
                expectedRecording18,
                EXCLUDE_IDS
              ).then(() => {
                cy.log("set processing to done and recheck tracks");
                cy.processingApiPut("rpRecording18", true, {}, true, undefined);
                expectedRecording18.processing = false;
                expectedRecording18.processingState = "FINISHED";
                cy.apiRecordingCheck(
                  "rpGroupAdmin",
                  "rpRecording18",
                  expectedRecording18,
                  EXCLUDE_IDS
                );
              });
            });
          }
        );
      });
    });

    it("Tracking stage can delete tracks and tags from the recording", () => {
      const recording19 = TestCreateRecordingData(templateRecording);
      cy.apiRecordingAdd(
        "rpCamera1",
        recording19,
        "oneframe.cptv",
        "rpRecording19"
      ).then(() => {
        const expectedProcessing19 = TestCreateExpectedProcessingData(
          templateExpectedProcessing,
          "rpRecording19",
          "rpCamera1",
          "rpGroup",
          null,
          recording19
        );
        const expectedRecording19 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording19",
          "rpCamera1",
          "rpGroup",
          null,
          recording19
        );

        cy.log("Send for processing");
        cy.processingApiCheck(
          "thermalRaw",
          "analyse",
          "rpRecording19",
          expectedProcessing19,
          EXCLUDE_KEYS
        );

        cy.log("Look up algorithm and then post tracks");
        cy.processingApiAlgorithmPost({ "tracking-format": 42 }).then(
          (algorithmId) => {
            cy.processingApiTracksPost(
              "rpTrack19",
              "rpRecording19",
              { start_s: 1, end_s: 4 },
              algorithmId
            );

            cy.log("Check tracks added to recording");
            expectedRecording19.processing = true;
            expectedRecording19.processingState = "analyse";
            expectedRecording19.Tracks = [
              {
                TrackTags: [],
                data: { start_s: 1, end_s: 4 },
                id: 1,
              },
            ];
            cy.apiRecordingCheck(
              "rpGroupAdmin",
              "rpRecording19",
              expectedRecording19,
              EXCLUDE_IDS
            ).then(() => {
              cy.log("Check tags added to recording/track");
              expectedRecording19.Tracks = [
                {
                  TrackTags: [
                    {
                      what: "possum",
                      automatic: true,
                      TrackId: getCreds("rpTrack19").id,
                      confidence: 0.9,
                      UserId: null,
                      data: "master",
                      User: null,
                    },
                  ],
                  data: { start_s: 1, end_s: 4 },
                  id: 1,
                },
              ];
              cy.processingApiTracksTagsPost(
                "rpTrack19",
                "rpRecording19",
                "possum",
                0.9,
                { name: "master" }
              );
              cy.apiRecordingCheck(
                "rpGroupAdmin",
                "rpRecording19",
                expectedRecording19,
                EXCLUDE_IDS
              ).then(() => {
                cy.log("Delete the track and check tracks deleted");
                cy.processingApiTracksDelete("rpRecording19");
                expectedRecording19.Tracks = [];
                cy.apiRecordingCheck(
                  "rpGroupAdmin",
                  "rpRecording19",
                  expectedRecording19,
                  EXCLUDE_IDS
                ).then(() => {
                  cy.log("set processing to done and recheck tracks");
                  cy.processingApiPut(
                    "rpRecording19",
                    true,
                    {},
                    true,
                    undefined
                  );
                  expectedRecording19.processing = false;
                  expectedRecording19.processingState = "FINISHED";
                  cy.apiRecordingCheck(
                    "rpGroupAdmin",
                    "rpRecording19",
                    expectedRecording19,
                    EXCLUDE_IDS
                  );
                });
              });
            });
          }
        );
      });
    });

    //This is a single test to check that alerts are triggered by processing
    //Full tests of the alerts logic are done through the recording upload API
    //TODO: Work out why this test does not generate an alert - it should!!!
    it.skip("Alert when desired animal is detected by processing", () => {
      //Note: camera 1b has an alert for possums
      const recording20 = TestCreateRecordingData(templateRecording);
      cy.apiRecordingAdd(
        "rpCamera1b",
        recording20,
        "oneframe.cptv",
        "rpRecording20"
      ).then(() => {
        cy.createExpectedAlert(
          "expectedAlert20",
          "rpAlert1b",
          0,
          POSSUM_ALERT,
          true,
          "rpGroupAdmin",
          "rpCamera1b"
        ).then(() => {
          cy.createExpectedEvent(
            "expectedEvent20",
            "rpGroupAdmin",
            "rpCamera1b",
            "rpRecording20",
            "rpAlert1b"
          );
        });

        const expectedProcessing20 = TestCreateExpectedProcessingData(
          templateExpectedProcessing,
          "rpRecording20",
          "rpCamera1b",
          "rpGroup",
          null,
          recording20
        );
        expectedProcessing20.hasAlert = true;

        cy.log("Send for processing and check is flagges as hasAlert");
        cy.processingApiCheck(
          "thermalRaw",
          "analyse",
          "rpRecording20",
          expectedProcessing20,
          EXCLUDE_KEYS
        );

        cy.log("Look up algorithm and then post tracks");
        cy.processingApiAlgorithmPost({ "tracking-format": 42 }).then(
          (algorithmId) => {
            cy.processingApiTracksPost(
              "rpTrack20",
              "rpRecording20",
              { start_s: 1, end_s: 4 },
              algorithmId
            );

            cy.log("Add tags");
            cy.processingApiTracksTagsPost(
              "rpTrack20",
              "rpRecording20",
              "possum",
              0.9,
              { name: "master" }
            ).then(() => {
              cy.log("set processing to done and recheck tracks");
              cy.processingApiPut(
                "rpRecording20",
                true,
                {},
                true,
                undefined
              ).then(() => {
                cy.log("Check an event was generated");
                cy.apiAlertCheck(
                  "rpGroupAdmin",
                  "rpCamera1b",
                  "expectedAlert20"
                );
                cy.testEventsCheckAgainstExpected(
                  "rpGroupAdmin",
                  "rpCamera1b",
                  "expectedEvent20"
                );
              });
            });
          }
        );
      });
    });

    //TODO: Issue 96 - updates of location fail (time out)
    it("Test other metadata can be set by processing", () => {
      const fieldUpdates = {
        rawMimeType: "application/test",
        fileMimeType: "application/test2",
        duration: 20,
        recordingDateTime: "2020-01-01T00:00:00.000Z",
        relativeToDawn: 1000,
        relativeToDusk: -1000,
        version: "346",
        batteryLevel: 87,
        batteryCharging: "CHARGING",
        airplaneModeOn: true,
        type: "audio",
        comment: "This is a new comment",
        // add newFields, change algorythm, set previewSecs to null, leave totalFrames unchanged
        additionalMetadata: {
          newField: "newValue",
          newField2: "newValue2",
          algorithm: 99999,
          previewSecs: null,
        },
        location: [-46.29115, 170.30845],
      };
      //top level recording data
      const recording17 = TestCreateRecordingData(templateRecording);
      cy.apiRecordingAdd(
        "rpCamera1",
        recording17,
        "oneframe.cptv",
        "rpRecording17"
      ).then(() => {
        const expectedProcessing17 = TestCreateExpectedProcessingData(
          templateExpectedProcessing,
          "rpRecording17",
          "rpCamera1",
          "rpGroup",
          null,
          recording17
        );
        const expectedRecording17 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording17",
          "rpCamera1",
          "rpGroup",
          null,
          recording17
        );
        expectedRecording17.processingState = "FINISHED";
        expectedRecording17.processing = false;
        expectedRecording17.rawMimeType = "application/test";
        expectedRecording17.fileMimeType = "application/test2";
        expectedRecording17.duration = 20;
        expectedRecording17.recordingDateTime = "2020-01-01T00:00:00.000Z";
        expectedRecording17.relativeToDawn = 1000;
        expectedRecording17.relativeToDusk = -1000;
        expectedRecording17.version = "346";
        expectedRecording17.batteryLevel = 87;
        expectedRecording17.batteryCharging = "CHARGING";
        expectedRecording17.airplaneModeOn = true;
        expectedRecording17.type = "audio";
        expectedRecording17.comment = "This is a new comment";
        expectedRecording17.location = {
          type: "Point",
          coordinates: [-46.29115, 170.30845],
        };
        expectedRecording17.additionalMetadata = {
          newField: "newValue",
          newField2: "newValue2",
          algorithm: 99999,
          totalFrames: 141,
          previewSecs: null,
        };

        cy.processingApiCheck(
          "thermalRaw",
          "analyse",
          "rpRecording17",
          expectedProcessing17,
          EXCLUDE_KEYS
        );
        cy.processingApiPut(
          "rpRecording17",
          true,
          { fieldUpdates: fieldUpdates },
          true,
          undefined
        );
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording17",
          expectedRecording17,
          EXCLUDE_IDS
        );
      });
    });

    it("No files to process handled correctly", () => {
      cy.processingApiCheck(
        "thermalRaw",
        "analyse",
        "",
        undefined,
        EXCLUDE_KEYS
      );
      cy.processingApiCheck("audio", "analyse", "", undefined, EXCLUDE_KEYS);
    });

    it("Audio recordings follow correct workflow", () => {
      const recording21 = TestCreateRecordingData(templateAudioRecording);
      let expectedRecording21: ApiRecordingReturned;
      let expectedRecording21b: ApiRecordingReturned;
      let expectedRecording21c: ApiRecordingReturned;
      let expectedProcessing21: ApiRecordingForProcessing;

      cy.log("Add recording as device");
      cy.apiRecordingAdd(
        "rpCamera1",
        recording21,
        "60sec-audio.mp4",
        "rpRecording21"
      ).then(() => {
        expectedRecording21 = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording21",
          "rpCamera1",
          "rpGroup",
          null,
          recording21
        );
        expectedProcessing21 = TestCreateExpectedProcessingData(
          templateExpectedAudioProcessing,
          "rpRecording21",
          "rpCamera1",
          "rpGroup",
          null,
          recording21
        );

        cy.log("Check recording status is 'analyse'");
        expectedRecording21.processingState = "analyse";
        expectedRecording21.processing = null;
        expectedRecording21.rawMimeType = "video/mp4";
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording21",
          expectedRecording21,
          EXCLUDE_IDS
        );

        cy.log("Send for processing (tracking)");
        expectedProcessing21.processingStartTime = NOT_NULL;
        expectedProcessing21.updatedAt = NOT_NULL;
        cy.processingApiCheck(
          "audio",
          "analyse",
          "rpRecording21",
          expectedProcessing21,
          EXCLUDE_KEYS
        );

        cy.log("Check status");
        expectedRecording21b = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording21",
          "rpCamera1",
          "rpGroup",
          null,
          recording21
        );
        expectedRecording21b.processingState = "analyse";
        expectedRecording21b.processing = true;
        expectedRecording21b.rawMimeType = "video/mp4";
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording21",
          expectedRecording21b,
          EXCLUDE_IDS
        );

        cy.log("Mark processing as done");
        cy.processingApiPut("rpRecording21", true, {}, true, undefined);

        cy.log("Check status (FINISHED)");
        expectedRecording21c = TestCreateExpectedRecordingData(
          templateExpectedRecording,
          "rpRecording21",
          "rpCamera1",
          "rpGroup",
          null,
          recording21
        );
        expectedRecording21c.processingState = "FINISHED";
        expectedRecording21c.processing = false;
        expectedRecording21c.rawMimeType = "video/mp4";
        expectedRecording21c.Tracks = [];
        cy.apiRecordingCheck(
          "rpGroupAdmin",
          "rpRecording21",
          expectedRecording21c,
          EXCLUDE_IDS
        );

        cy.log("Check status (FINISHED)");
      });
    });

    it("Recordings in other states not picked up for processing", () => {
      const recording14 = TestCreateRecordingData(templateRecording);
      recording14.processingState = "FINIHED";
      const recording15 = TestCreateRecordingData(templateRecording);
      recording15.processingState = "CORRUPT";
      const recording16 = TestCreateRecordingData(templateRecording);
      recording16.processingState = "analyse.failed";
      cy.log("Add recording as device");
      cy.apiRecordingAdd(
        "rpCamera1",
        recording14,
        "oneframe.cptv",
        "rpRecording14"
      ).then(() => {
        cy.apiRecordingAdd(
          "rpCamera1",
          recording15,
          "oneframe.cptv",
          "rpRecording15"
        ).then(() => {
          cy.apiRecordingAdd(
            "rpCamera1",
            recording16,
            "oneframe.cptv",
            "rpRecording16"
          ).then(() => {
            cy.log(
              "Check none of above (non-'analyze') recordings are picked up for processing"
            );
            cy.processingApiCheck(
              "thermalRaw",
              "analyse",
              "",
              undefined,
              EXCLUDE_KEYS
            );
          });
        });
      });
    });
  } else {
    it.skip("NOTE: Processing tests skipped superuser diabled in environment variables", () => {});
  }
});
