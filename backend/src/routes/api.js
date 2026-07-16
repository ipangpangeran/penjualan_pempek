import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import * as salesController from '../controllers/salesController.js';
import * as reportController from '../controllers/reportController.js';
import * as dbController from '../controllers/dbController.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Auth routes
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.me);
router.post('/auth/change-password', verifyToken, authController.changePassword);

// Product routes
router.get('/products', verifyToken, productController.getProducts);
router.get('/products/active', verifyToken, productController.getActiveProducts);
router.post('/products', verifyToken, productController.createProduct);
router.put('/products/:id', verifyToken, productController.updateProduct);
router.patch('/products/:id/status', verifyToken, productController.toggleProductStatus);

// Unified Sales routes
router.post('/sales', verifyToken, salesController.createSale);
router.get('/sales/:id', verifyToken, salesController.getSaleById);
router.put('/sales/:id', verifyToken, salesController.updateSale);
router.delete('/sales/:id', verifyToken, salesController.deleteSale);

// Reports routes
router.get('/reports/dashboard', verifyToken, reportController.getDashboardSummary);
router.get('/reports/query', verifyToken, reportController.queryReport);

// Database backup, restore, logs routes
router.get('/db/backup', verifyToken, dbController.backupDatabase);
router.post('/db/restore', verifyToken, upload.single('backup'), dbController.restoreDatabase);
router.get('/db/audit-logs', verifyToken, dbController.getAuditLogs);
router.delete('/db/audit-logs', verifyToken, dbController.clearAuditLogs);

export default router;
