const { z, pagination } = require('./common');

const listQuery = z.object({
  ...pagination,
  role: z.enum(['MEMBER', 'TRAINER', 'ADMIN']).optional(),
  search: z.string().trim().min(1).max(100).optional()
});

const changeRole = z.object({
  role: z.enum(['MEMBER', 'TRAINER', 'ADMIN'])
});

module.exports = { listQuery, changeRole };
