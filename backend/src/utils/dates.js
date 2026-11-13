function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toDateString(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function hoursBetween(from, to) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 3600000;
}

module.exports = { addDays, toDateString, hoursBetween };
