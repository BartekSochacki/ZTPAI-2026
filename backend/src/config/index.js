try {
  process.loadEnvFile();
} catch {}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    from: process.env.MAIL_FROM || 'Fitness Club <no-reply@fitness.local>'
  },
  schedulerEnabled: process.env.SCHEDULER_ENABLED !== 'false',
  rules: {
    cancelDeadlineHours: 2,
    reminderHoursBefore: 24,
    membershipDays: { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 }
  }
};
