const { writeFileSync } = require('fs')

writeFileSync(
  '.env',
  `
VITE_CG_PUBLIC_URL=${process.env.VITE_CG_PUBLIC_URL}
VITE_CG_API_URL=${process.env.VITE_CG_API_URL}
VITE_SOCKET_SERVER_URL=${process.env.VITE_SOCKET_SERVER_URL}
VITE_SUPABASE_URL=${process.env.VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${process.env.VITE_SUPABASE_ANON_KEY}
`
)
