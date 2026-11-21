const { randomUUID } = require('node:crypto');

const DECLINED_CARDS = {
  '4000000000000002': 'CARD_DECLINED',
  '4000000000009995': 'INSUFFICIENT_FUNDS'
};

function normalizeCardNumber(number) {
  return number.replace(/[\s-]/g, '');
}

function isExpired(expiry, now = new Date()) {
  const [month, year] = expiry.split('/').map(Number);
  const lastDayOfMonth = new Date(Date.UTC(2000 + year, month, 0, 23, 59, 59));
  return lastDayOfMonth < now;
}

async function charge({ amount, currency, card }) {
  const number = normalizeCardNumber(card.number);
  const base = { amount, currency, cardLast4: number.slice(-4) };
  if (isExpired(card.expiry)) {
    return { ...base, status: 'DECLINED', failureCode: 'CARD_EXPIRED' };
  }
  if (DECLINED_CARDS[number]) {
    return { ...base, status: 'DECLINED', failureCode: DECLINED_CARDS[number] };
  }
  return { ...base, status: 'SUCCEEDED', providerRef: `mock_${randomUUID()}` };
}

module.exports = { charge, normalizeCardNumber, isExpired };
