const { z, pagination } = require('./common');

const membershipType = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']);

const create = z.object({
  userId: z.number().int().positive(),
  type: membershipType,
  startDate: z.iso.date()
});

const listQuery = z.object({
  ...pagination,
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional()
});

function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

const card = z.object({
  holder: z.string().trim().min(2).max(100),
  number: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .refine((value) => /^\d{13,19}$/.test(value), 'Card number must have 13-19 digits')
    .refine(passesLuhn, 'Card number is invalid'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be in MM/YY format'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC must have 3 or 4 digits')
});

const purchase = z.object({
  type: membershipType,
  card
});

module.exports = { create, listQuery, purchase };
