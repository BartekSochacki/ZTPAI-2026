const AppError = require('../errors/AppError');
const userRepository = require('../repositories/userRepository');
const { toUserDto, toTrainerDto } = require('../utils/dto');
const { paginated } = require('../utils/pagination');

async function list(query) {
  const { rows, total } = await userRepository.list(query);
  return paginated(rows.map(toUserDto), total, query.page, query.limit);
}

async function getById(id) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return toUserDto(user);
}

async function changeRole(currentUserId, id, role) {
  if (currentUserId === id) {
    throw AppError.businessRule('You cannot change your own role', 'SELF_ROLE_CHANGE');
  }
  const user = await userRepository.updateRole(id, role);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return toUserDto(user);
}

async function remove(currentUserId, id) {
  if (currentUserId === id) {
    throw AppError.businessRule('You cannot delete your own account', 'SELF_DELETE');
  }
  const deleted = await userRepository.remove(id);
  if (!deleted) {
    throw AppError.notFound('User not found');
  }
}

async function listTrainers() {
  const rows = await userRepository.listTrainers();
  return rows.map(toTrainerDto);
}

module.exports = { list, getById, changeRole, remove, listTrainers };
