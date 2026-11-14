function crudController(service) {
  return {
    async list(req, res) {
      res.json(await service.list());
    },
    async getById(req, res) {
      res.json(await service.getById(req.valid.params.id));
    },
    async create(req, res) {
      res.status(201).json(await service.create(req.valid.body));
    },
    async update(req, res) {
      res.json(await service.update(req.valid.params.id, req.valid.body));
    },
    async remove(req, res) {
      await service.remove(req.valid.params.id);
      res.status(204).end();
    }
  };
}

module.exports = crudController;
