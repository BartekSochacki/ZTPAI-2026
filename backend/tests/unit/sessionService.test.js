jest.mock('../../src/db/knex', () => ({ transaction: (callback) => callback({}) }));
jest.mock('../../src/repositories/sessionRepository');
jest.mock('../../src/repositories/enrollmentRepository');
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/repositories/roomRepository');
jest.mock('../../src/repositories/classTypeRepository');

const sessionRepository = require('../../src/repositories/sessionRepository');
const enrollmentRepository = require('../../src/repositories/enrollmentRepository');
const userRepository = require('../../src/repositories/userRepository');
const roomRepository = require('../../src/repositories/roomRepository');
const classTypeRepository = require('../../src/repositories/classTypeRepository');
const sessionService = require('../../src/services/sessionService');

const HOUR = 3600000;

function sessionInput(overrides = {}) {
  const start = new Date(Date.now() + 24 * HOUR);
  return {
    classTypeId: 1,
    trainerId: 2,
    roomId: 3,
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + HOUR).toISOString(),
    capacity: 10,
    ...overrides
  };
}

describe('sessionService validation rules', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    classTypeRepository.findById.mockResolvedValue({ id: 1, name: 'Yoga' });
    userRepository.findById.mockResolvedValue({ id: 2, role: 'TRAINER' });
    roomRepository.findById.mockResolvedValue({ id: 3, capacity: 20 });
    sessionRepository.findConflicts.mockResolvedValue([]);
    sessionRepository.create.mockResolvedValue({ id: 50 });
    sessionRepository.findDetailedById.mockResolvedValue({ id: 50, capacity: 10, enrolled_count: 0 });
  });

  test('creates session when room and trainer are free', async () => {
    const result = await sessionService.create(sessionInput());

    expect(sessionRepository.create).toHaveBeenCalled();
    expect(result.id).toBe(50);
  });

  test('rejects session when room is already booked', async () => {
    sessionRepository.findConflicts.mockResolvedValue([{ id: 9, room_id: 3, trainer_id: 99 }]);

    await expect(sessionService.create(sessionInput())).rejects.toMatchObject({ status: 409, code: 'ROOM_CONFLICT' });
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  test('rejects session when trainer is busy', async () => {
    sessionRepository.findConflicts.mockResolvedValue([{ id: 9, room_id: 77, trainer_id: 2 }]);

    await expect(sessionService.create(sessionInput())).rejects.toMatchObject({
      status: 409,
      code: 'TRAINER_CONFLICT'
    });
  });

  test('rejects capacity larger than room capacity', async () => {
    await expect(sessionService.create(sessionInput({ capacity: 30 }))).rejects.toMatchObject({
      status: 422,
      code: 'CAPACITY_EXCEEDS_ROOM'
    });
  });

  test('rejects user that is not a trainer', async () => {
    userRepository.findById.mockResolvedValue({ id: 2, role: 'MEMBER' });

    await expect(sessionService.create(sessionInput())).rejects.toMatchObject({ code: 'NOT_A_TRAINER' });
  });

  test('rejects session in the past', async () => {
    const start = new Date(Date.now() - 2 * HOUR);
    const input = sessionInput({ startsAt: start.toISOString(), endsAt: new Date(start.getTime() + HOUR).toISOString() });

    await expect(sessionService.create(input)).rejects.toMatchObject({ code: 'SESSION_IN_PAST' });
  });

  test('rejects update with outdated version (optimistic locking)', async () => {
    sessionRepository.findById.mockResolvedValue({
      id: 50,
      version: 3,
      status: 'SCHEDULED',
      capacity: 10,
      starts_at: new Date(Date.now() + 24 * HOUR)
    });

    await expect(sessionService.update(50, { ...sessionInput(), version: 2 })).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT'
    });
    expect(sessionRepository.updateWithVersion).not.toHaveBeenCalled();
  });

  test('rejects reducing capacity below number of enrolled members', async () => {
    sessionRepository.findById.mockResolvedValue({
      id: 50,
      version: 1,
      status: 'SCHEDULED',
      capacity: 10,
      starts_at: new Date(Date.now() + 24 * HOUR)
    });
    enrollmentRepository.countByStatus.mockResolvedValue(6);

    await expect(sessionService.update(50, { ...sessionInput({ capacity: 5 }), version: 1 })).rejects.toMatchObject({
      code: 'CAPACITY_BELOW_ENROLLED'
    });
  });

  test('forbids trainer from viewing participants of another trainer session', async () => {
    sessionRepository.findById.mockResolvedValue({ id: 50, trainer_id: 2 });

    await expect(sessionService.listParticipants(50, { id: 8, role: 'TRAINER' })).rejects.toMatchObject({
      status: 403
    });
  });
});
