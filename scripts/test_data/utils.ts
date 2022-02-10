import { authenticateUser } from "./user.ts";
const baseUrl = "https://api-test.cacophony.org.nz";
const apiUrl = `${baseUrl}/api/v1`;
const groupsUrl = `${apiUrl}/groups`;
const devicesUrl = `${apiUrl}/devices`;
const deviceUrl = (device: string) => `${devicesUrl}/${device}`;
const recordingsUrl = `${apiUrl}/recordings`;
const recordingDeviceUrl = (device: number) =>
  `${recordingsUrl}/device/${device}`;

async function getAdminToken(): Promise<string> {
  const userName = "zainrax";
  const password = "dQZug%g^zH7rNP";
  return authenticateUser(userName, password);
}

async function postBody<T extends Object>(
  body: T = {} as T,
  contentType: string = "application/json"
): Promise<RequestInit> {
  const adminToken = await getAdminToken();
  return {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Authorization: `${adminToken}`,
    },
    body: JSON.stringify(body),
  };
}

async function getBody(): Promise<RequestInit> {
  const adminToken = await getAdminToken();
  return {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${adminToken}`,
    },
  };
}

export {
  apiUrl,
  baseUrl,
  devicesUrl,
  deviceUrl,
  getAdminToken,
  getBody,
  groupsUrl,
  postBody,
  recordingDeviceUrl,
  recordingsUrl,
};
