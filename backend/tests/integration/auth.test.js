const { app, db, request, resetDatabase, createUser, loginAs } = require('./helpers');

beforeAll(resetDatabase);
afterAll(() => db.destroy());

describe('Auth API', () => {
  test('POST /api/auth/register creates member account and returns token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'New.User@fitness.local',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User'
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'new.user@fitness.local', role: 'MEMBER' });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('POST /api/auth/register returns 409 for duplicated email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'new.user@fitness.local',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User'
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('POST /api/auth/register returns 400 for invalid data', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('POST /api/auth/login returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'new.user@fitness.local', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me requires token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  test('member cannot access admin endpoint (403)', async () => {
    await createUser({ email: 'member@fitness.local' });
    const token = await loginAs('member@fitness.local');

    const res = await request(app).post('/api/rooms').set('Authorization', `Bearer ${token}`).send({ name: 'X', capacity: 5 });

    expect(res.status).toBe(403);
  });
});
