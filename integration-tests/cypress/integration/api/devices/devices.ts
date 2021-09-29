/// <reference path="../../../support/index.d.ts" />
import { getTestName } from "@commands/names";
import { makeAuthorizedRequest, v1ApiPath, getCreds } from "@commands/server";
import ApiDeviceResponse = Cypress.ApiDeviceResponse;

describe("Devices list", () => {
  const groupAdmin = "Edith-groupAdmin";
  const groupMember = "Edwin-groupMember";
  const deviceMember = "Egbert-deviceMember";
  const deviceAdmin = "Emett-deviceAdmin";
  const hacker = "E-Hacker";
  const group = "Edith-Team";
  const group2 = "Second-E-Team";
  const group3 = "Charlie-Team";
  const camera = "E-camera1";
  const NOT_ADMIN = false;
  const ADMIN = true;
  const user2 = "Bridget";
  const user3 = "Charlie";
  const camera2 = "second_E_camera";
  const camera3 = "Charlie-camera";
  const camera4 = "Debbie-camera";
  const superuser = "admin_test";
  const suPassword = "admin_test";
  let expectedDeviceAdminView: ApiDeviceResponse;
  let expectedDeviceMemberView: ApiDeviceResponse;
  let expectedDevice2AdminView: ApiDeviceResponse;
  let expectedDevice3AdminView: ApiDeviceResponse;
  let expectedDevice4AdminView: ApiDeviceResponse;

  before(() => {
    cy.apiUserAdd(groupMember);
    cy.apiUserAdd(deviceAdmin);
    cy.apiUserAdd(deviceMember);
    cy.apiUserAdd(hacker);
    cy.testCreateUserGroupAndDevice(groupAdmin, group, camera).then(() => {
      expectedDeviceAdminView = {
        id: getCreds(camera).id,
        saltId: getCreds(camera).id,
        deviceName: getTestName(camera),
        groupName: getTestName(group),
        groupId: getCreds(group).id,
        active: true,
        admin: true,
      };
      expectedDeviceMemberView = {
        id: getCreds(camera).id,
        deviceName: getTestName(camera),
        active: true,
        groupName: getTestName(group),
        groupId: getCreds(group).id,
        admin: false,
        saltId: getCreds(camera).id,
      };
    });
    cy.apiGroupUserAdd(groupAdmin, groupMember, group, NOT_ADMIN);
    cy.apiDeviceUserAdd(groupAdmin, deviceMember, camera);
    cy.apiDeviceUserAdd(groupAdmin, deviceAdmin, camera, ADMIN);

    //second group
    cy.testCreateUserGroupAndDevice(user2, group2, camera2).then(() => {
      expectedDevice2AdminView = {
        id: getCreds(camera2).id,
        saltId: getCreds(camera2).id,
        deviceName: getTestName(camera2),
        groupId: getCreds(group2).id,
        groupName: getTestName(group2),
        active: true,
        admin: true,
      };
    });

    //reregistered device
    cy.testCreateUserGroupAndDevice(user3, group3, camera3);
    cy.apiDeviceUserAdd(user3, user3, camera3);
    cy.apiDeviceReregister(camera3, camera4, group3).then(() => {
      expectedDevice3AdminView = {
        id: getCreds(camera3).id,
        saltId: getCreds(camera3).id,
        deviceName: getTestName(camera3),
        groupName: getTestName(group3),
        groupId: getCreds(group3).id,
        active: false,
        admin: true,
      };
      expectedDevice4AdminView = {
        id: getCreds(camera4).id,
        saltId: getCreds(camera4).id,
        deviceName: getTestName(camera4),
        active: true,
        admin: true,
        groupName: getTestName(group3),
        groupId: getCreds(group3).id,
      };
    });
  });

  //Do not run against a live server as we don't have superuser login
  if (Cypress.env("test_using_default_superuser") == true) {
    it("Super-user should see all devices including User details", () => {
      cy.apiSignInAs(null, null, superuser, suPassword);

      const expectedDevice2AdminView = {
        id: getCreds(camera2).id,
        saltId: getCreds(camera2).id,
        deviceName: getTestName(camera2),
        active: true,
        admin: true,
        groupName: getTestName(group3),
        groupId: getCreds(group3).id,
      };

      cy.apiDevicesCheckContains(superuser, [
        expectedDeviceAdminView,
        expectedDevice2AdminView,
      ]);
    });
  } else {
    it.skip("Super-user should see all devices including User details", () => {});
  }

  //Do not run against a live server as we don't have superuser login
  if (Cypress.env("test_using_default_superuser") == true) {
    it("Super-user 'as user' should see only their devices and users only where they are device admin", () => {
      // note: if this test fails and does not clean up after itself, it will continue to fail until the superuser is removed from the old test devices
      cy.apiSignInAs(null, null, superuser, suPassword);
      // add superuser to group2
      makeAuthorizedRequest(
        {
          method: "POST",
          url: v1ApiPath("groups/users"),
          body: {
            group: getTestName(group2),
            admin: true,
            username: superuser,
          },
        },
        user2
      );

      cy.apiDevicesCheck(superuser, [expectedDevice2AdminView], {
        "view-mode": "user",
      });

      //remove superuser from group2
      makeAuthorizedRequest(
        {
          method: "DELETE",
          url: v1ApiPath("groups/users"),
          body: {
            group: getTestName(group2),
            username: superuser,
          },
        },
        user2
      );
    });
  } else {
    it.skip("Super-user 'as user' should see only their devices and users only where they are device admin", () => {});
  }

  it("Group admin should see everything, and be listed as admin", () => {
    cy.apiDevicesCheck(groupAdmin, [expectedDeviceAdminView]);
  });

  it("Group member should be able to see everything, but should be not listed as admin", () => {
    cy.apiDevicesCheck(groupMember, [expectedDeviceMemberView]);
  });

  it("Device admin should see everything, and be listed as admin", () => {
    cy.apiDevicesCheck(deviceAdmin, [expectedDeviceAdminView]);
  });

  it("Device member should be see everything, but should be not listed as admin", () => {
    cy.apiDevicesCheck(deviceMember, [expectedDeviceMemberView]);
  });

  it("Non member should not have any access to any devices", () => {
    cy.apiDevicesCheck(hacker, []);
  });

  it("Should display inactive devices only when requested", () => {
    //verify inactive device is not shown by default
    cy.apiDevicesCheck(user3, [expectedDevice4AdminView]);

    //verify inactive device is shown when inactive is requested
    cy.apiDevicesCheck(
      user3,
      [expectedDevice3AdminView, expectedDevice4AdminView],
      { onlyActive: false }
    );
  });
});
