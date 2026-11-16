const { eventBus, EVENTS } = require('./eventBus');
const waitlistService = require('../services/waitlistService');
const notificationService = require('../services/notificationService');

let registered = false;

function runInBackground(name, task) {
  setImmediate(async () => {
    try {
      await task();
    } catch (err) {
      console.error(`Event handler "${name}" failed`, err);
    }
  });
}

function registerListeners() {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.on(EVENTS.ENROLLMENT_CANCELLED, ({ sessionId }) =>
    runInBackground(EVENTS.ENROLLMENT_CANCELLED, () => waitlistService.processWaitlist(sessionId))
  );

  eventBus.on(EVENTS.SESSION_CAPACITY_INCREASED, ({ sessionId }) =>
    runInBackground(EVENTS.SESSION_CAPACITY_INCREASED, () => waitlistService.processWaitlist(sessionId))
  );

  eventBus.on(EVENTS.WAITLIST_PROMOTED, (payload) =>
    runInBackground(EVENTS.WAITLIST_PROMOTED, () => notificationService.sendPromotionEmail(payload))
  );

  eventBus.on(EVENTS.SESSION_CANCELLED, (payload) =>
    runInBackground(EVENTS.SESSION_CANCELLED, () => notificationService.sendSessionCancelledEmails(payload))
  );
}

module.exports = { registerListeners };
