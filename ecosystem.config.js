module.exports = {
  apps: [
    {
      name: 'aalas-web',
      script: 'server.js',
      interpreter: 'bun',           // 关键：用 Bun 跑
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        IMG_CDN: 'https://static.aalas.net'
      }
    },
    {
      name: 'aalas-exam',
      script: 'exam_server.js',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        EXAM_PORT: 3001
      }
    }
  ]
};