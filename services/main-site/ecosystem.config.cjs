module.exports = {
  apps: [{
    name: "main-site",
    cwd: "/home/ubuntu/o4o-platform/services/main-site",
    script: "./node_modules/vite/bin/vite.js",
    args: "--host --port 3000",
    interpreter: "node",
    watch: false,
    env: {
      "NODE_ENV": "development",
    }
  }]
};
