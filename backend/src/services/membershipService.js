const config = require('../config');
const AppError = require('../errors/AppError');
const userRepository = require('../repositories/userRepository');
const membershipRepository = require('../repositories/membershipRepository');
const { toMembershipDto } = require('../utils/dto');
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

module.exports = { create, list, listMine, cancel, expireOutdated };
