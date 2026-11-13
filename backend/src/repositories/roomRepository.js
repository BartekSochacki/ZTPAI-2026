const db = require('../db/knex');

function findAll() {
  return db('rooms').orderBy('name');
}

function findById(id) {
  return db('rooms').where({ id }).first();
}

async function create(data) {
  const [room] = await db('rooms').insert(data).returning('*');
  return room;
}

async function update(id, data) {
  const [room] = await db('rooms').where({ id }).update(data).returning('*');
  return room;
}

function remove(id) {
  return db('rooms').where({ id }).del();
}

module.exports = { findAll, findById, create, update, remove };
