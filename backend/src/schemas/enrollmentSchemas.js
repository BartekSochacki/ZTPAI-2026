const { z } = require('./common');

const create = z.object({
  sessionId: z.number().int().positive()
});

module.exports = { create };
