const { app, db, request, resetDatabase, createUser, loginAs } = require('./helpers');

const HOUR = 3600000;
const card = { holder: 'Nowy Klient', number: '4242 4242 4242 4242', expiry: '12/39', cvc: '123' };
let token;
let sessionId;

function auth() {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await resetDatabase();
  const trainer = await createUser({ email: 'trainer@test.local', role: 'TRAINER' });
  const [room] = await db('rooms').insert({ name: 'Sala', capacity: 10 }).returning('*');
  const [type] = await db('class_types').insert({ name: 'Yoga' }).returning('*');
  const start = new Date(Date.now() + 72 * HOUR);
  const [session] = await db('class_sessions')
    .insert({
      class_type_id: type.id,
      trainer_id: trainer.id,
      room_id: room.id,
      starts_at: start,
      ends_at: new Date(start.getTime() + HOUR),
      capacity: 5
    })
    .returning('*');
  sessionId = session.id;

  const register = await request(app)
    .post('/api/auth/register')
    .send({ email: 'nowy@test.local', password: 'Password123!', firstName: 'Nowy', lastName: 'Klient' });
  token = register.body.token;
});

afterAll(() => db.destroy());

describe('Buying a membership with mocked payment', () => {
  test('new account cannot enroll before buying a membership', async () => {
    const res = await request(app).post('/api/enrollments').set(auth()).send({ sessionId });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  test('plans endpoint returns prices', async () => {
    const res = await request(app).get('/api/memberships/plans').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ type: 'MONTHLY', days: 30, price: 12900, currency: 'PLN' });
  });

  test('invalid card number is rejected by validation (400)', async () => {
    const res = await request(app)
      .post('/api/memberships/purchase')
      .set(auth())
      .send({ type: 'MONTHLY', card: { ...card, number: '1234 5678 9012 3456' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('declined test card returns 402 and creates no membership', async () => {
    const res = await request(app)
      .post('/api/memberships/purchase')
      .set(auth())
      .send({ type: 'MONTHLY', card: { ...card, number: '4000 0000 0000 0002' } });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('CARD_DECLINED');
    const mine = await request(app).get('/api/memberships/me').set(auth());
    expect(mine.body.active).toBeNull();
  });

  test('successful payment activates membership and member can enroll', async () => {
    const res = await request(app).post('/api/memberships/purchase').set(auth()).send({ type: 'MONTHLY', card });
    expect(res.status).toBe(201);
    expect(res.body.membership).toMatchObject({ type: 'MONTHLY', status: 'ACTIVE' });
    expect(res.body.payment).toMatchObject({ status: 'SUCCEEDED', amount: 12900, cardLast4: '4242' });

    const enroll = await request(app).post('/api/enrollments').set(auth()).send({ sessionId });
    expect(enroll.status).toBe(201);
    expect(enroll.body.status).toBe('ENROLLED');
  });

  test('payment history lists both attempts', async () => {
    const res = await request(app).get('/api/payments/me').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.status)).toEqual(['SUCCEEDED', 'DECLINED']);
  });

  test('trainer cannot buy a membership (403)', async () => {
    const trainerToken = await loginAs('trainer@test.local');
    const res = await request(app)
      .post('/api/memberships/purchase')
      .set({ Authorization: `Bearer ${trainerToken}` })
      .send({ type: 'MONTHLY', card });
    expect(res.status).toBe(403);
  });
});
