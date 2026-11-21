exports.up = async (knex) => {
  await knex.schema.createTable('payments', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('membership_id').references('id').inTable('memberships').onDelete('SET NULL');
    t.enu('membership_type', ['MONTHLY', 'QUARTERLY', 'ANNUAL'], { useNative: true, existingType: true, enumName: 'membership_type' }).notNullable();
    t.integer('amount').notNullable();
    t.string('currency', 3).notNullable().defaultTo('PLN');
    t.enu('status', ['SUCCEEDED', 'DECLINED'], { useNative: true, enumName: 'payment_status' }).notNullable();
    t.string('card_last4', 4).notNullable();
    t.string('provider_ref', 64);
    t.string('failure_code', 32);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('payments');
  await knex.raw('DROP TYPE IF EXISTS payment_status');
};
