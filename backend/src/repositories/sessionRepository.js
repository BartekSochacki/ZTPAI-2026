const db = require('../db/knex');
const { addDays } = require('../utils/dates');

function detailedQuery(trx = db) {
  return trx('class_sessions as s')
    .join('class_types as ct', 'ct.id', 's.class_type_id')
    .join('users as t', 't.id', 's.trainer_id')
    .join('rooms as r', 'r.id', 's.room_id')
    .select(
      's.*',
      'ct.name as class_type_name',
      't.first_name as trainer_first_name',
      't.last_name as trainer_last_name',
      'r.name as room_name',
      trx.raw(
        "(SELECT COUNT(*) FROM enrollments e WHERE e.session_id = s.id AND e.status = 'ENROLLED')::int AS enrolled_count"
      ),
      trx.raw(
        "(SELECT COUNT(*) FROM enrollments e WHERE e.session_id = s.id AND e.status = 'WAITLISTED')::int AS waitlist_count"
      )
    );
}

function applyFilters(query, filters) {
  if (filters.dateFrom) {
    query.where('s.starts_at', '>=', filters.dateFrom);
  }
  if (filters.dateTo) {
    query.where('s.starts_at', '<', addDays(filters.dateTo, 1));
  }
  if (!filters.includePast) {
    query.where('s.starts_at', '>=', db.fn.now());
  }
  if (!filters.includeCancelled) {
    query.where('s.status', 'SCHEDULED');
  }
  if (filters.classTypeId) {
    query.where('s.class_type_id', filters.classTypeId);
  }
  if (filters.trainerId) {
    query.where('s.trainer_id', filters.trainerId);
  }
  if (filters.roomId) {
    query.where('s.room_id', filters.roomId);
  }
  return query;
}

async function list(filters) {
  const { page, limit } = filters;
  const [{ count }] = await applyFilters(db('class_sessions as s'), filters).count({ count: '*' });
  const rows = await applyFilters(detailedQuery(), filters)
    .orderBy('s.starts_at')
    .orderBy('s.id')
    .limit(limit)
    .offset((page - 1) * limit);
  return { rows, total: Number(count) };
}

function findDetailedById(id, trx = db) {
  return detailedQuery(trx).where('s.id', id).first();
}

function findById(id, trx = db) {
  return trx('class_sessions').where({ id }).first();
}

function lockById(id, trx) {
  return trx('class_sessions').where({ id }).forUpdate().first();
}

function findConflicts({ roomId, trainerId, startsAt, endsAt, excludeId }, trx = db) {
  const query = trx('class_sessions')
    .select('id', 'room_id', 'trainer_id', 'starts_at', 'ends_at')
    .where('status', 'SCHEDULED')
    .andWhere('starts_at', '<', endsAt)
    .andWhere('ends_at', '>', startsAt)
    .andWhere((builder) => builder.where('room_id', roomId).orWhere('trainer_id', trainerId));
  if (excludeId) {
    query.whereNot('id', excludeId);
  }
  return query;
}

async function create(data, trx = db) {
  const [session] = await trx('class_sessions').insert(data).returning('*');
  return session;
}

async function updateWithVersion(id, version, data, trx = db) {
  const [session] = await trx('class_sessions')
    .where({ id, version })
    .update({ ...data, version: version + 1, updated_at: trx.fn.now() })
    .returning('*');
  return session;
}

async function updateStatus(id, status, trx = db) {
  const [session] = await trx('class_sessions')
    .where({ id })
    .update({ status, version: trx.raw('version + 1'), updated_at: trx.fn.now() })
    .returning('*');
  return session;
}

function remove(id) {
  return db('class_sessions').where({ id }).del();
}

function listByTrainer(trainerId, includePast) {
  const query = detailedQuery().where('s.trainer_id', trainerId);
  if (!includePast) {
    query.where('s.starts_at', '>=', db.fn.now());
  }
  return query.orderBy('s.starts_at');
}

module.exports = {
  list,
  findDetailedById,
  findById,
  lockById,
  findConflicts,
  create,
  updateWithVersion,
  updateStatus,
  remove,
  listByTrainer
};
