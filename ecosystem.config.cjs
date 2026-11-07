// PM2 process file for production. On the server: `pm2 start ecosystem.config.cjs`.
// Runs `next start` bound to localhost; Nginx proxies the public domain to it.
module.exports = {
  apps: [
    {
      name: "binonce",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      time: true,
    },
  ],
};
