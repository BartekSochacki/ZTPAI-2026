const knex = require('knex');
const { types } = require('pg');
const config = require('../../knexfile');

types.setTypeParser(1082, (value) => value);
types.setTypeParser(20, (value) => Number(value));

module.exports = knex(config);
