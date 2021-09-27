// load the global Cypress types
/// <reference types="cypress" />

import { uploadFile } from "../fileUpload";
import { getTestName } from "../names";
import {
  v1ApiPath,
  processingApiPath,
  getCreds,
  makeAuthorizedRequestWithStatus,
  saveIdOnly,
  saveJobKeyByName,
  checkTreeStructuresAreEqualExcept,
  removeUndefinedParams,
} from "../server";
import { logTestDescription, prettyLog } from "../descriptions";
import {
  ApiRecordingSet,
  ApiRecordingReturned,
  ApiRecordingNeedsTagReturned,
  ApiRecordingColumns,
} from "../types";
import { ApiRecordingColumnNames } from "../constants";

// 1,thermalRaw,cy_rreGroup_4b6009cc,cy_rreCamera1_4b6009cc,,2021-07-18,08:13:17,-45.29115,169.30845,15.6666666666667,,,1,cat,,,http://test.site/recording/1,,"

Cypress.Commands.add(
  "processingApiPut",
  (
    recordingName: string,
    success: boolean,
    result: any,
    complete: boolean,
    newProcessedFileKey: string,
    statusCode: number = 200
  ) => {
    const id = getCreds(recordingName).id;
    const jobKey = getCreds(recordingName).jobKey;
    logTestDescription(`Processing 'done' for recording ${recordingName}`, {
      id: id,
      result: result,
    });
    const params = {
      id: id,
      jobKey: jobKey,
      success: success,
      result: JSON.stringify(result),
      complete: complete,
      newProcessedFileKey: newProcessedFileKey,
    };

    const url = processingApiPath("");
    cy.request({
      method: "PUT",
      url: url,
      body: params,
    }).then((response) => {
      expect(response.status, "Check return statusCode is").to.equal(
        statusCode
      );
    });
  }
);

Cypress.Commands.add(
  "processingApiTracksPost",
  (
    trackName: string,
    recordingName: string,
    data: any,
    algorithmId: number,
    statusCode: number = 200
  ) => {
    const id = getCreds(recordingName).id;
    logTestDescription(`Adding tracks for recording ${recordingName}`, {
      id: id,
      data: data,
      algorithmId: algorithmId,
    });
    const params = {
      data: JSON.stringify(data),
      algorithmId: algorithmId,
    };

    const url = processingApiPath(id.toString() + "/tracks");
    cy.request({
      method: "POST",
      url: url,
      body: params,
    }).then((response) => {
      expect(response.status, "Check return statusCode is").to.equal(
        statusCode
      );
      saveIdOnly(trackName, response.body.trackId);
    });
  }
);

Cypress.Commands.add(
  "processingApiTracksDelete",
  (recordingName: string, statusCode: number = 200) => {
    const id = getCreds(recordingName).id;
    logTestDescription(`Deleting tracks from recording ${recordingName}`, {
      id: id,
    });
    const params = {};
    const url = processingApiPath(id.toString() + "/tracks");
    cy.request({
      method: "DELETE",
      url: url,
      body: params,
    }).then((response) => {
      expect(response.status, "Check return statusCode is").to.equal(
        statusCode
      );
    });
  }
);

Cypress.Commands.add(
  "processingApiTracksTagsPost",
  (
    trackName: string,
    recordingName: string,
    what: any,
    confidence: number,
    data: any = {},
    statusCode: number = 200
  ) => {
    const id = getCreds(recordingName).id;
    const trackId = getCreds(trackName).id;
    logTestDescription(
      `Adding tracktag '${what}' for recording ${recordingName}`,
      { id: id, trackId: trackId, what: what, confidence: confidence }
    );
    const params = {
      what: what,
      confidence: confidence,
      data: JSON.stringify(data),
    };

    const url = processingApiPath(
      id.toString() + "/tracks/" + trackId.toString() + "/tags"
    );
    cy.request({
      method: "POST",
      url: url,
      body: params,
    }).then((response) => {
      expect(response.status, "Check return statusCode is").to.equal(
        statusCode
      );
    });
  }
);

Cypress.Commands.add("processingApiAlgorithmPost", (algorithm: any) => {
  logTestDescription(`Getting id for algorithm ${JSON.stringify(algorithm)}`, {
    algorithm: algorithm,
  });
  const params = {
    algorithm: JSON.stringify(algorithm),
  };

  const url = processingApiPath("algorithm");
  cy.request({
    method: "POST",
    url: url,
    body: params,
  }).then((response) => {
    cy.wrap(response.body.algorithmId);
  });
});

Cypress.Commands.add(
  "processingApiCheck",
  (
    type: string,
    state: string,
    recordingName: string,
    expectedRecording: any,
    excludeCheckOn: string[] = [],
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Request recording ${type}  in state '${state} for processing'`,
      { type: type, state: state }
    );

    const params = {
      type: type,
      state: state,
    };
    const url = processingApiPath("", params);
    cy.request({ url: url }).then((response) => {
      if (statusCode === 200) {
        if (response.body.recording !== undefined) {
          saveJobKeyByName(recordingName, response.body.recording.jobKey);
        }
        if (expectedRecording === undefined) {
          expect(
            response.body.recording,
            "Expect response to contain no recordings"
          ).to.be.undefined;
        } else {
          expect(
            response.body.recording,
            "Expect response to contain a recording"
          ).to.exist;
        }
        checkTreeStructuresAreEqualExcept(
          expectedRecording,
          response.body.recording,
          excludeCheckOn
        );
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingAdd",
  (
    deviceName: string,
    data: ApiRecordingSet,
    fileName: string = "invalid.cptv",
    recordingName: string = "recording1",
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Upload recording ${recordingName}  to '${deviceName}'`,
      { camera: deviceName, requestData: data }
    );

    const url = v1ApiPath("recordings");

    uploadFile(
      url,
      deviceName,
      fileName,
      data["type"],
      data,
      "@addRecording",
      statusCode
    ).then((x) => {
      cy.wrap(x.response.body.recordingId);
      if (recordingName !== null) {
        saveIdOnly(recordingName, x.response.body.recordingId);
      }
      if (additionalChecks["message"] !== undefined) {
        expect(x.response.body.messages).to.contain(
          additionalChecks["message"]
        );
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingUpdate",
  (
    userName: string,
    recordingNameOrId: string,
    updates: any,
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(`Update recording ${recordingNameOrId}`, {
      recording: recordingNameOrId,
      updates: updates,
    });

    let recordingId: string;
    if (additionalChecks["useRawRecordingId"] === true) {
      recordingId = recordingNameOrId;
    } else {
      recordingId = getCreds(recordingNameOrId).id.toString();
    }

    const url = v1ApiPath(`recordings/${recordingId}`);

    const params = {
      updates: JSON.stringify(updates),
    };

    makeAuthorizedRequestWithStatus(
      {
        method: "PATCH",
        url: url,
        body: params,
      },
      userName,
      statusCode
    ).then((response) => {
      if (additionalChecks["message"] !== undefined) {
        expect(response.body.messages).to.contain(additionalChecks["message"]);
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingDelete",
  (
    userName: string,
    recordingNameOrId: string,
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(`Delete recording ${recordingNameOrId} `, {
      recordingName: recordingNameOrId,
    });

    let recordingId: string;
    if (additionalChecks["useRawRecordingId"] === true) {
      recordingId = recordingNameOrId;
    } else {
      recordingId = getCreds(recordingNameOrId).id.toString();
    }
    const url = v1ApiPath(`recordings/${recordingId}`);

    makeAuthorizedRequestWithStatus(
      {
        method: "DELETE",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (additionalChecks["message"] !== undefined) {
        expect(response.body.messages).to.contain(additionalChecks["message"]);
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingCheck",
  (
    userName: string,
    recordingNameOrId: string,
    expectedRecording: ApiRecordingReturned,
    excludeCheckOn: string[] = [],
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(`Check recording ${recordingNameOrId} `, {
      recordingName: recordingNameOrId,
    });

    let recordingId: string;
    if (additionalChecks["useRawRecordingId"] === true) {
      recordingId = recordingNameOrId;
    } else {
      recordingId = getCreds(recordingNameOrId).id.toString();
    }
    const url = v1ApiPath(`recordings/${recordingId}`);

    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (statusCode === 200) {
        expect(response.body.rawSize).to.exist;
        expect(response.body.downloadRawJWT).to.exist;
        checkTreeStructuresAreEqualExcept(
          expectedRecording,
          response.body.recording,
          excludeCheckOn
        );
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingNeedsTagCheck",
  (
    userName: string,
    deviceNameOrId: string,
    expectedRecordings: ApiRecordingNeedsTagReturned[],
    excludeCheckOn: string[] = [],
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Check recording needs-tag, biased to ${deviceNameOrId} `,
      {
        device: deviceNameOrId,
      }
    );

    let params: any = {};
    if (deviceNameOrId !== undefined) {
      if (additionalChecks["useRawDeviceId"] === true) {
        params = { deviceId: deviceNameOrId };
      } else {
        params = { deviceId: getCreds(deviceNameOrId).id.toString() };
      }
    }
    const url = v1ApiPath(`recordings/needs-tag`, params);

    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      let expectedRecording: ApiRecordingNeedsTagReturned;
      if (statusCode === 200) {
        if (expectedRecordings.length > 0) {
          if (additionalChecks["doNotValidate"] != true) {
            //find returned recording in expectedRecordings
            let recordingIds = "";
            expectedRecordings.forEach((recording) => {
              recordingIds =
                recordingIds + recording.RecordingId.toString() + ", ";
              if (recording.RecordingId == response.body.rows[0].RecordingId) {
                expectedRecording = recording;
              }
            });
            expect(
              expectedRecording,
              `Recording ID ${response.body.rows[0].RecordingId} should be in list (${recordingIds})`
            ).to.exist;

            //Verify result matches expected
            checkTreeStructuresAreEqualExcept(
              expectedRecording,
              response.body.rows[0],
              excludeCheckOn
            );
          }
        } else {
          //TODO: Issue 100 workaround. Remove when fixed
          //expect(response.body.rows.length,"Expect no returned recordings").to.equal(0);
          expect(
            response.body.rows[0].RecordingId,
            "Expect dummy recording with id of 0"
          ).to.equal(0);
        }
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingThumbnailCheck",
  (
    userName: string,
    recordingNameOrId: string,
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(`Check thumbnail for recording ${recordingNameOrId} `, {
      recordingName: recordingNameOrId,
    });

    let recordingId: string;
    if (additionalChecks["useRawRecordingId"] === true) {
      recordingId = recordingNameOrId;
    } else {
      recordingId = getCreds(recordingNameOrId).id.toString();
    }
    const url = v1ApiPath(`recordings/${recordingId}/thumbnail`);

    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (statusCode === 200) {
        expect(response.body.length, "Returned file has length>0").to.be.gt(0);
        if (additionalChecks["type"] == "PNG") {
          expect(
            response.body.slice(1, 4),
            "Expect PNG file signature"
          ).to.equal("PNG");
        }
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingAddOnBehalfUsingGroup",
  (
    userName: string,
    deviceName: string,
    groupName: string,
    data: ApiRecordingSet,
    recordingName: string,
    fileName: string = "invalid.cptv",
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Upload recording on behalf using group${prettyLog(
        recordingName
      )}  to '${deviceName}'`,
      { camera: deviceName, requestData: data }
    );

    //look up device Id for this devicename unless we're asked not to
    let fullDeviceName: string;
    if (additionalChecks["useRawDeviceName"] === true) {
      fullDeviceName = deviceName;
    } else {
      fullDeviceName = getTestName(deviceName);
    }
    let fullGroupName: string;
    if (additionalChecks["useRawGroupName"] === true) {
      fullGroupName = groupName;
    } else {
      fullGroupName = getTestName(groupName);
    }

    const url = v1ApiPath(
      "recordings/device/" + fullDeviceName + "/group/" + fullGroupName
    );
    const fileType = data["type"];

    uploadFile(
      url,
      userName,
      fileName,
      fileType,
      data,
      "@addRecording",
      statusCode
    ).then((x) => {
      cy.wrap(x.response.body.recordingId);
      if (recordingName !== null) {
        saveIdOnly(recordingName, x.response.body.recordingId);
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingAddOnBehalfUsingDevice",
  (
    userName: string,
    deviceName: string,
    data: ApiRecordingSet,
    recordingName: string = "recording1",
    fileName: string = "invalid.cptv",
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Upload recording on behalf using device ${prettyLog(
        recordingName
      )}  to '${deviceName}' using '${userName}'`,
      { camera: deviceName, requestData: data }
    );

    //look up device Id for this devicename unless we're asked not to
    let deviceId: string;
    if (additionalChecks["useRawDeviceName"] === true) {
      deviceId = deviceName;
    } else {
      deviceId = getCreds(deviceName).id.toString();
    }

    const url = v1ApiPath("recordings/device/" + deviceId);
    const fileType = data["type"];

    uploadFile(
      url,
      userName,
      fileName,
      fileType,
      data,
      "@addRecording",
      statusCode
    ).then((x) => {
      cy.wrap(x.response.body.recordingId);
      if (recordingName !== null) {
        saveIdOnly(recordingName, x.response.body.recordingId);
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingsQueryCheck",
  (
    userName: string,
    query: any,
    expectedRecordings: ApiRecordingReturned[] = undefined,
    excludeCheckOn: string[] = [],
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    const params = removeUndefinedParams(query);
    params["where"] = JSON.stringify(query["where"]);

    logTestDescription(
      `Query recordings where '${JSON.stringify(params["where"])}'`,
      { user: userName, params: params }
    );

    const url = v1ApiPath("recordings", params);
    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (statusCode === 200) {
        checkTreeStructuresAreEqualExcept(
          expectedRecordings,
          response.body.rows,
          excludeCheckOn
        );
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingsReportCheck",
  (
    userName: string,
    query: any,
    expectedResults: ApiRecordingColumns[] = [],
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    const params = removeUndefinedParams(query);
    params["where"] = JSON.stringify(query["where"]);

    logTestDescription(
      `Generate report for recordings where '${JSON.stringify(
        params["where"]
      )}'`,
      { user: userName, params: params }
    );

    const url = v1ApiPath("recordings/report", params);
    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (statusCode === 200) {
        const allrows = response.body.split(/\r?\n/);
        const columns = allrows[0].split(",");
        const rows = allrows.slice(1);

        expect(JSON.stringify(columns), "CSV columns match expected").to.equal(
          JSON.stringify(ApiRecordingColumnNames)
        );

        expect(
          rows.length,
          `Expect ${expectedResults.length} results to be returned`
        ).to.equal(expectedResults.length);

        for (let count = 0; count < expectedResults.length; count++) {
          const columns = rows[count].split(",");
          for (
            let column = 0;
            column < ApiRecordingColumnNames.length;
            column++
          ) {
            expect(
              columns[column],
              `Row ${count}, ${ApiRecordingColumnNames[column]} should be`
            ).to.equal(expectedResults[count][ApiRecordingColumnNames[column]]);
          }
        }
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiRecordingsCountCheck",
  (
    userName: string,
    query: any,
    expectedCount: number,
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    const params = removeUndefinedParams(query);
    params["where"] = JSON.stringify(query["where"]);

    logTestDescription(
      `Query recording count where '${JSON.stringify(params["where"])}'`,
      { user: userName, params: params }
    );

    const url = v1ApiPath("recordings/count", params);
    makeAuthorizedRequestWithStatus(
      {
        method: "GET",
        url: url,
      },
      userName,
      statusCode
    ).then((response) => {
      if (statusCode === 200) {
        expect(response.body.count, "Recording count should be").to.equal(
          expectedCount
        );
        cy.wrap(response.body.count);
      } else {
        if (additionalChecks["message"] !== undefined) {
          expect(response.body.messages).to.contain(
            additionalChecks["message"]
          );
        }
      }
    });
  }
);

Cypress.Commands.add(
  "apiReprocess",
  (
    userName: string,
    recordingIds: number[],
    expectedReprocessed: number[] = undefined,
    statusCode: number = 200,
    additionalChecks: any = {}
  ) => {
    logTestDescription(
      `Mark recordings for reprocess '${JSON.stringify(recordingIds)}'`,
      { user: userName, recordingIds: recordingIds }
    );
    const params = { recordings: recordingIds };

    const url = v1ApiPath("reprocess");
    makeAuthorizedRequestWithStatus(
      {
        method: "POST",
        url: url,
        body: params,
      },
      userName,
      statusCode
    ).then((response) => {
      if (expectedReprocessed !== undefined) {
        expect(
          response.body.reprocessed.length,
          "Number of reprocessed expected to be"
        ).to.equal(expectedReprocessed.length);
        expectedReprocessed.forEach((reprocessed: any) => {
          expect(response.body.reprocessed).to.contain(reprocessed);
        });
      }
      if (additionalChecks["message"] !== undefined) {
        expect(response.body.messages).to.contain(additionalChecks["message"]);
      }
      if (additionalChecks["fail"] !== undefined) {
        expect(
          response.body.fail.length,
          "Number of fail expected to be"
        ).to.equal(additionalChecks["fail"].length);
        additionalChecks["fail"].forEach((fail: any) => {
          expect(response.body.fail).to.contain(fail);
        });
      }
      if (additionalChecks["message"] !== undefined) {
        expect(response.body.messages).to.contain(additionalChecks["message"]);
      }
    });
  }
);
