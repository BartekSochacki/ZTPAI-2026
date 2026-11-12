const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
};

module.exports = { z, idParam, pagination };
