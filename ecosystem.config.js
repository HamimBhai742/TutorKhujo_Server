module.exports = {
  apps: [
    {
      name: "tutorkhujo-server",
      script: "./dist/server.js",
      instances: "max", // Uses all available CPU cores
      exec_mode: "cluster", // PM2 cluster mode
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5026,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 5026,
      },
    },
  ],
};
