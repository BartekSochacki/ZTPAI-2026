const db = require('../db/knex');

function findActiveForDate(userId, date, trx = db) {
  return trx('memberships')
    .where({ user_id: userId, status: 'ACTIVE' })
    .andWhere('start_date', '<=', date)
    .andWhere('end_date', '>=', date)
    .first();
}

function findOverlapping(userId, startDate, endDate) {
  return db('memberships')
    .where({ user_id: userId, status: 'ACTIVE' })
    .andWhere('start_date', '<=', endDate)
    .andWhere('end_date', '>=', startDate)
    .first();
}

async function create(data) {
  const [membership] = await db('memberships').insert(data).returning('*');
  return membership;
}

function findById(id) {
  return db('memberships').where({ id }).first();
}

async function list({ page, limit, userId, status }) {
  const query = db('memberships as m').join('users as u', 'u.id', 'm.user_id');
  if (userId) {
    query.where('m.user_id', userId);
  }
  if (status) {
    query.where('m.status', status);
  }
  const [{ count }] = await query.clone().count({ count: '*' });
  const rows = await query
    .select('m.*', 'u.email as user_email', 'u.first_name as user_first_name', 'u.last_name as user_last_name')
    .orderBy('m.start_date', 'desc')
    .orderBy('m.id', 'desc')
    .limit(limit)
    .offset((page - 1) * limit);
  return { rows, total: Number(count) };
}

function listByUser(userId) {
  return db('memberships').where({ user_id: userId }).orderBy('start_date', 'desc');
}

async function updateStatus(id, status) {
  const [membership] = await db('memberships').where({ id }).update({ status }).returning('*');
  return membership;
}

function expireOutdated(today) {
  return db('memberships')
    .where({ status: 'ACTIVE' })
    .andWhere('end_date', '<', today)
    .update({ status: 'EXPIRED' })
    .returning('*');
}

module.exports = {
  findActiveForDate,
  findOverlapping,
  create,
  findById,
  list,
  listByUser,
  updateStatus,
  expireOutdated
};
