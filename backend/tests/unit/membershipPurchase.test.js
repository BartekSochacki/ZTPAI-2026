jest.mock('../../src/db/knex', () => ({ transaction: (callback) => callback({}) }));
jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/repositories/membershipRepository');
jest.mock('../../src/repositories/paymentRepository');

const userRepository = require('../../src/repositories/userRepository');
const membershipRepository = require('../../src/repositories/membershipRepository');
const paymentRepository = require('../../src/repositories/paymentRepository');
const membershipService = require('../../src/services/membershipService');
const paymentGateway = require('../../src/services/paymentGateway');

const today = new Date().toISOString().slice(0, 10);
const validCard = { holder: 'Jan Test', number: '4242424242424242', expiry: '12/39', cvc: '123' };

describe('membershipService.purchase', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    userRepository.findById.mockResolvedValue({ id: 4, role: 'MEMBER' });
    userRepository.lockById.mockResolvedValue({ id: 4, role: 'MEMBER' });
    membershipRepository.create.mockImplementation(async (data) => ({ id: 11, ...data }));
    paymentRepository.create.mockImplementation(async (data) => ({ id: 21, created_at: new Date(), ...data }));
  });

  test('successful payment creates membership starting today and stores only last 4 digits', async () => {
    membershipRepository.findLatestActiveEnd.mockResolvedValue(null);

    const result = await membershipService.purchase(4, { type: 'MONTHLY', card: validCard });

    expect(result.membership.startDate).toBe(today);
    expect(result.membership.status).toBe('ACTIVE');
    expect(result.payment).toMatchObject({ status: 'SUCCEEDED', amount: 12900, cardLast4: '4242', membershipId: 11 });
    expect(JSON.stringify(paymentRepository.create.mock.calls)).not.toContain('4242424242424242');
  });

  test('purchase with active membership starts the day after it ends', async () => {
    membershipRepository.findLatestActiveEnd.mockResolvedValue('2030-01-31');

    const result = await membershipService.purchase(4, { type: 'QUARTERLY', card: validCard });

    expect(result.membership.startDate).toBe('2030-02-01');
    expect(result.membership.endDate).toBe('2030-05-01');
  });

  test('declined card returns 402, records declined payment and creates no membership', async () => {
    await expect(
      membershipService.purchase(4, { type: 'ANNUAL', card: { ...validCard, number: '4000000000000002' } })
    ).rejects.toMatchObject({ status: 402, code: 'CARD_DECLINED' });

    expect(membershipRepository.create).not.toHaveBeenCalled();
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DECLINED', failure_code: 'CARD_DECLINED', card_last4: '0002' })
    );
  });

  test('trainer cannot buy a membership', async () => {
    userRepository.findById.mockResolvedValue({ id: 2, role: 'TRAINER' });

    await expect(membershipService.purchase(2, { type: 'MONTHLY', card: validCard })).rejects.toMatchObject({
      status: 422,
      code: 'NOT_A_MEMBER'
    });
    expect(paymentRepository.create).not.toHaveBeenCalled();
  });
});

describe('paymentGateway (mock)', () => {
  test('rejects expired card', async () => {
    const result = await paymentGateway.charge({ amount: 100, currency: 'PLN', card: { ...validCard, expiry: '01/20' } });
    expect(result).toMatchObject({ status: 'DECLINED', failureCode: 'CARD_EXPIRED' });
  });

  test('simulates insufficient funds', async () => {
    const result = await paymentGateway.charge({ amount: 100, currency: 'PLN', card: { ...validCard, number: '4000 0000 0000 9995' } });
    expect(result).toMatchObject({ status: 'DECLINED', failureCode: 'INSUFFICIENT_FUNDS', cardLast4: '9995' });
  });
});
