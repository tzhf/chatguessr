const { writeFileSync } = require("fs");

writeFileSync(".env", `
CG_PUBLIC_URL=${process.env.CG_PUBLIC_URL}
CG_API_URL=${process.env.CG_API_URL}
SOCKET_SERVER_URL=${process.env.SOCKET_SERVER_URL}
SENTRY_DSN=${process.env.SENTRY_DSN}
SUPABASE_URL=${process.env.SUPABASE_URL}
SUPABASE_ANON_KEY=${process.env.SUPABASE_ANON_KEY}
TWITCH_CLIENT_ID=${process.env.TWITCH_CLIENT_ID}
`);