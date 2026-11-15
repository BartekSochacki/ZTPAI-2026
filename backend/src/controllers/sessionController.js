const sessionService = require('../services/sessionService');

async function list(req, res) {
  res.json(await sessionService.list(req.valid.query));
}

async function getById(req, res) {
  res.json(await sessionService.getById(req.valid.params.id));
}

async function create(req, res) {
  res.status(201).json(await sessionService.create(req.valid.body));
}

async function update(req, res) {
  res.json(await sessionService.update(req.valid.params.id, req.valid.body));
}

async function cancel(req, res) {
  res.json(await sessionService.cancel(req.valid.params.id));
}

async function remove(req, res) {
  await sessionService.remove(req.valid.params.id);
  res.status(204).end();
}

async function listMine(req, res) {
  res.json(await sessionService.listForTrainer(req.user.id, req.query.includePast === 'true'));
}

async function listParticipants(req, res) {
  res.json(await sessionService.listParticipants(req.valid.params.id, req.user));
}

module.exports = { list, getById, create, update, cancel, remove, listMine, listParticipants };
