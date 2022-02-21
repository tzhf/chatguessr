'use strict';

const path = require("path");
const pkgUp = require('pkg-up');
const Sentry = require('@sentry/electron');
const dotenv = require('dotenv');
const { version } = require('../package.json');

const pkg = pkgUp.sync();
if (pkg) {
	dotenv.config({
		path: path.join(path.dirname(pkg), ".env")
	});
}

if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		release: version,
	});
}