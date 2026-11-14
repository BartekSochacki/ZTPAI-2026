const AppError = require('../errors/AppError');
const classTypeRepository = require('../repositories/classTypeRepository');
const { toClassTypeDto } = require('../utils/dto');

async function list() {
  const rows = await classTypeRepository.findAll();
  return rows.map(toClassTypeDto);
}

async function getById(id) {
  const classType = await classTypeRepository.findById(id);
  if (!classType) {
    throw AppError.notFound('Class type not found');
  }
  return toClassTypeDto(classType);
}

async function create(data) {
  return toClassTypeDto(await classTypeRepository.create({ name: data.name, description: data.description ?? null }));
}

async function update(id, data) {
  const classType = await classTypeRepository.update(id, { name: data.name, description: data.description ?? null });
  if (!classType) {
    throw AppError.notFound('Class type not found');
  }
  return toClassTypeDto(classType);
}

async function remove(id) {
  const deleted = await classTypeRepository.remove(id);
  if (!deleted) {
    throw AppError.notFound('Class type not found');
  }
}

module.exports = { list, getById, create, update, remove };
