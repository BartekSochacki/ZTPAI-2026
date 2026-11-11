exports.up = async (knex) => {
  await knex.schema.createTable('enrollments', (t) => {
    t.increments('id').primary();
    t.integer('session_id').notNullable().references('id').inTable('class_sessions').onDelete('CASCADE');
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', ['ENROLLED', 'WAITLISTED', 'CANCELLED'], { useNative: true, enumName: 'enrollment_status' }).notNullable();
    t.boolean('reminder_sent').notNullable().defaultTo(false);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['session_id', 'status']);
  });
  await knex.raw(
    "CREATE UNIQUE INDEX enrollments_active_unique ON enrollments (session_id, user_id) WHERE status <> 'CANCELLED'"
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('enrollments');
  await knex.raw('DROP TYPE IF EXISTS enrollment_status');
};
