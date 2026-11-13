const db = require('../db/knex');

function findAll() {
  return db('class_types').orderBy('name');
}

function findById(id) {
  return db('class_types').where({ id }).first();
}

async function create(data) {
  const [classType] = await db('class_types').insert(data).returning('*');
  return classType;
}

async function update(id, data) {
  const [classType] = await db('class_types').where({ id }).update(data).returning('*');
  return classType;
}

function remove(id) {
  return db('class_types').where({ id }).del();
}

module.exports = { findAll, findById, create, update, remove };
