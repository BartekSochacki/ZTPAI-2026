const userService = require('../services/userService');

async function list(req, res) {
  res.json(await userService.list(req.valid.query));
}

async function getById(req, res) {
  res.json(await userService.getById(req.valid.params.id));
}

async function changeRole(req, res) {
  res.json(await userService.changeRole(req.user.id, req.valid.params.id, req.valid.body.role));
}

async function remove(req, res) {
  await userService.remove(req.user.id, req.valid.params.id);
  res.status(204).end();
}

async function listTrainers(req, res) {
  res.json(await userService.listTrainers());
}

module.exports = { list, getById, changeRole, remove, listTrainers };
