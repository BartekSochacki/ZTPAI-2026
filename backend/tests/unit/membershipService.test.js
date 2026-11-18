jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/repositories/membershipRepository');

const userRepository = require('../../src/repositories/userRepository');
const membershipRepository = require('../../src/repositories/membershipRepository');
const membershipService = require('../../src/services/membershipService');

const today = new Date().toISOString().slice(0, 10);

describe('membershipService.create', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    membershipRepository.create.mockImplementation(async (data) => ({ id: 1, ...data }));
  });

  test('calculates end date from membership type', async () => {
    userRepository.findById.mockResolvedValue({ id: 4, role: 'MEMBER' });
    membershipRepository.findOverlapping.mockResolvedValue(undefined);

    const result = await membershipService.create({ userId: 4, type: 'MONTHLY', startDate: '2030-01-01' });

    expect(result.endDate).toBe('2030-01-30');
    expect(result.status).toBe('ACTIVE');
  });

  test('rejects overlapping active membership', async () => {
    userRepository.findById.mockResolvedValue({ id: 4, role: 'MEMBER' });
    membershipRepository.findOverlapping.mockResolvedValue({ id: 2 });

    await expect(
      membershipService.create({ userId: 4, type: 'ANNUAL', startDate: today })
    ).rejects.toMatchObject({ status: 409, code: 'MEMBERSHIP_OVERLAP' });
  });

  test('rejects membership for trainer or admin', async () => {
    userRepository.findById.mockResolvedValue({ id: 2, role: 'TRAINER' });

    await expect(
      membershipService.create({ userId: 2, type: 'MONTHLY', startDate: today })
    ).rejects.toMatchObject({ code: 'NOT_A_MEMBER' });
  });

  test('rejects cancelling membership that is not active', async () => {
    membershipRepository.findById.mockResolvedValue({ id: 3, status: 'EXPIRED' });

    await expect(membershipService.cancel(3)).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_ACTIVE' });
  });
});
