exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.enu('role', ['MEMBER', 'TRAINER', 'ADMIN'], { useNative: true, enumName: 'user_role' })
      .notNullable()
      .defaultTo('MEMBER');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('memberships', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('type', ['MONTHLY', 'QUARTERLY', 'ANNUAL'], { useNative: true, enumName: 'membership_type' }).notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.enu('status', ['ACTIVE', 'EXPIRED', 'CANCELLED'], { useNative: true, enumName: 'membership_status' })
      .notNullable()
      .defaultTo('ACTIVE');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'status']);
  });
  await knex.raw('ALTER TABLE memberships ADD CONSTRAINT memberships_dates_check CHECK (end_date >= start_date)');
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('memberships');
  await knex.schema.dropTableIfExists('users');
  await knex.raw('DROP TYPE IF EXISTS membership_status');
  await knex.raw('DROP TYPE IF EXISTS membership_type');
  await knex.raw('DROP TYPE IF EXISTS user_role');
};
