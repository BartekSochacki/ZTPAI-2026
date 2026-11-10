const config = require('./src/config');

module.exports = {
  client: 'pg',
  connection: config.databaseUrl,
  pool: { min: 0, max: 10 },
  migrations: { directory: './src/db/migrations' },
  seeds: { directory: './src/db/seeds' }
};
