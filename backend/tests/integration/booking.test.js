const { eventBus, EVENTS } = require('../../src/events/eventBus');
const { app, db, request, resetDatabase, createUser, loginAs, giveMembership, dateOffset } = require('./helpers');

const HOUR = 3600000;
const tokens = {};
const ids = {};

function auth(name) {
  return { Authorization: `Bearer ${tokens[name]}` };
}

function slot(hoursFromNow, durationHours = 1) {
  const start = new Date(Date.now() + hoursFromNow * HOUR);
  start.setUTCMinutes(0, 0, 0);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + durationHours * HOUR).toISOString() };
}

beforeAll(async () => {
  await resetDatabase();
  await createUser({ email: 'admin@test.local', role: 'ADMIN' });
  const trainer = await createUser({ email: 'trainer@test.local', role: 'TRAINER' });
  await createUser({ email: 'trainer2@test.local', role: 'TRAINER' });
  const alice = await createUser({ email: 'alice@test.local' });
  const bob = await createUser({ email: 'bob@test.local' });
  await createUser({ email: 'nomembership@test.local' });
  await giveMembership(alice.id);
  await giveMembership(bob.id);
  ids.trainer = trainer.id;
  for (const name of ['admin', 'trainer', 'trainer2', 'alice', 'bob', 'nomembership']) {
    tokens[name] = await loginAs(`${name}@test.local`);
  }
});

afterAll(() => db.destroy());

describe('Rooms, class types and schedule (admin)', () => {
  test('admin creates room and class type', async () => {
    const room = await request(app).post('/api/rooms').set(auth('admin')).send({ name: 'Sala Test', capacity: 10 });
    const type = await request(app).post('/api/class-types').set(auth('admin')).send({ name: 'Yoga', description: 'Relax' });

    expect(room.status).toBe(201);
    expect(type.status).toBe(201);
    ids.room = room.body.id;
    ids.classType = type.body.id;
  });

  test('admin creates session with capacity 1', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .set(auth('admin'))
      .send({ classTypeId: ids.classType, trainerId: ids.trainer, roomId: ids.room, capacity: 1, ...slot(48) });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ capacity: 1, enrolledCount: 0, freeSpots: 1, version: 1 });
    ids.session = res.body.id;
  });

  test('creating overlapping session in the same room returns 409', async () => {
    const trainer2 = await request(app).get('/api/trainers').set(auth('admin'));
    const otherTrainerId = trainer2.body.find((t) => t.id !== ids.trainer).id;

    const res = await request(app)
      .post('/api/sessions')
      .set(auth('admin'))
      .send({ classTypeId: ids.classType, trainerId: otherTrainerId, roomId: ids.room, capacity: 5, ...slot(48) });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_CONFLICT');
  });

  test('GET /api/sessions supports pagination and filtering', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/sessions')
        .set(auth('admin'))
        .send({ classTypeId: ids.classType, trainerId: ids.trainer, roomId: ids.room, capacity: 5, ...slot(72 + i * 3) });
    }

    const page1 = await request(app).get('/api/sessions?page=1&limit=2').set(auth('alice'));
    const filtered = await request(app)
      .get(`/api/sessions?trainerId=${ids.trainer}&dateFrom=${dateOffset(0)}&limit=50`)
      .set(auth('alice'));

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta).toMatchObject({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(filtered.body.data.every((s) => s.trainer.id === ids.trainer)).toBe(true);
  });
});

describe('Enrollment flow with waitlist and event-driven promotion', () => {
  test('member without active membership cannot enroll (422)', async () => {
    const res = await request(app).post('/api/enrollments').set(auth('nomembership')).send({ sessionId: ids.session });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  test('first member is enrolled, second lands on waitlist', async () => {
    const alice = await request(app).post('/api/enrollments').set(auth('alice')).send({ sessionId: ids.session });
    const bob = await request(app).post('/api/enrollments').set(auth('bob')).send({ sessionId: ids.session });

    expect(alice.status).toBe(201);
    expect(alice.body.status).toBe('ENROLLED');
    expect(bob.status).toBe(201);
    expect(bob.body).toMatchObject({ status: 'WAITLISTED', waitlistPosition: 1 });
    ids.aliceEnrollment = alice.body.id;
    ids.bobEnrollment = bob.body.id;
  });

  test('trainer of the session sees participants, other trainer gets 403', async () => {
    const own = await request(app).get(`/api/sessions/${ids.session}/participants`).set(auth('trainer'));
    const other = await request(app).get(`/api/sessions/${ids.session}/participants`).set(auth('trainer2'));

    expect(own.status).toBe(200);
    expect(own.body.map((p) => p.status)).toEqual(['ENROLLED', 'WAITLISTED']);
    expect(other.status).toBe(403);
  });

  test('cancelling enrollment promotes first waitlisted member asynchronously', async () => {
    const processed = new Promise((resolve) => eventBus.once(EVENTS.WAITLIST_PROCESSED, resolve));

    const res = await request(app).patch(`/api/enrollments/${ids.aliceEnrollment}/cancel`).set(auth('alice'));
    const result = await processed;

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
    expect(result.promotedCount).toBe(1);
    const bob = await request(app).get('/api/enrollments/me').set(auth('bob'));
    expect(bob.body.find((e) => e.id === ids.bobEnrollment).status).toBe('ENROLLED');
  });

  test('cancellation less than 2 hours before the session is rejected', async () => {
    const session = await request(app)
      .post('/api/sessions')
      .set(auth('admin'))
      .send({ classTypeId: ids.classType, trainerId: ids.trainer, roomId: ids.room, capacity: 5, ...slot(1.5, 0.25) });
    expect(session.status).toBe(201);
    const enrollment = await request(app).post('/api/enrollments').set(auth('alice')).send({ sessionId: session.body.id });

    const res = await request(app).patch(`/api/enrollments/${enrollment.body.id}/cancel`).set(auth('alice'));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANCELLATION_DEADLINE_PASSED');
  });

  test('updating session with outdated version returns 409', async () => {
    const current = await request(app).get(`/api/sessions/${ids.session}`).set(auth('admin'));
    const body = {
      classTypeId: ids.classType,
      trainerId: ids.trainer,
      roomId: ids.room,
      capacity: 3,
      startsAt: current.body.startsAt,
      endsAt: current.body.endsAt
    };

    const first = await request(app).put(`/api/sessions/${ids.session}`).set(auth('admin')).send({ ...body, version: current.body.version });
    const second = await request(app).put(`/api/sessions/${ids.session}`).set(auth('admin')).send({ ...body, version: current.body.version });

    expect(first.status).toBe(200);
    expect(first.body.version).toBe(current.body.version + 1);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('VERSION_CONFLICT');
  });
});
