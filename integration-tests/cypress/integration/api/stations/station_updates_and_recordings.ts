/// <reference path="../../../support/index.d.ts" />
import {
  TestCreateExpectedRecordingData,
  TestCreateRecordingData,
} from "@commands/api/recording-tests";
import { TestGetLocation } from "@commands/api/station";
import { TestCreateExpectedDevice } from "@commands/api/device";
import { ApiThermalRecordingResponse } from "@typedefs/api/recording";
import {
  getCreds,
} from "@commands/server";
import {
  EXCLUDE_IDS,
  HTTP_Forbidden,
  HTTP_OK200,
  NOT_NULL,
  NOT_NULL_STRING,
} from "@commands/constants";
import {
  TEMPLATE_THERMAL_RECORDING,
  TEMPLATE_THERMAL_RECORDING_RESPONSE,
} from "@commands/dataTemplate";
import { TestNameAndId } from "@commands/types";
import { getTestName } from "@commands/names";
import { DeviceType } from "@typedefs/api/consts";

const templateExpectedCypressRecording: ApiThermalRecordingResponse = JSON.parse(
  JSON.stringify(TEMPLATE_THERMAL_RECORDING_RESPONSE)
);

const templateExpectedStation = {
  location,
  name: NOT_NULL_STRING,
  id: NOT_NULL,
  lastThermalRecordingTime: NOT_NULL_STRING,
  createdAt: NOT_NULL_STRING,
  updatedAt: NOT_NULL_STRING,
  activeAt: NOT_NULL_STRING,
  automatic: true,
  groupId: NOT_NULL,
  groupName: NOT_NULL_STRING,
};

describe("Stations: station updates also update recordings", () => {
  const Josie = "Josie_stations";
  const group = "recordings_updates_stations";
  const group2 = "recordings_updates_stations-2";

  before(() => {
    cy.testCreateUserAndGroup(Josie, group).then(() => {
      templateExpectedCypressRecording.groupId=getCreds(group).id;
      templateExpectedCypressRecording.groupName=getTestName(group);
      templateExpectedStation.groupId = getCreds(group).id;
      templateExpectedStation.groupName = getTestName(group);
    });
    cy.apiGroupAdd(Josie, group2);
  });

  it("Delete station: Can manually delete a station, and have all recordings belonging to the station be deleted too", () => {
    const deviceName = "new-device-1";
    const stationName = "Josie-station-1";
    const location = TestGetLocation(1);
    cy.apiDeviceAdd(deviceName, group);
    const oneMonthAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7));

    cy.apiGroupStationAdd(
      Josie,
      group,
      { name: stationName, ...location },
      oneMonthAgo.toISOString()
    ).then((stationId: number) => {
      cy.testUploadRecording(deviceName, {
        ...location,
        time: oneWeekAgo
      }).then((recordingId) => {
        cy.apiStationDelete(Josie, stationId.toString(), true, HTTP_OK200, { useRawStationId: true}).then(() => {
          cy.log("Check that station and its recordings are deleted");
          cy.apiStationCheck(Josie, stationId.toString(), null, null, HTTP_Forbidden, { useRawStationId: true});
          cy.apiRecordingCheck(Josie, recordingId.toString(), null, null, HTTP_Forbidden, {
            useRawRecordingId: true,
          });
        });
      });
    });
  });

  it("Delete station: Can manually delete a station, and have the station unassigned from any recordings", () => {
    const deviceName = "new-device-2";
    const stationName = "Josie-station-2";
    const recordingName = "sr-recording-2";
    const location = TestGetLocation(2);
    cy.apiDeviceAdd(deviceName, group).then(() => {
      const oneMonthAgo = new Date(new Date().setDate(new Date().getDate() - 30));
      const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
      const recording=TestCreateRecordingData(TEMPLATE_THERMAL_RECORDING);
      recording.recordingDateTime=oneWeekAgo.toISOString();
      recording.location=[location.lat, location.lng];

      cy.apiGroupStationAdd(
          Josie,
        group,
        { name: stationName, ...location },
        oneMonthAgo.toISOString()
      ).then((stationId: number) => {
        cy.apiRecordingAdd(
          deviceName, recording, undefined, recordingName
        ).thenCheckStationIdIs(Josie, stationId).then((station: TestNameAndId)=> {
          const expectedRecording=TestCreateExpectedRecordingData(TEMPLATE_THERMAL_RECORDING_RESPONSE, recordingName, deviceName, group, station.name, recording);

          cy.apiStationDelete(Josie, stationId.toString(),false,HTTP_OK200,{ useRawStationId: true });
   
          cy.log(
            "Check that station is deleted, and its recordings don't have the station id"
          );
          cy.apiStationCheck(Josie, stationId.toString(), null, null, HTTP_Forbidden,{useRawStationId: true});

          delete(expectedRecording.stationId);
          delete(expectedRecording.stationName);
          cy.apiRecordingCheck(Josie, recordingName, expectedRecording, EXCLUDE_IDS);
        });
      });
    });
  });

  it.skip("station-update: Name change applied to all recordings", () => {
    const deviceName = "new-device-3";
    const oneWeekAgo = new Date(new Date().setDate(new Date().getDate() - 7));
    const twoWeeksAgo = new Date(new Date().setDate(new Date().getDate() - 7));
    const location = TestGetLocation(3);
    const expectedStation1 = JSON.parse(JSON.stringify(templateExpectedStation));
    expectedStation1.location = location;
    expectedStation1.activeAt = recordingTime.toISOString(),
    expectedStation1.lastThermalRecordingTime = recordingTime.toISOString(),

    cy.apiDeviceAdd(deviceName, group);
    
    cy.log("Add a recording and check new station is created");
    cy.testUploadRecording(deviceName, { ...location, time: twoWeeksAgo })
      .thenCheckStationIsNew(Josie).then((station1:TestNameAndId) => {

       cy.testUploadRecording(deviceName, { ...location, time: twoWeeksAgo })
         .thenCheckStationIdIs(Josie, station1.id);

       
        cy.log("Updating name");
        cy.apiStationUpdate("stuAdmin","stuStation1",station2);

  });

  it.skip("station-update: Location change does not affect existing recordings", () => {
  });

  it.skip("station-update: New location matched by new recordings", () => {
  });

  it.skip("station-update: Old location not matched by new recordings", () => {
  });

  it.skip("station-update: Retire station - old recordings unaffected if before retiredAt", () => {
  });

  it.skip("station-update: Retire-station - new recordings still match if before retiredAt", () => {
  });

  it.skip("station-update: Retire-station - new recordings do not match if >= retiredAt", () => {
  });

});

