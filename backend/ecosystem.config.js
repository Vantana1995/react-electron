module.exports = {
  apps: [{
    name: 'twitter-backend',
    script: 'npm',
    args: 'start',
    cwd: '/root/react-electron/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 80
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true
  }]
};
