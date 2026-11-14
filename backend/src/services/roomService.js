const AppError = require('../errors/AppError');
const roomRepository = require('../repositories/roomRepository');
const { toRoomDto } = require('../utils/dto');

async function list() {
  const rows = await roomRepository.findAll();
  return rows.map(toRoomDto);
}

async function getById(id) {
  const room = await roomRepository.findById(id);
  if (!room) {
    throw AppError.notFound('Room not found');
  }
  return toRoomDto(room);
}

async function create(data) {
  return toRoomDto(await roomRepository.create(data));
}

async function update(id, data) {
  const room = await roomRepository.update(id, data);
  if (!room) {
    throw AppError.notFound('Room not found');
  }
  return toRoomDto(room);
}

async function remove(id) {
  const deleted = await roomRepository.remove(id);
  if (!deleted) {
    throw AppError.notFound('Room not found');
  }
}

module.exports = { list, getById, create, update, remove };
