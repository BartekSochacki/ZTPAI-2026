const config = require('../config');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const { sendMail, formatDateTime } = require('../mail/mailer');

async function sendPromotionEmail({ userId, sessionId }) {
  const [user, session] = await Promise.all([
    userRepository.findById(userId),
    sessionRepository.findDetailedById(sessionId)
  ]);
  if (!user || !session) {
    return;
  }
  await sendMail({
    to: user.email,
    subject: `Masz miejsce na zajęciach: ${session.class_type_name}`,
    text:
      `Cześć ${user.first_name}!\n\n` +
      `Zwolniło się miejsce i zostałeś przeniesiony z listy rezerwowej na listę uczestników.\n\n` +
      `Zajęcia: ${session.class_type_name}\n` +
      `Termin: ${formatDateTime(session.starts_at)}\n` +
      `Sala: ${session.room_name}\n\n` +
      `Jeśli nie możesz przyjść, zrezygnuj najpóźniej ${config.rules.cancelDeadlineHours} godziny przed zajęciami.`
  });
}

async function sendSessionCancelledEmails({ sessionId, userIds }) {
  const session = await sessionRepository.findDetailedById(sessionId);
  if (!session) {
    return;
  }
  for (const userId of userIds) {
    const user = await userRepository.findById(userId);
    if (user) {
      await sendMail({
        to: user.email,
        subject: `Zajęcia odwołane: ${session.class_type_name}`,
        text:
          `Cześć ${user.first_name}!\n\n` +
          `Zajęcia ${session.class_type_name} zaplanowane na ${formatDateTime(session.starts_at)} zostały odwołane.\n` +
          `Twój zapis został anulowany.`
      });
    }
  }
}

async function sendDueReminders(now = new Date()) {
  const until = new Date(now.getTime() + config.rules.reminderHoursBefore * 3600000);
  const due = await enrollmentRepository.findDueReminders(now, until);
  for (const item of due) {
    await sendMail({
      to: item.email,
      subject: `Przypomnienie: ${item.class_type_name}`,
      text:
        `Cześć ${item.first_name}!\n\n` +
        `Przypominamy o zajęciach ${item.class_type_name}.\n` +
        `Termin: ${formatDateTime(item.starts_at)}\n` +
        `Sala: ${item.room_name}`
    });
    await enrollmentRepository.markReminderSent(item.id);
  }
  return due.length;
}

module.exports = { sendPromotionEmail, sendSessionCancelledEmails, sendDueReminders };
