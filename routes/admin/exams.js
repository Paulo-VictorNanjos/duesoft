// routes/admin/exams.js
import express from 'express';
import auth from '../../middlewares/auth.js';
import isAdmin from '../../middlewares/admin.js';
import upload from '../../middlewares/upload.js';
import ExamController from '../../controllers/ExamController.js';

const router = express.Router();

// List exams
router.get('/', auth, isAdmin, ExamController.index);

// Results
router.get('/:id/results', auth, isAdmin, ExamController.showResults);

// New exam form
router.get('/new', auth, isAdmin, ExamController.create);

// Create exam
router.post('/', auth, isAdmin, upload.array('questionImages'), ExamController.store);

// Edit exam form
router.get('/:id/edit', auth, isAdmin, ExamController.edit);

// Update exam
router.post('/:id', auth, isAdmin, upload.array('questionImages', 20), ExamController.update);

// Toggle status
router.post('/:id/toggle-status', auth, isAdmin, ExamController.toggleStatus);

// Delete exam
router.delete('/:id', auth, isAdmin, ExamController.destroy);

// Grade essay page
router.get('/:examId/attempts/:attemptId/grade', auth, isAdmin, ExamController.showGradeEssay);

// Save grade
router.post('/:examId/attempts/:attemptId/grade', auth, isAdmin, ExamController.saveGrade);

// Submit exam
router.post('/:id/submit', auth, ExamController.submit);

// Pending review page
router.get('/:id/pending-review', auth, ExamController.showPendingReview);

export default router;