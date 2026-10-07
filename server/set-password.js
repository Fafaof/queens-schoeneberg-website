// Setzt (oder ändert) das Passwort für den Verwaltungsbereich.
// Aufruf:  node server/set-password.js
// Gespeichert wird nur ein Hash in server/data/config.json, nie das Passwort selbst.
const fs = require('node:fs');
const readline = require('node:readline');
const { hashPassword, FILES, DATA_DIR } = require('./server.js');

function save(password) {
  if (password.length < 10) {
    console.error('Das Passwort muss mindestens 10 Zeichen haben.');
    process.exit(1);
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILES.config, JSON.stringify(hashPassword(password), null, 2), { mode: 0o600 });
  console.log('Passwort gespeichert. Es gilt sofort, ein Neustart ist nicht nötig.');
}

// Für Skripte: Passwort über die Standardeingabe (echo "..." | node server/set-password.js)
if (!process.stdin.isTTY) {
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => save(input.trim()));
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Neues Passwort für die Verwaltung (mind. 10 Zeichen): ', (answer) => {
    rl.close();
    save(answer.trim());
  });
}
