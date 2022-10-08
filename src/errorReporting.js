'use strict';

const path = require("path");
const findUp = require('find-up');
const Sentry = require('@sentry/electron');
const dotenv = require('dotenv');
const { version } = require('../package.json');
const { accessSync } = require("fs");

const envPath = findUp.sync(".env") ?? path.join(__dirname, "../.env");
try {
	accessSync(envPath);
	dotenv.config({ path: envPath });
} catch (error) {
	console.error(error);
}

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		release: version,
	});
}