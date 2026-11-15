const db = require('../db/knex');
const AppError = require('../errors/AppError');
const sessionRepository = require('../repositories/sessionRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const userRepository = require('../repositories/userRepository');
const roomRepository = require('../repositories/roomRepository');
const classTypeRepository = require('../repositories/classTypeRepository');
const { eventBus, EVENTS } = require('../events/eventBus');
const { toSessionDto, toParticipantDto } = require('../utils/dto');
const { paginated } = require('../utils/pagination');

function toRow(data) {
  return {
    class_type_id: data.classTypeId,
    trainer_id: data.trainerId,
    room_id: data.roomId,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    capacity: data.capacity
  };
}

async function validateSessionData(data, excludeId) {
  const [classType, trainer, room] = await Promise.all([
    classTypeRepository.findById(data.classTypeId),
    userRepository.findById(data.trainerId),
    roomRepository.findById(data.roomId)
  ]);
  if (!classType) {
    throw AppError.notFound('Class type not found');
  }
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }
  if (trainer.role !== 'TRAINER') {
    throw AppError.businessRule('Selected user is not a trainer', 'NOT_A_TRAINER');
  }
  if (!room) {
    throw AppError.notFound('Room not found');
  }
  if (data.capacity > room.capacity) {
    throw AppError.businessRule(
      `Session capacity cannot exceed room capacity (${room.capacity})`,
      'CAPACITY_EXCEEDS_ROOM'
    );
  }
  if (new Date(data.startsAt) <= new Date()) {
    throw AppError.businessRule('Session must start in the future', 'SESSION_IN_PAST');
  }
  const conflicts = await sessionRepository.findConflicts({
    roomId: data.roomId,
    trainerId: data.trainerId,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    excludeId
  });
  if (conflicts.some((c) => c.room_id === data.roomId)) {
    throw AppError.conflict('Room is already booked at this time', 'ROOM_CONFLICT');
  }
  if (conflicts.some((c) => c.trainer_id === data.trainerId)) {
    throw AppError.conflict('Trainer already has a session at this time', 'TRAINER_CONFLICT');
  }
}

async function list(filters) {
  const { rows, total } = await sessionRepository.list(filters);
  return paginated(rows.map(toSessionDto), total, filters.page, filters.limit);
}

async function getById(id) {
  const session = await sessionRepository.findDetailedById(id);
  if (!session) {
    throw AppError.notFound('Session not found');
  }
  return toSessionDto(session);
}

async function create(data) {
  await validateSessionData(data);
  const session = await sessionRepository.create(toRow(data));
  return getById(session.id);
}

async function update(id, data) {
  const existing = await sessionRepository.findById(id);
  if (!existing) {
    throw AppError.notFound('Session not found');
  }
  if (existing.version !== data.version) {
    throw AppError.conflict('Session was modified by someone else. Refresh and try again.', 'VERSION_CONFLICT');
  }
  if (existing.status === 'CANCELLED') {
    throw AppError.businessRule('Cancelled session cannot be edited', 'SESSION_CANCELLED');
  }
  if (new Date(existing.starts_at) <= new Date()) {
    throw AppError.businessRule('Session that has already started cannot be edited', 'SESSION_STARTED');
  }
  await validateSessionData(data, id);
  const enrolledCount = await enrollmentRepository.countByStatus(id, 'ENROLLED');
  if (data.capacity < enrolledCount) {
    throw AppError.businessRule(
      `Capacity cannot be lower than the number of enrolled participants (${enrolledCount})`,
      'CAPACITY_BELOW_ENROLLED'
    );
  }
  const updated = await sessionRepository.updateWithVersion(id, data.version, toRow(data));
  if (!updated) {
    throw AppError.conflict('Session was modified by someone else. Refresh and try again.', 'VERSION_CONFLICT');
  }
  if (data.capacity > existing.capacity) {
    eventBus.emit(EVENTS.SESSION_CAPACITY_INCREASED, { sessionId: id });
  }
  return getById(id);
}

async function cancel(id) {
  const cancelledEnrollments = await db.transaction(async (trx) => {
    const session = await sessionRepository.lockById(id, trx);
    if (!session) {
      throw AppError.notFound('Session not found');
    }
    if (session.status === 'CANCELLED') {
      throw AppError.businessRule('Session is already cancelled', 'SESSION_CANCELLED');
    }
    await sessionRepository.updateStatus(id, 'CANCELLED', trx);
    return enrollmentRepository.cancelAllForSession(id, trx);
  });
  eventBus.emit(EVENTS.SESSION_CANCELLED, {
    sessionId: id,
    userIds: cancelledEnrollments.map((e) => e.user_id)
  });
  return getById(id);
}

async function remove(id) {
  const deleted = await sessionRepository.remove(id);
  if (!deleted) {
    throw AppError.notFound('Session not found');
  }
}

async function listForTrainer(trainerId, includePast) {
  const rows = await sessionRepository.listByTrainer(trainerId, includePast);
  return rows.map(toSessionDto);
}

async function listParticipants(id, user) {
  const session = await sessionRepository.findById(id);
  if (!session) {
    throw AppError.notFound('Session not found');
  }
  if (user.role === 'TRAINER' && session.trainer_id !== user.id) {
    throw AppError.forbidden('You can only view participants of your own sessions');
  }
  const rows = await enrollmentRepository.listParticipants(id);
  return rows.map(toParticipantDto);
}

module.exports = { list, getById, create, update, cancel, remove, listForTrainer, listParticipants };
