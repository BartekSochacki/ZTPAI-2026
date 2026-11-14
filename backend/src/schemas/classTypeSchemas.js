const { z } = require('./common');

const classType = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional().nullable()
});

module.exports = { classType };
