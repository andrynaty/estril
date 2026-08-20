const { spawn } = require('node:child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const electron = process.platform === 'win32' ? 'electron.cmd' : 'electron';
const vite = spawn(npm, ['run', 'dev'], { stdio: 'inherit', shell: false });
let app;
let started = false;

const startElectron = () => {
  if (started) return;
  started = true;
  app = spawn(electron, ['.'], { stdio: 'inherit', shell: false, env: { ...process.env, RUBA_DEV_URL: 'http://localhost:3000' } });
  app.on('exit', (code) => {
    if (!vite.killed) vite.kill('SIGTERM');
    process.exit(code ?? 0);
  });
};

setTimeout(startElectron, 1800);
const shutdown = () => {
  if (app && !app.killed) app.kill('SIGTERM');
  if (!vite.killed) vite.kill('SIGTERM');
};
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });
