const { Router } = require('express');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { idParam } = require('../schemas/common');
const authSchemas = require('../schemas/authSchemas');
const userSchemas = require('../schemas/userSchemas');
const membershipSchemas = require('../schemas/membershipSchemas');
const roomSchemas = require('../schemas/roomSchemas');
const classTypeSchemas = require('../schemas/classTypeSchemas');
const sessionSchemas = require('../schemas/sessionSchemas');
const enrollmentSchemas = require('../schemas/enrollmentSchemas');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const membershipController = require('../controllers/membershipController');
const sessionController = require('../controllers/sessionController');
const enrollmentController = require('../controllers/enrollmentController');
const crudController = require('../controllers/crudController');
const roomController = crudController(require('../services/roomService'));
const classTypeController = crudController(require('../services/classTypeService'));

const router = Router();
const admin = authorize('ADMIN');
const byId = validate({ params: idParam });

router.post('/auth/register', validate({ body: authSchemas.register }), authController.register);
router.post('/auth/login', validate({ body: authSchemas.login }), authController.login);
router.get('/auth/me', authenticate, authController.me);

router.get('/trainers', authenticate, userController.listTrainers);

router.get('/users', authenticate, admin, validate({ query: userSchemas.listQuery }), userController.list);
router.get('/users/:id', authenticate, admin, byId, userController.getById);
router.patch(
  '/users/:id/role',
  authenticate,
  admin,
  validate({ params: idParam, body: userSchemas.changeRole }),
  userController.changeRole
);
router.delete('/users/:id', authenticate, admin, byId, userController.remove);

router.get('/memberships/me', authenticate, authorize('MEMBER'), membershipController.listMine);
router.get('/memberships/plans', authenticate, membershipController.listPlans);
router.post(
  '/memberships/purchase',
  authenticate,
  authorize('MEMBER'),
  validate({ body: membershipSchemas.purchase }),
  membershipController.purchase
);
router.get('/payments/me', authenticate, authorize('MEMBER'), membershipController.listMyPayments);
router.get(
  '/memberships',
  authenticate,
  admin,
  validate({ query: membershipSchemas.listQuery }),
  membershipController.list
);
router.post('/memberships', authenticate, admin, validate({ body: membershipSchemas.create }), membershipController.create);
router.patch('/memberships/:id/cancel', authenticate, admin, byId, membershipController.cancel);

function registerCrud(path, controller, schema) {
  router.get(path, authenticate, controller.list);
  router.get(`${path}/:id`, authenticate, byId, controller.getById);
  router.post(path, authenticate, admin, validate({ body: schema }), controller.create);
  router.put(`${path}/:id`, authenticate, admin, validate({ params: idParam, body: schema }), controller.update);
  router.delete(`${path}/:id`, authenticate, admin, byId, controller.remove);
}

registerCrud('/rooms', roomController, roomSchemas.room);
registerCrud('/class-types', classTypeController, classTypeSchemas.classType);

router.get('/sessions', authenticate, validate({ query: sessionSchemas.listQuery }), sessionController.list);
router.get('/sessions/mine', authenticate, authorize('TRAINER'), sessionController.listMine);
router.get('/sessions/:id', authenticate, byId, sessionController.getById);
router.get(
  '/sessions/:id/participants',
  authenticate,
  authorize('ADMIN', 'TRAINER'),
  byId,
  sessionController.listParticipants
);
router.post('/sessions', authenticate, admin, validate({ body: sessionSchemas.create }), sessionController.create);
router.put(
  '/sessions/:id',
  authenticate,
  admin,
  validate({ params: idParam, body: sessionSchemas.update }),
  sessionController.update
);
router.patch('/sessions/:id/cancel', authenticate, admin, byId, sessionController.cancel);
router.delete('/sessions/:id', authenticate, admin, byId, sessionController.remove);

router.get('/enrollments/me', authenticate, authorize('MEMBER'), enrollmentController.listMine);
router.post(
  '/enrollments',
  authenticate,
  authorize('MEMBER'),
  validate({ body: enrollmentSchemas.create }),
  enrollmentController.enroll
);
router.patch('/enrollments/:id/cancel', authenticate, authorize('MEMBER', 'ADMIN'), byId, enrollmentController.cancel);

module.exports = router;
