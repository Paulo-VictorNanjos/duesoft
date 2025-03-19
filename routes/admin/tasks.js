import express from 'express';
import auth from '../../middlewares/auth.js';
import { isAdmin } from '../../middlewares/auth.js';
import upload from '../../middlewares/upload.js';
import TaskController from '../../controllers/admin/TaskController.js';

const router = express.Router();

router.get('/', auth, isAdmin, TaskController.index);
router.post('/:id/toggle', auth, isAdmin, TaskController.toggleStatus);
router.post('/:id/priority', auth, isAdmin, TaskController.updatePriority);

router.get('/new', auth, isAdmin, TaskController.create);
router.post('/', auth, isAdmin, upload.array('attachments', 5), TaskController.store);
router.get('/:id/edit', auth, isAdmin, TaskController.edit);
router.post('/:id', auth, isAdmin, upload.array('attachments', 5), TaskController.update);
router.delete('/:id', auth, isAdmin, TaskController.delete);
router.post('/:id/comments', auth, isAdmin, TaskController.addComment);
router.post('/:id/status', auth, isAdmin, TaskController.updateStatus);

router.delete('/:taskId/attachments/:attachmentId', auth, isAdmin, TaskController.deleteAttachment);

router.get('/kanban', auth, isAdmin, TaskController.kanban);

export default router; 