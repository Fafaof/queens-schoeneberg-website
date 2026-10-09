// Richtet den E-Mail-Versand ein und schickt eine Testmail.
// Aufruf:  node server/set-mail.js
// Die Zugangsdaten landen nur in server/data/mail.json auf dem Server
// (nicht im Repository). Passwort im Postfach geändert? Einfach erneut aufrufen.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { sendMail, MAIL_CONFIG } = require('./mail.js');

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (question, fallback) => (await rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim() || fallback || '';

  console.log("E-Mail-Versand für Queen's einrichten\n");
  const config = {
    host: await ask('Postausgangsserver (SMTP)', 'w0199103.kasserver.com'),
    port: Number(await ask('Port (verschlüsselt, SSL/TLS)', '465')),
    user: await ask('Benutzername des Postfachs (bei All-Inkl meist m0…)'),
    password: await ask('Passwort des Postfachs'),
    from: await ask('Absender-Adresse', 'reservierung@queensberlin.de'),
    fromName: "Queen's Schöneberg",
    notifyTo: await ask('Wohin sollen neue Anfragen gemeldet werden?', 'info@queensberlin.de'),
    confirmGuest: !/^n/i.test(await ask('Eingangsbestätigung an den Gast schicken? (j/n)', 'j')),
  };
  rl.close();

  console.log('\nSchicke Testmail …');
  try {
    await sendMail(
      {
        to: config.notifyTo,
        subject: "Test: E-Mail-Versand der Queen's-Website",
        text: 'Diese Testmail bestätigt, dass die Website E-Mails verschicken kann.\n\nAb jetzt meldet sie hier jede neue Anfrage.',
      },
      config
    );
  } catch (error) {
    console.error(`Hat nicht geklappt: ${error.message}\nEs wurde nichts gespeichert.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(MAIL_CONFIG), { recursive: true });
  fs.writeFileSync(MAIL_CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log(`Testmail an ${config.notifyTo} verschickt und Einstellungen gespeichert.\nSie gelten sofort, ein Neustart ist nicht nötig.`);
})();
