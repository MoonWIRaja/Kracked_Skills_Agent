const { spawn } = require('child_process');
const path = require('path');

// Extract arguments (e.g. "dev" from "node start-kds.js dev")
const isDev = process.argv.includes('dev');

const backendCwd = path.join(__dirname, 'backend');
const frontendCwd = path.join(__dirname, 'frontend');

const backendCmd = 'node server.js';
const frontendCmd = isDev ? 'npm run dev' : 'npm run start';

console.log('===================================================');
console.log(`🚀 Starting Kracked_Skills Agent in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
console.log('===================================================');

// Helper to spawn and pipe output with a prefix
function spawnService(name, color, cmd, cwd) {
    const [command, ...args] = cmd.split(' ');
    
    // Check if we need to run 'npm' on windows, it's actually 'npm.cmd'
    const isWin = process.platform === 'win32';
    const runningCmd = (isWin && command === 'npm') ? 'npm.cmd' : command;

    const child = spawn(runningCmd, args, { cwd, shell: isWin });

    child.stdout.on('data', Buffer => {
        const lines = Buffer.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => console.log(`${color}[${name}]${'\x1b[0m'} ${line}`));
    });

    child.stderr.on('data', Buffer => {
        const lines = Buffer.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => console.error(`\x1b[31m[${name} ERROR]\x1b[0m ${line}`));
    });

    child.on('close', code => {
        console.log(`${color}[${name}]${'\x1b[0m'} process exited with code ${code}`);
        process.exit(code);
    });

    return child;
}

// ANSI colors for terminal
const cyan = '\x1b[36m';
const magenta = '\x1b[35m';

spawnService('BACKEND(4891)', cyan, backendCmd, backendCwd);
spawnService('FRONTEND(4892)', magenta, frontendCmd, frontendCwd);

process.on('SIGINT', () => {
    console.log('\nGracefully shutting down KD System...');
    process.exit(0);
});
