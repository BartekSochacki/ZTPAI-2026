jest.mock('../../src/db/knex', () => ({ transaction: (callback) => callback({}) }));
jest.mock('../../src/repositories/sessionRepository');
jest.mock('../../src/repositories/enrollmentRepository');
jest.mock('../../src/repositories/membershipRepository');

const sessionRepository = require('../../src/repositories/sessionRepository');
const enrollmentRepository = require('../../src/repositories/enrollmentRepository');
const membershipRepository = require('../../src/repositories/membershipRepository');
const { eventBus, EVENTS } = require('../../src/events/eventBus');
const enrollmentService = require('../../src/services/enrollmentService');

const HOUR = 3600000;

function futureSession(overrides = {}) {
  return {
    id: 10,
    status: 'SCHEDULED',
    capacity: 2,
    starts_at: new Date(Date.now() + 48 * HOUR),
    ...overrides
  };
}

describe('enrollmentService.enroll', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    enrollmentRepository.create.mockImplementation(async (data) => ({ id: 99, ...data }));
    enrollmentRepository.findById.mockImplementation(async () => ({
      id: 99,
      session_id: 10,
      user_id: 1,
      status: enrollmentRepository.create.mock.calls[0][0].status,
      waitlist_position: 1
    }));
  });

  test('rejects enrollment without active membership', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession());
    membershipRepository.findActiveForDate.mockResolvedValue(undefined);

    await expect(enrollmentService.enroll(1, 10)).rejects.toMatchObject({
      status: 422,
      code: 'NO_ACTIVE_MEMBERSHIP'
    });
    expect(enrollmentRepository.create).not.toHaveBeenCalled();
  });

  test('enrolls user when there are free spots', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession());
    membershipRepository.findActiveForDate.mockResolvedValue({ id: 5 });
    enrollmentRepository.findActive.mockResolvedValue(undefined);
    enrollmentRepository.countByStatus.mockResolvedValue(1);

    const result = await enrollmentService.enroll(1, 10);

    expect(enrollmentRepository.create).toHaveBeenCalledWith(
      { session_id: 10, user_id: 1, status: 'ENROLLED' },
      expect.anything()
    );
    expect(result.status).toBe('ENROLLED');
  });

  test('puts user on waitlist when session is full', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession({ capacity: 2 }));
    membershipRepository.findActiveForDate.mockResolvedValue({ id: 5 });
    enrollmentRepository.findActive.mockResolvedValue(undefined);
    enrollmentRepository.countByStatus.mockResolvedValue(2);

    const result = await enrollmentService.enroll(1, 10);

    expect(result.status).toBe('WAITLISTED');
    expect(result.waitlistPosition).toBe(1);
  });

  test('rejects duplicate enrollment', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession());
    membershipRepository.findActiveForDate.mockResolvedValue({ id: 5 });
    enrollmentRepository.findActive.mockResolvedValue({ id: 1, status: 'ENROLLED' });

    await expect(enrollmentService.enroll(1, 10)).rejects.toMatchObject({ status: 409, code: 'ALREADY_ENROLLED' });
  });

  test('rejects enrollment for a session that already started', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession({ starts_at: new Date(Date.now() - HOUR) }));

    await expect(enrollmentService.enroll(1, 10)).rejects.toMatchObject({ code: 'SESSION_STARTED' });
  });

  test('rejects enrollment for a cancelled session', async () => {
    sessionRepository.lockById.mockResolvedValue(futureSession({ status: 'CANCELLED' }));

    await expect(enrollmentService.enroll(1, 10)).rejects.toMatchObject({ code: 'SESSION_CANCELLED' });
  });
});

describe('enrollmentService.cancel', () => {
  const member = { id: 1, role: 'MEMBER' };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(eventBus, 'emit').mockImplementation(() => true);
  });

  afterEach(() => {
    eventBus.emit.mockRestore();
  });

  test('rejects cancellation less than 2 hours before the session', async () => {
    enrollmentRepository.findById.mockResolvedValue({ id: 7, user_id: 1, session_id: 10, status: 'ENROLLED' });
    sessionRepository.lockById.mockResolvedValue(futureSession({ starts_at: new Date(Date.now() + HOUR) }));

    await expect(enrollmentService.cancel(member, 7)).rejects.toMatchObject({
      status: 422,
      code: 'CANCELLATION_DEADLINE_PASSED'
    });
    expect(enrollmentRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('cancels enrollment and emits event that frees a spot', async () => {
    enrollmentRepository.findById.mockResolvedValue({ id: 7, user_id: 1, session_id: 10, status: 'ENROLLED' });
    sessionRepository.lockById.mockResolvedValue(futureSession({ starts_at: new Date(Date.now() + 5 * HOUR) }));
    enrollmentRepository.updateStatus.mockResolvedValue({ id: 7, user_id: 1, session_id: 10, status: 'CANCELLED' });

    const result = await enrollmentService.cancel(member, 7);

    expect(result.status).toBe('CANCELLED');
    expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.ENROLLMENT_CANCELLED, { sessionId: 10 });
  });

  test('does not emit event when a waitlisted user cancels', async () => {
    enrollmentRepository.findById.mockResolvedValue({ id: 7, user_id: 1, session_id: 10, status: 'WAITLISTED' });
    sessionRepository.lockById.mockResolvedValue(futureSession());
    enrollmentRepository.updateStatus.mockResolvedValue({ id: 7, user_id: 1, session_id: 10, status: 'CANCELLED' });

    await enrollmentService.cancel(member, 7);

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  test('forbids cancelling enrollment of another member', async () => {
    enrollmentRepository.findById.mockResolvedValue({ id: 7, user_id: 2, session_id: 10, status: 'ENROLLED' });

    await expect(enrollmentService.cancel(member, 7)).rejects.toMatchObject({ status: 403 });
  });
});
