const { z } = require('./common');

const register = z.object({
  email: z.email().max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(8, 'Password must have at least 8 characters').max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100)
});

const login = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1)
});

module.exports = { register, login };
