const fs = require('fs');
const path = require('path');

try {
  const contents = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
