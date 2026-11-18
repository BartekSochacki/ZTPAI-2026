const bcrypt = require('bcryptjs');
const request = require('supertest');
const db = require('../../src/db/knex');
const { createApp } = require('../../src/app');
const { registerListeners } = require('../../src/events/listeners');

registerListeners();
const app = createApp();

async function resetDatabase() {
  await db.migrate.latest();
  await db.raw('TRUNCATE enrollments, class_sessions, class_types, rooms, memberships, users RESTART IDENTITY CASCADE');
}

async function createUser({ email, role = 'MEMBER', password = 'Password123!' }) {
  const [user] = await db('users')
    .insert({
      email,
      password_hash: await bcrypt.hash(password, 4),
      first_name: email.split('@')[0],
      last_name: 'Test',
      role
    })
    .returning('*');
  return user;
}

async function loginAs(email, password = 'Password123!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function giveMembership(userId) {
  await db('memberships').insert({
    user_id: userId,
    type: 'MONTHLY',
    start_date: dateOffset(-1),
    end_date: dateOffset(29),
    status: 'ACTIVE'
  });
}

module.exports = { app, db, request, resetDatabase, createUser, loginAs, giveMembership, dateOffset };
