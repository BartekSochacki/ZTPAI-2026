const db = require('../db/knex');

async function create(data, trx = db) {
  const [payment] = await trx('payments').insert(data).returning('*');
  return payment;
}

function listByUser(userId) {
  return db('payments').where({ user_id: userId }).orderBy('created_at', 'desc').orderBy('id', 'desc');
}

module.exports = { create, listByUser };
