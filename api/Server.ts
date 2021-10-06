import moduleAlias from "module-alias";
moduleAlias.addAliases({
  "@": __dirname,
  "@typedefs": __dirname + "/../types",
  "@api": __dirname + "/api",
  "@models": __dirname + "/models",
  "@config": __dirname + "/config.js",
  "@log": __dirname + "/logging.js",
  "@schemas": __dirname + "/../types/jsonSchemas",
});

import { Application, NextFunction, Request, Response } from "express";
import express from "express";
import passport from "passport";
import process from "process";
import http from "http";
import config from "./config";
import models from "./models";
import log, { consoleTransport } from "@log";
import customErrors from "./api/customErrors";
import modelsUtil from "./models/util/util";
import initialiseApi from "./api/V1";
import initialiseFileProcessingApi from "./api/fileProcessing";
import expressWinston from "express-winston";
import { exec } from "child_process";
import { promisify } from "util";

import { AsyncLocalStorage } from "async_hooks";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";

export const SuperUsers: Map<number, any> = new Map();

export const asyncLocalStorage = new AsyncLocalStorage();
const asyncExec = promisify(exec);

const maybeRecompileJSONSchemaDefinitions = async (): Promise<void> => {
  log.info("Checking if type schemas need recompilation");
  const { stdout, stderr } = await asyncExec(
    "cd ../types && node build-schemas.js"
  );
  //const { stdout, stderr } = await asyncExec("cd ../types && npm run generate-schemas");
  log.info("Stdout: %s", stdout);
  return;
};

const openHttpServer = (app): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!config.server.http.active) {
      resolve();
    }
    try {
      log.notice("Starting http server on %d", config.server.http.port);
      http.createServer(app).listen(config.server.http.port);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

// Returns a Promise that will reolve if it could connect to the S3 file storage
// and reject if connection failed.
const checkS3Connection = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const s3 = modelsUtil.openS3();
    const params = { Bucket: config.s3Local.bucket };
    log.notice("Connecting to S3.....");
    s3.headBucket(params, (err) => {
      if (err) {
        log.error("Error with connecting to S3.");
        reject(err);
      }
      log.notice("Connected to S3.");
      resolve();
    });
  });
};

(async () => {
  log.notice("Starting Full Noise.");
  config.loadConfigFromArgs(true);

  // Check if any of the Cacophony type definitions have changed, and need recompiling?
  if (config.server.loggerLevel === "debug") {
    log.notice("Running in DEBUG mode");
    await maybeRecompileJSONSchemaDefinitions();
  } else {
    log.notice("Running in RELEASE mode");
  }
  const app: Application = express();

  app.use((request: Request, response: Response, next: NextFunction) => {
    // Add a unique request ID to each API request, for logging purposes.
    asyncLocalStorage.enterWith(new Map());
    (asyncLocalStorage.getStore() as Map<string, any>).set(
      "requestId",
      uuidv4()
    );
    next();
  });
  app.use(
    expressWinston.logger({
      transports: [consoleTransport],
      meta: false,
      metaField: null,
      msg: (req: Request, res: Response): string => {
        const dbQueryCount = (
          asyncLocalStorage.getStore() as Map<string, any>
        )?.get("queryCount");

        const dbQueryTime = (
          asyncLocalStorage.getStore() as Map<string, any>
        )?.get("queryTime");

        return `${req.method} ${req.url} => Status(${res.statusCode}) ${
          dbQueryCount
            ? `(${dbQueryCount} DB queries over ${dbQueryTime}ms) `
            : ""
        }[${(res as any).responseTime}ms]`;
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: "2Mb" }));
  app.use(express.json());
  app.use(passport.initialize());
  // Adding API documentation
  app.use(express.static(__dirname + "/apidoc"));

  // Adding headers to allow cross-origin HTTP request.
  // This is so the web interface running on a different port/domain can access the API.
  // This could cause security issues with Cookies but JWTs are used instead of Cookies.
  app.all("*", (request: Request, response: Response, next: NextFunction) => {
    response.header("Access-Control-Allow-Origin", request.headers.origin);
    response.header(
      "Access-Control-Allow-Methods",
      "PUT, GET, POST, DELETE, OPTIONS, PATCH"
    );
    response.header(
      "Access-Control-Allow-Headers",
      "where, offset, limit, Authorization, Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
  });
  initialiseApi(app);
  app.use(customErrors.errorHandler);

  // Add file processing API.
  const fileProcessingApp = express();
  fileProcessingApp.use(express.urlencoded({ extended: false, limit: "50Mb" }));
  fileProcessingApp.use(express.json({ limit: "50Mb" }));

  initialiseFileProcessingApi(fileProcessingApp);
  http.createServer(fileProcessingApp).listen(config.fileProcessing.port);
  log.notice("Starting file processing on %d", config.fileProcessing.port);
  fileProcessingApp.use(customErrors.errorHandler);

  log.notice("Connecting to database.....");
  try {
    await models.sequelize.authenticate();
    log.info("Connected to database.");

    log.info("Preload super user permissions - note that if super-user permissions are changed externally, this API server must be manually reloaded to see the changes.");
    const superUsers = await models.User.findAll({
      where: { globalPermission: {[Op.ne]: "off"}}
    });
    for (const superUser of superUsers) {
      SuperUsers.set(superUser.id, superUser.globalPermission);
    }

    await checkS3Connection();
    await openHttpServer(app);
  } catch (error) {
    log.error(error.toString());
    process.exit(2);
  }
})();
