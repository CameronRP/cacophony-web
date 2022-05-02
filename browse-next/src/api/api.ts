import { fetch } from "./fetch";

const API_ROOT = import.meta.env.VITE_API;

type HttpMethod = "POST" | "PATCH" | "DELETE" | "GET";

const fetchJsonWithMethod = async (
  endpoint: string,
  method: HttpMethod,
  body?: object
) => {
  const payload = {
    method: method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  };
  if (body) {
    (payload as any).body = JSON.stringify(body);
  }
  console.log(`${API_ROOT}${endpoint}`, payload);
  return fetch(`${API_ROOT}${endpoint}`, payload);
};

export default {
  url: (endpoint: string) => `${API_ROOT}${endpoint}`,
  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  get: async (endpoint: string) =>
    fetch(`${API_ROOT}${endpoint}`, { method: "GET" }),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  post: async (endpoint: string, body?: object) =>
    fetchJsonWithMethod(endpoint, "POST", body),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>} */
  postMultipartFormData: async (endpoint: string, body: FormData) =>
    fetch(`${API_ROOT}${endpoint}`, { method: "POST", body }),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  patch: async (endpoint: string, body: object) =>
    fetchJsonWithMethod(endpoint, "PATCH", body),

  /**
   * Returns a promise that when resolved, returns an object with a result, success boolean, and status code.
   * The result field is the JSON blob from the response body.
   * These fields can easily be resolved using object destructuring to directly assign the required information.
   * @param {string} endpoint - The cacophony API endpoint to target, for example `/api/v1/users`.
   * @param {*} [body] - An object to go in the request body that will be sent as JSON.
   * @returns {Promise<{result: *, success: boolean, status: number}>}
   */
  delete: async (endpoint: string, body?: object) =>
    fetchJsonWithMethod(endpoint, "DELETE", body),
};
