require('@sentry/electron').init({
	dsn: process.env.SENTRY_DSN,
	release: require('../package.json').version,
});