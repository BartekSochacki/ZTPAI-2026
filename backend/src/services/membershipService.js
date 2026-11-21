const db = require('../db/knex');
const config = require('../config');
const AppError = require('../errors/AppError');
const userRepository = require('../repositories/userRepository');
const membershipRepository = require('../repositories/membershipRepository');
const paymentRepository = require('../repositories/paymentRepository');
const paymentGateway = require('./paymentGateway');
const { toMembershipDto, toPaymentDto } = require('../utils/dto');
const { paginated } = require('../utils/pagination');
const { addDays, toDateString } = require('../utils/dates');

async function create({ userId, type, startDate }) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  if (user.role !== 'MEMBER') {
    throw AppError.businessRule('Memberships can only be assigned to users with role MEMBER', 'NOT_A_MEMBER');
  }
  const endDate = addDays(startDate, config.rules.membershipDays[type] - 1);
  if (endDate < toDateString(new Date())) {
    throw AppError.businessRule('Membership would already be expired', 'MEMBERSHIP_IN_PAST');
  }
  const overlapping = await membershipRepository.findOverlapping(userId, startDate, endDate);
  if (overlapping) {
    throw AppError.conflict('User already has an active membership in this period', 'MEMBERSHIP_OVERLAP');
  }
  const membership = await membershipRepository.create({
    user_id: userId,
    type,
    start_date: startDate,
    end_date: endDate,
    status: 'ACTIVE'
  });
  return toMembershipDto(membership);
}

async function list(query) {
  const { rows, total } = await membershipRepository.list(query);
  return paginated(rows.map(toMembershipDto), total, query.page, query.limit);
}

async function listMine(userId) {
  const today = toDateString(new Date());
  const [memberships, active] = await Promise.all([
    membershipRepository.listByUser(userId),
    membershipRepository.findActiveForDate(userId, today)
  ]);
  return {
    active: active ? toMembershipDto(active) : null,
    history: memberships.map(toMembershipDto)
  };
}

async function cancel(id) {
  const membership = await membershipRepository.findById(id);
  if (!membership) {
    throw AppError.notFound('Membership not found');
  }
  if (membership.status !== 'ACTIVE') {
    throw AppError.businessRule('Only active memberships can be cancelled', 'MEMBERSHIP_NOT_ACTIVE');
  }
  const updated = await membershipRepository.updateStatus(id, 'CANCELLED');
  return toMembershipDto(updated);
}

async function expireOutdated(today = toDateString(new Date())) {
  const expired = await membershipRepository.expireOutdated(today);
  return expired.length;
}

function listPlans() {
  return Object.keys(config.rules.membershipDays).map((type) => ({
    type,
    days: config.rules.membershipDays[type],
    price: config.rules.membershipPrices[type],
    currency: 'PLN'
  }));
}

const DECLINE_MESSAGES = {
  CARD_DECLINED: 'The card was declined',
  INSUFFICIENT_FUNDS: 'Insufficient funds on the card',
  CARD_EXPIRED: 'The card has expired'
};

async function purchase(userId, { type, card }) {
  const buyer = await userRepository.findById(userId);
  if (!buyer || buyer.role !== 'MEMBER') {
    throw AppError.businessRule('Memberships can only be purchased by users with role MEMBER', 'NOT_A_MEMBER');
  }
  const amount = config.rules.membershipPrices[type];
  const charge = await paymentGateway.charge({ amount, currency: 'PLN', card });

  if (charge.status !== 'SUCCEEDED') {
    await paymentRepository.create({
      user_id: userId,
      membership_type: type,
      amount,
      currency: 'PLN',
      status: 'DECLINED',
      card_last4: charge.cardLast4,
      failure_code: charge.failureCode
    });
    throw AppError.paymentDeclined(DECLINE_MESSAGES[charge.failureCode], charge.failureCode);
  }

  const result = await db.transaction(async (trx) => {
    const user = await userRepository.lockById(userId, trx);
    if (!user || user.role !== 'MEMBER') {
      throw AppError.businessRule('Memberships can only be purchased by users with role MEMBER', 'NOT_A_MEMBER');
    }
    const today = toDateString(new Date());
    const latestEnd = await membershipRepository.findLatestActiveEnd(userId, today, trx);
    const startDate = latestEnd ? addDays(latestEnd, 1) : today;
    const membership = await membershipRepository.create(
      {
        user_id: userId,
        type,
        start_date: startDate,
        end_date: addDays(startDate, config.rules.membershipDays[type] - 1),
        status: 'ACTIVE'
      },
      trx
    );
    const payment = await paymentRepository.create(
      {
        user_id: userId,
        membership_id: membership.id,
        membership_type: type,
        amount,
        currency: 'PLN',
        status: 'SUCCEEDED',
        card_last4: charge.cardLast4,
        provider_ref: charge.providerRef
      },
      trx
    );
    return { membership, payment };
  });

  return { membership: toMembershipDto(result.membership), payment: toPaymentDto(result.payment) };
}

async function listMyPayments(userId) {
  const payments = await paymentRepository.listByUser(userId);
  return payments.map(toPaymentDto);
}

module.exports = { create, list, listMine, cancel, expireOutdated, listPlans, purchase, listMyPayments };
