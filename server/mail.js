// E-Mail-Versand ohne zusätzliche Pakete: spricht direkt SMTP über eine
// verschlüsselte Verbindung (Port 465, wie bei All-Inkl üblich).
// Zugangsdaten stehen in server/data/mail.json (einrichten mit
// "node server/set-mail.js"). Fehlt die Datei, wird nichts verschickt.
const tls = require('node:tls');
const os = require('node:os');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAIL_CONFIG = path.join(__dirname, 'data', 'mail.json');
const TIMEOUT_MS = 20000;

function loadMailConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(MAIL_CONFIG, 'utf8'));
    return config.host && config.user && config.password && config.from ? config : null;
  } catch {
    return null;
  }
}

// Zeilenumbrüche in Kopfzeilen würden es erlauben, fremde Kopfzeilen
// einzuschleusen — deshalb grundsätzlich entfernen.
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();
const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(oneLine(value), 'utf8').toString('base64')}?=`;
const addressOnly = (value) => oneLine(value).replace(/[<>\s]/g, '');

function buildMessage({ from, fromName, to, replyTo, subject, text }) {
  const body = Buffer.from(text.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  const headers = [
    `From: ${encodeHeader(fromName || "Queen's")} <${addressOnly(from)}>`,
    `To: <${addressOnly(to)}>`,
    replyTo ? `Reply-To: <${addressOnly(replyTo)}>` : null,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${addressOnly(from).split('@')[1] || os.hostname()}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    // Verhindert, dass Abwesenheitsnotizen auf unsere automatischen Mails antworten
    'Auto-Submitted: auto-generated',
  ].filter(Boolean);
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
}

// Schickt eine E-Mail. Wirft einen Fehler mit verständlicher Meldung, wenn
// der Mailserver etwas ablehnt (z.B. falsches Passwort).
function sendMail(message, config = loadMailConfig()) {
  if (!config) return Promise.reject(new Error('E-Mail-Versand ist nicht eingerichtet.'));
  const mail = { from: config.from, fromName: config.fromName, ...message };

  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: config.host, port: Number(config.port || 465), servername: config.host });
    let buffer = '';
    let finished = false;
    let waiting = null; // { expect, resolve, reject } für die nächste Server-Antwort

    const fail = (error) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      reject(error);
    };
    socket.setTimeout(TIMEOUT_MS, () => fail(new Error('Der Mailserver antwortet nicht.')));
    socket.on('error', (error) => fail(new Error(`Verbindung zum Mailserver fehlgeschlagen: ${error.message}`)));
    socket.on('close', () => fail(new Error('Der Mailserver hat die Verbindung beendet.')));

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      // Eine Antwort ist vollständig, wenn ihre letzte Zeile "123 Text" lautet
      // (mehrzeilige Antworten haben davor "123-Text").
      const lines = buffer.split('\r\n');
      const last = lines.length >= 2 ? lines[lines.length - 2] : '';
      if (!buffer.endsWith('\r\n') || !/^\d{3} /.test(last)) return;
      const reply = buffer.trim();
      buffer = '';
      if (!waiting) return;
      const { expect, resolve: next, reject: stop } = waiting;
      waiting = null;
      if (reply.startsWith(String(expect))) next(reply);
      else stop(new Error(`Mailserver meldet: ${last}`));
    });

    const answer = (expect) => new Promise((next, stop) => { waiting = { expect, resolve: next, reject: stop }; });
    const command = (line, expect) => {
      socket.write(`${line}\r\n`);
      return answer(expect);
    };

    (async () => {
      await answer(220);
      await command(`EHLO ${os.hostname() || 'localhost'}`, 250);
      await command('AUTH LOGIN', 334);
      await command(Buffer.from(config.user).toString('base64'), 334);
      await command(Buffer.from(config.password).toString('base64'), 235);
      await command(`MAIL FROM:<${addressOnly(mail.from)}>`, 250);
      await command(`RCPT TO:<${addressOnly(mail.to)}>`, 250);
      await command('DATA', 354);
      await command(`${buildMessage(mail)}.`, 250);
      socket.write('QUIT\r\n');
      finished = true;
      socket.end();
      resolve();
    })().catch(fail);
  });
}

module.exports = { sendMail, loadMailConfig, MAIL_CONFIG };
