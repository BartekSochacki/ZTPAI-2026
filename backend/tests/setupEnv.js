process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://fitness:fitness@localhost:5432/fitness_test';
process.env.SCHEDULER_ENABLED = 'false';
