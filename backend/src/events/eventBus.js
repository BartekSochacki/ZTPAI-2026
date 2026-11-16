const { EventEmitter } = require('node:events');

const eventBus = new EventEmitter();

const EVENTS = {
  ENROLLMENT_CANCELLED: 'enrollment.cancelled',
  SESSION_CAPACITY_INCREASED: 'session.capacityIncreased',
  SESSION_CANCELLED: 'session.cancelled',
  WAITLIST_PROMOTED: 'waitlist.promoted',
  WAITLIST_PROCESSED: 'waitlist.processed'
};

module.exports = { eventBus, EVENTS };
