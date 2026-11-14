const { z } = require('./common');

const room = z.object({
  name: z.string().trim().min(1).max(100),
  capacity: z.number().int().min(1).max(500)
});

module.exports = { room };
