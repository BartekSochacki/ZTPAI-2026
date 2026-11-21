const membershipService = require('../services/membershipService');

async function create(req, res) {
  res.status(201).json(await membershipService.create(req.valid.body));
}

async function list(req, res) {
  res.json(await membershipService.list(req.valid.query));
}

async function listMine(req, res) {
  res.json(await membershipService.listMine(req.user.id));
}

async function cancel(req, res) {
  res.json(await membershipService.cancel(req.valid.params.id));
}

function listPlans(req, res) {
  res.json(membershipService.listPlans());
}

async function purchase(req, res) {
  res.status(201).json(await membershipService.purchase(req.user.id, req.valid.body));
}

async function listMyPayments(req, res) {
  res.json(await membershipService.listMyPayments(req.user.id));
}

module.exports = { create, list, listMine, cancel, listPlans, purchase, listMyPayments };
