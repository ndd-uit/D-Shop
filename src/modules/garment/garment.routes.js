import { Router } from 'express';
import {
    createGarmentController,
    getAllGarments,
    getGarmentDetail,
    getGarmentsForManagementController,
    updateGarmentController,
    updateGarmentStatusController,
} from './garment.controller.js';
import validateUuid from '../../middlewares/validateUuid.js'
import authenticate from '../../middlewares/auth.middleware.js';
import authorizeRole from '../../middlewares/authorizeRole.js';
import {
    uploadGarmentImages,
} from '../../middlewares/garmentImageUpload.js';

const router = Router();

// GET /garments
router.get('/', getAllGarments);

router.get(
    '/manage',
    authenticate,
    authorizeRole('STORE_MANAGER'),
    getGarmentsForManagementController
);

router.post(
    '/',
    authenticate,
    authorizeRole('STORE_MANAGER'),
    uploadGarmentImages,
    createGarmentController
);

router.patch(
    '/:garmentId/status',
    authenticate,
    authorizeRole('STORE_MANAGER'),
    validateUuid('garmentId'),
    updateGarmentStatusController
);

router.patch(
    '/:garmentId',
    authenticate,
    authorizeRole('STORE_MANAGER'),
    validateUuid('garmentId'),
    uploadGarmentImages,
    updateGarmentController
);

// GET /garments/:id
router.get('/:id', validateUuid('id'), getGarmentDetail);

export default router;
