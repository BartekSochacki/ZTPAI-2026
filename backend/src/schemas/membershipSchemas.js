const { z, pagination } = require('./common');

const create = z.object({
  userId: z.number().int().positive(),
  type: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']),
  startDate: z.iso.date()
});

const listQuery = z.object({
  ...pagination,
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional()
});

module.exports = { create, listQuery };
