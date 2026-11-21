const db = require('../db/knex');

const PUBLIC_COLUMNS = ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'];

function findByEmail(email) {
  return db('users').where({ email }).first();
}

function findById(id, trx = db) {
  return trx('users').select(PUBLIC_COLUMNS).where({ id }).first();
}

async function create(data) {
  const [user] = await db('users').insert(data).returning(PUBLIC_COLUMNS);
  return user;
}

async function list({ page, limit, role, search }) {
  const query = db('users');
  if (role) {
    query.where({ role });
  }
  if (search) {
    const pattern = `%${search}%`;
    query.where((builder) =>
      builder.whereILike('email', pattern).orWhereILike('first_name', pattern).orWhereILike('last_name', pattern)
    );
  }
  const [{ count }] = await query.clone().count({ count: '*' });
  const rows = await query
    .select(PUBLIC_COLUMNS)
    .orderBy('id')
    .limit(limit)
    .offset((page - 1) * limit);
  return { rows, total: Number(count) };
}

async function updateRole(id, role) {
  const [user] = await db('users').where({ id }).update({ role }).returning(PUBLIC_COLUMNS);
  return user;
}

function remove(id) {
  return db('users').where({ id }).del();
}

function listTrainers() {
  return db('users').select('id', 'first_name', 'last_name').where({ role: 'TRAINER' }).orderBy(['last_name', 'first_name']);
}

function lockById(id, trx) {
  return trx('users').select('id', 'role').where({ id }).forUpdate().first();
}

module.exports = { findByEmail, findById, create, list, updateRole, remove, listTrainers, lockById };
