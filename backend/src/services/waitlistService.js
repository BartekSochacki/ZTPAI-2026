const db = require('../db/knex');
const sessionRepository = require('../repositories/sessionRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const { eventBus, EVENTS } = require('../events/eventBus');

async function processWaitlist(sessionId) {
  const promoted = await db.transaction(async (trx) => {
    const session = await sessionRepository.lockById(sessionId, trx);
    if (!session || session.status !== 'SCHEDULED' || new Date(session.starts_at) <= new Date()) {
      return [];
    }
    const enrolledCount = await enrollmentRepository.countByStatus(sessionId, 'ENROLLED', trx);
    let freeSpots = session.capacity - enrolledCount;
    const result = [];
    while (freeSpots > 0) {
      const next = await enrollmentRepository.findFirstWaitlisted(sessionId, trx);
      if (!next) {
        break;
      }
      result.push(await enrollmentRepository.updateStatus(next.id, 'ENROLLED', trx));
      freeSpots -= 1;
    }
    return result;
  });

  promoted.forEach((enrollment) =>
    eventBus.emit(EVENTS.WAITLIST_PROMOTED, { enrollmentId: enrollment.id, userId: enrollment.user_id, sessionId })
  );
  eventBus.emit(EVENTS.WAITLIST_PROCESSED, { sessionId, promotedCount: promoted.length });
  return promoted;
}

module.exports = { processWaitlist };
