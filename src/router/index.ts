import { Router } from 'express';
import { body } from 'express-validator';
import * as UserController from '@/controllers/user';
import { authMiddleware } from '@/middlewares/auth-middleware';

const router = Router();

// Маршрути для користувачів
router.post(
    '/registration',
    body('email').isEmail(),
    UserController.registration,
);
router.get('/activate/:link', UserController.activate);
router.get('/get-activation-link/:userId', UserController.getActivationLink);
router.post('/google-auth', UserController.googleAuthorization);
router.post('/login', UserController.login);
router.post('/logout', UserController.logout);
router.get('/refresh', UserController.refresh);
router.put('/forgot-password', UserController.forgotPassword);
router.put(
    '/change-forgotten-password',
    UserController.changeForgottenPassword,
);
router.put('/change-password', authMiddleware, UserController.changePassword);
router.put('/lang', authMiddleware, UserController.changeLang);
router.post('/user/delete', authMiddleware, UserController.deleteMyUser);
router.get('/user', authMiddleware, UserController.getUser);
router.get('/users', authMiddleware, UserController.getUsers);
router.get('/all-users', UserController.getAllUsers);

export default router;
