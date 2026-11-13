const db = require('../db/knex');

const WAITLIST_POSITION_SQL = `
  CASE WHEN e.status = 'WAITLISTED' THEN (
    SELECT COUNT(*) FROM enrollments w
    WHERE w.session_id = e.session_id
      AND w.status = 'WAITLISTED'
      AND (w.created_at < e.created_at OR (w.created_at = e.created_at AND w.id <= e.id))
  )::int END AS waitlist_position`;

async function countByStatus(sessionId, status, trx = db) {
  const [{ count }] = await trx('enrollments').where({ session_id: sessionId, status }).count({ count: '*' });
  return Number(count);
}

function findActive(sessionId, userId, trx = db) {
  return trx('enrollments').where({ session_id: sessionId, user_id: userId }).whereNot('status', 'CANCELLED').first();
}

async function create(data, trx = db) {
  const [enrollment] = await trx('enrollments').insert(data).returning('*');
  return enrollment;
}

function findById(id, trx = db) {
  return trx('enrollments as e').select('e.*', trx.raw(WAITLIST_POSITION_SQL)).where('e.id', id).first();
}

async function updateStatus(id, status, trx = db) {
  const [enrollment] = await trx('enrollments')
    .where({ id })
    .update({ status, updated_at: trx.fn.now() })
    .returning('*');
  return enrollment;
}

function findFirstWaitlisted(sessionId, trx) {
  return trx('enrollments')
    .where({ session_id: sessionId, status: 'WAITLISTED' })
    .orderBy('created_at')
    .orderBy('id')
    .forUpdate()
    .first();
}

function listByUser(userId) {
  return db('enrollments as e')
    .join('class_sessions as s', 's.id', 'e.session_id')
    .join('class_types as ct', 'ct.id', 's.class_type_id')
    .join('rooms as r', 'r.id', 's.room_id')
    .join('users as t', 't.id', 's.trainer_id')
    .select(
      'e.*',
      's.starts_at',
      's.ends_at',
      's.status as session_status',
      'ct.name as class_type_name',
      'r.name as room_name',
      't.first_name as trainer_first_name',
      't.last_name as trainer_last_name',
      db.raw(WAITLIST_POSITION_SQL)
    )
    .where('e.user_id', userId)
    .orderBy('s.starts_at', 'desc');
}

function listParticipants(sessionId) {
  return db('enrollments as e')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'e.user_id', 'e.status', 'e.created_at', 'u.first_name', 'u.last_name', 'u.email')
    .where('e.session_id', sessionId)
    .whereIn('e.status', ['ENROLLED', 'WAITLISTED'])
    .orderByRaw("CASE WHEN e.status = 'ENROLLED' THEN 0 ELSE 1 END")
    .orderBy('e.created_at')
    .orderBy('e.id');
}

function cancelAllForSession(sessionId, trx) {
  return trx('enrollments')
    .where({ session_id: sessionId })
    .whereIn('status', ['ENROLLED', 'WAITLISTED'])
    .update({ status: 'CANCELLED', updated_at: trx.fn.now() })
    .returning('*');
}

function findDueReminders(from, to) {
  return db('enrollments as e')
    .join('class_sessions as s', 's.id', 'e.session_id')
    .join('class_types as ct', 'ct.id', 's.class_type_id')
    .join('rooms as r', 'r.id', 's.room_id')
    .join('users as u', 'u.id', 'e.user_id')
    .select('e.id', 'u.email', 'u.first_name', 'ct.name as class_type_name', 'r.name as room_name', 's.starts_at')
    .where('e.status', 'ENROLLED')
    .andWhere('e.reminder_sent', false)
    .andWhere('s.status', 'SCHEDULED')
    .andWhere('s.starts_at', '>', from)
    .andWhere('s.starts_at', '<=', to);
}

function markReminderSent(id) {
  return db('enrollments').where({ id }).update({ reminder_sent: true });
}

module.exports = {
  countByStatus,
  findActive,
  create,
  findById,
  updateStatus,
  findFirstWaitlisted,
  listByUser,
  listParticipants,
  cancelAllForSession,
  findDueReminders,
  markReminderSent
};
