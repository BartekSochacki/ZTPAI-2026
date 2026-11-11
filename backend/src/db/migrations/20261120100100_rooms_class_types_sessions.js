exports.up = async (knex) => {
  await knex.schema.createTable('rooms', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.integer('capacity').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw('ALTER TABLE rooms ADD CONSTRAINT rooms_capacity_check CHECK (capacity > 0)');

  await knex.schema.createTable('class_types', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable().unique();
    t.text('description');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('class_sessions', (t) => {
    t.increments('id').primary();
    t.integer('class_type_id').notNullable().references('id').inTable('class_types').onDelete('RESTRICT');
    t.integer('trainer_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.integer('room_id').notNullable().references('id').inTable('rooms').onDelete('RESTRICT');
    t.timestamp('starts_at', { useTz: true }).notNullable();
    t.timestamp('ends_at', { useTz: true }).notNullable();
    t.integer('capacity').notNullable();
    t.enu('status', ['SCHEDULED', 'CANCELLED'], { useNative: true, enumName: 'session_status' })
      .notNullable()
      .defaultTo('SCHEDULED');
    t.integer('version').notNullable().defaultTo(1);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['starts_at']);
    t.index(['trainer_id', 'starts_at']);
    t.index(['room_id', 'starts_at']);
  });
  await knex.raw('ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_time_check CHECK (ends_at > starts_at)');
  await knex.raw('ALTER TABLE class_sessions ADD CONSTRAINT class_sessions_capacity_check CHECK (capacity > 0)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('class_sessions');
  await knex.schema.dropTableIfExists('class_types');
  await knex.schema.dropTableIfExists('rooms');
  await knex.raw('DROP TYPE IF EXISTS session_status');
};
