const bcrypt = require('bcryptjs');

function daysFromToday(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function at(daysAhead, hour, minute = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(hour - 1, minute, 0, 0);
  return date;
}

exports.seed = async (knex) => {
  const [{ count }] = await knex('users').count({ count: '*' });
  if (Number(count) > 0) {
    console.log('Database already contains data, skipping demo seed');
    return;
  }

  const hash = (password) => bcrypt.hashSync(password, 10);

  const users = await knex('users')
    .insert([
      { email: 'admin@fitness.local', password_hash: hash('Admin123!'), first_name: 'Anna', last_name: 'Kowalska', role: 'ADMIN' },
      { email: 'trener1@fitness.local', password_hash: hash('Trener123!'), first_name: 'Marek', last_name: 'Nowak', role: 'TRAINER' },
      { email: 'trener2@fitness.local', password_hash: hash('Trener123!'), first_name: 'Ewa', last_name: 'Wiśniewska', role: 'TRAINER' },
      { email: 'jan@fitness.local', password_hash: hash('Member123!'), first_name: 'Jan', last_name: 'Zieliński', role: 'MEMBER' },
      { email: 'ola@fitness.local', password_hash: hash('Member123!'), first_name: 'Ola', last_name: 'Wójcik', role: 'MEMBER' },
      { email: 'piotr@fitness.local', password_hash: hash('Member123!'), first_name: 'Piotr', last_name: 'Kamiński', role: 'MEMBER' },
      { email: 'bez.karnetu@fitness.local', password_hash: hash('Member123!'), first_name: 'Karol', last_name: 'Lewandowski', role: 'MEMBER' }
    ])
    .returning(['id', 'email']);

  const id = (email) => users.find((u) => u.email === email).id;

  await knex('memberships').insert([
    { user_id: id('jan@fitness.local'), type: 'MONTHLY', start_date: daysFromToday(-5), end_date: daysFromToday(24), status: 'ACTIVE' },
    { user_id: id('ola@fitness.local'), type: 'QUARTERLY', start_date: daysFromToday(-20), end_date: daysFromToday(69), status: 'ACTIVE' },
    { user_id: id('piotr@fitness.local'), type: 'ANNUAL', start_date: daysFromToday(-100), end_date: daysFromToday(264), status: 'ACTIVE' },
    { user_id: id('bez.karnetu@fitness.local'), type: 'MONTHLY', start_date: daysFromToday(-60), end_date: daysFromToday(-31), status: 'EXPIRED' }
  ]);

  const rooms = await knex('rooms')
    .insert([
      { name: 'Sala A (duża)', capacity: 25 },
      { name: 'Sala B (mała)', capacity: 10 },
      { name: 'Sala Spinning', capacity: 15 }
    ])
    .returning(['id', 'name']);

  const classTypes = await knex('class_types')
    .insert([
      { name: 'Yoga', description: 'Spokojne zajęcia rozciągające i oddechowe.' },
      { name: 'Pilates', description: 'Wzmacnianie mięśni głębokich.' },
      { name: 'Spinning', description: 'Intensywny trening na rowerach stacjonarnych.' },
      { name: 'CrossFit', description: 'Trening funkcjonalny o wysokiej intensywności.' }
    ])
    .returning(['id', 'name']);

  const room = (name) => rooms.find((r) => r.name.startsWith(name)).id;
  const type = (name) => classTypes.find((c) => c.name === name).id;
  const trainer1 = id('trener1@fitness.local');
  const trainer2 = id('trener2@fitness.local');

  const sessions = [];
  for (let day = 1; day <= 7; day += 1) {
    sessions.push(
      { class_type_id: type('Yoga'), trainer_id: trainer2, room_id: room('Sala A'), starts_at: at(day, 8), ends_at: at(day, 9), capacity: 20 },
      { class_type_id: type('Spinning'), trainer_id: trainer1, room_id: room('Sala Spinning'), starts_at: at(day, 17), ends_at: at(day, 18), capacity: 15 },
      { class_type_id: type('Pilates'), trainer_id: trainer2, room_id: room('Sala B'), starts_at: at(day, 18, 30), ends_at: at(day, 19, 30), capacity: 2 }
    );
    if (day % 2 === 0) {
      sessions.push({ class_type_id: type('CrossFit'), trainer_id: trainer1, room_id: room('Sala A'), starts_at: at(day, 19), ends_at: at(day, 20), capacity: 12 });
    }
  }
  const createdSessions = await knex('class_sessions').insert(sessions).returning(['id', 'class_type_id', 'capacity']);

  const firstPilates = createdSessions.find((s) => s.class_type_id === type('Pilates'));
  const firstYoga = createdSessions.find((s) => s.class_type_id === type('Yoga'));
  const base = Date.now() - 3600000;
  await knex('enrollments').insert([
    { session_id: firstPilates.id, user_id: id('ola@fitness.local'), status: 'ENROLLED', created_at: new Date(base) },
    { session_id: firstPilates.id, user_id: id('piotr@fitness.local'), status: 'ENROLLED', created_at: new Date(base + 1000) },
    { session_id: firstYoga.id, user_id: id('jan@fitness.local'), status: 'ENROLLED', created_at: new Date(base + 2000) }
  ]);
};
