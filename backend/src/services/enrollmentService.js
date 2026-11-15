const db = require('../db/knex');
const config = require('../config');
const AppError = require('../errors/AppError');
const sessionRepository = require('../repositories/sessionRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const membershipRepository = require('../repositories/membershipRepository');
const { eventBus, EVENTS } = require('../events/eventBus');
const { toEnrollmentDto } = require('../utils/dto');
const { toDateString, hoursBetween } = require('../utils/dates');

async function enroll(userId, sessionId) {
  const enrollment = await db.transaction(async (trx) => {
    const session = await sessionRepository.lockById(sessionId, trx);
    if (!session) {
      throw AppError.notFound('Session not found');
    }
    if (session.status !== 'SCHEDULED') {
      throw AppError.businessRule('Session has been cancelled', 'SESSION_CANCELLED');
    }
    if (new Date(session.starts_at) <= new Date()) {
      throw AppError.businessRule('Session has already started', 'SESSION_STARTED');
    }
    const membership = await membershipRepository.findActiveForDate(userId, toDateString(session.starts_at), trx);
    if (!membership) {
      throw AppError.businessRule(
        'An active membership valid on the session date is required to enroll',
        'NO_ACTIVE_MEMBERSHIP'
      );
    }
    const existing = await enrollmentRepository.findActive(sessionId, userId, trx);
    if (existing) {
      throw AppError.conflict('You are already enrolled or on the waitlist for this session', 'ALREADY_ENROLLED');
    }
    const enrolledCount = await enrollmentRepository.countByStatus(sessionId, 'ENROLLED', trx);
    const status = enrolledCount < session.capacity ? 'ENROLLED' : 'WAITLISTED';
    const created = await enrollmentRepository.create({ session_id: sessionId, user_id: userId, status }, trx);
    return enrollmentRepository.findById(created.id, trx);
  });
  return toEnrollmentDto(enrollment);
}

async function cancel(user, enrollmentId) {
  const result = await db.transaction(async (trx) => {
    const enrollment = await enrollmentRepository.findById(enrollmentId, trx);
    if (!enrollment) {
      throw AppError.notFound('Enrollment not found');
    }
    if (user.role !== 'ADMIN' && enrollment.user_id !== user.id) {
      throw AppError.forbidden('You can only cancel your own enrollments');
    }
    if (enrollment.status === 'CANCELLED') {
      throw AppError.businessRule('Enrollment is already cancelled', 'ALREADY_CANCELLED');
    }
    const session = await sessionRepository.lockById(enrollment.session_id, trx);
    const hoursLeft = hoursBetween(new Date(), session.starts_at);
    if (user.role !== 'ADMIN' && hoursLeft < config.rules.cancelDeadlineHours) {
      throw AppError.businessRule(
        `Cancellation is possible no later than ${config.rules.cancelDeadlineHours} hours before the session`,
        'CANCELLATION_DEADLINE_PASSED'
      );
    }
    const updated = await enrollmentRepository.updateStatus(enrollmentId, 'CANCELLED', trx);
    return { updated, freedSpot: enrollment.status === 'ENROLLED' };
  });
  if (result.freedSpot) {
    eventBus.emit(EVENTS.ENROLLMENT_CANCELLED, { sessionId: result.updated.session_id });
  }
  return toEnrollmentDto(result.updated);
}

async function listMine(userId) {
  const rows = await enrollmentRepository.listByUser(userId);
  return rows.map(toEnrollmentDto);
}

module.exports = { enroll, cancel, listMine };
