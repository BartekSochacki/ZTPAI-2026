const nodemailer = require('nodemailer');
const config = require('../config');

const transporter =
  config.env === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: false });

function sendMail({ to, subject, text }) {
  return transporter.sendMail({ from: config.smtp.from, to, subject, text });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'full', timeStyle: 'short' });
}

module.exports = { sendMail, formatDateTime };
