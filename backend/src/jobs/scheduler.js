const cron = require('node-cron');
const membershipService = require('../services/membershipService');
const notificationService = require('../services/notificationService');

async function runJob(name, job) {
  try {
    const count = await job();
    console.log(`[scheduler] ${name}: processed ${count}`);
  } catch (err) {
    console.error(`[scheduler] ${name} failed`, err);
  }
}

function expireMemberships() {
  return runJob('expire-memberships', () => membershipService.expireOutdated());
}

function sendReminders() {
  return runJob('send-reminders', () => notificationService.sendDueReminders());
}

function startScheduler() {
  expireMemberships();
  return [
    cron.schedule('5 0 * * *', expireMemberships, { timezone: 'Europe/Warsaw' }),
    cron.schedule('*/10 * * * *', sendReminders, { timezone: 'Europe/Warsaw' })
  ];
}

module.exports = { startScheduler, expireMemberships, sendReminders };
