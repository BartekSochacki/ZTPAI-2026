const { z, pagination } = require('./common');

const sessionFields = {
  classTypeId: z.number().int().positive(),
  trainerId: z.number().int().positive(),
  roomId: z.number().int().positive(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  capacity: z.number().int().min(1).max(500)
};

const endsAfterStart = (data) => new Date(data.endsAt) > new Date(data.startsAt);
const endsAfterStartError = { message: 'endsAt must be later than startsAt', path: ['endsAt'] };

const create = z.object(sessionFields).refine(endsAfterStart, endsAfterStartError);

const update = z
  .object({ ...sessionFields, version: z.number().int().positive() })
  .refine(endsAfterStart, endsAfterStartError);

const listQuery = z.object({
  ...pagination,
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  classTypeId: z.coerce.number().int().positive().optional(),
  trainerId: z.coerce.number().int().positive().optional(),
  roomId: z.coerce.number().int().positive().optional(),
  includePast: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  includeCancelled: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true')
});

module.exports = { create, update, listQuery };
