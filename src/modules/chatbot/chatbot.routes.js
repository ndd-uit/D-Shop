import { Router } from 'express';
import authenticate from '../../middlewares/auth.middleware.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import { chatController } from './chatbot.controller.js';

const router = Router();

router.post(
    '/message',
    authenticate,
    authorizeRole('CUSTOMER'),
    chatController
);

export default router;
