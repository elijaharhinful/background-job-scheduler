module.exports = {
  apps: [
    {
      name: 'background-job-scheduler',
      script: 'dist/main.js',
      instances: '1',
      exec_mode: 'fork', // Using fork instead of cluster so internal heap/state isn't split among multiple Node processes
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
