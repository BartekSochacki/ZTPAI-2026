const config = require('./config');
const db = require('./db/knex');
const { createApp } = require('./app');
const { registerListeners } = require('./events/listeners');
const { startScheduler } = require('./jobs/scheduler');

registerListeners();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Fitness Club API listening on port ${config.port}`);
});

const scheduledTasks = config.schedulerEnabled ? startScheduler() : [];

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  scheduledTasks.forEach((task) => task.stop());
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
