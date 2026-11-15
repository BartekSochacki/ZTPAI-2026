const enrollmentService = require('../services/enrollmentService');

async function enroll(req, res) {
  res.status(201).json(await enrollmentService.enroll(req.user.id, req.valid.body.sessionId));
}

async function cancel(req, res) {
  res.json(await enrollmentService.cancel(req.user, req.valid.params.id));
}

async function listMine(req, res) {
  res.json(await enrollmentService.listMine(req.user.id));
}

module.exports = { enroll, cancel, listMine };
