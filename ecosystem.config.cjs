// PM2 : `pm2 start ecosystem.config.cjs`. Node 24 runs the TypeScript sources directly (type stripping).
module.exports = {
  apps: [
    {
      name: "gestion-fourmizzz-discord",
      script: "src/index.ts",
      interpreter: "node",
      node_args: "--env-file-if-exists=.env",
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
