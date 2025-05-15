import { Application } from 'express';

// We reuse this import in order to have access to the `body` property in requests
import express from 'express';

// ℹ️ Responsible for the messages you see in the terminal as requests are coming in
// https://www.npmjs.com/package/morgan
import logger from 'morgan';

// ℹ️ Needed when we deal with cookies (we will when dealing with authentication)
// https://www.npmjs.com/package/cookie-parser
import cookieParser from 'cookie-parser';

// ℹ️ Needed to accept from requests from 'the outside'. CORS stands for cross origin resource sharing
// unless the request if from the same domain, by default express wont accept POST requests
import cors from 'cors';

import dotenv from 'dotenv';
dotenv.config();

const FRONTEND_URL_LOCAL = process.env.ORIGIN_LOCAL;
const FRONTEND_URL_LOCAL_PREVIEW = process.env.ORIGIN_LOCAL_PREVIEW;
const FRONTEND_URL_PROD = process.env.ORIGIN_PRODUCTION;
const FRONTEND_URL_DEV = process.env.ORIGIN_DEVELOPMENT;

export const allowedURLs = [
  FRONTEND_URL_LOCAL,
  FRONTEND_URL_LOCAL_PREVIEW,
  FRONTEND_URL_PROD,
  FRONTEND_URL_DEV,
];
console.log(`🚀 ~ allowedURLs:`, allowedURLs)

// Middleware configuration
export default function config(app: Application) {
  // Because this is a server that will accept requests from outside and it will be hosted ona server with a `proxy`, express needs to know that it should trust that setting.
  // Services like heroku use something called a proxy and you need to add this to your server
  app.set('trust proxy', 1);

  // controls a very specific header to pass headers from the frontend
  app.use(
    cors({
      origin: allowedURLs,
      credentials: true,
    })
  );

  // In development environment the app logs
  app.use(logger('dev'));

  // To have access to `body` property in the request
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
}
