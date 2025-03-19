import { Exam, ExamAttempt } from '../models/Exam.js';
import NotificationManager from './NotificationManager.js';
import { planLimits } from '../middlewares/planAccess.js';

class ExamService {
    async findExamsByCompany(companyId) {
        return await Exam.find({ company: companyId }).populate('course');
    }

    async findExamWithResults(examId) {
        const exam = await Exam.findById(examId).populate('course');
        if (!exam) {
            throw new Error('Prova não encontrada');
        }

        const attempts = await ExamAttempt.find({ exam: examId })
            .populate('user', 'name email profilePicture')
            .sort('-createdAt');

        return { exam, attempts, stats: this.calculateExamStats(attempts) };
    }

    calculateExamStats(attempts) {
        const totalAttempts = attempts.length;
        if (totalAttempts === 0) return {
            totalAttempts: 0,
            passedAttempts: 0,
            averageScore: '0.0',
            averageTime: 0
        };

        const passedAttempts = attempts.filter(a => a.passed).length;
        const averageScore = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAttempts;
        const averageTime = Math.round(attempts.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / totalAttempts / 60);

        return {
            totalAttempts,
            passedAttempts,
            averageScore: averageScore.toFixed(1),
            averageTime
        };
    }

    async checkExamCreationLimit(company) {
        const currentPlan = company.plan || 'basic';
        const currentExams = await Exam.countDocuments({ company: company._id });
        const planLimit = planLimits[currentPlan]?.maxExams || 5;

        if (currentExams >= planLimit) {
            return {
                allowed: false,
                upgradeData: {
                    feature: 'criação de provas',
                    currentPlan,
                    currentUsage: currentExams,
                    planLimit,
                    planLimits,
                    message: `Seu plano atual (${currentPlan}) permite apenas ${planLimit} provas. Você já possui ${currentExams} provas.`,
                    upgradeReason: 'aumentar o limite de provas',
                    nextPlan: currentPlan === 'basic' ? 'pro' : 'enterprise'
                }
            };
        }

        return { allowed: true };
    }

    prepareExamData(body, files, companyId) {
        const {
            title,
            description,
            courseId,
            timeLimit,
            minimumScore,
            attempts,
            isCategoryExam,
            targetCategory,
            questions,
            examType
        } = body;

        const processedQuestions = this.processQuestions(questions, files, examType);

        return {
            title,
            description,
            course: courseId,
            timeLimit: parseInt(timeLimit) || 60,
            minimumScore: parseInt(minimumScore) || 70,
            attempts: parseInt(attempts) || 3,
            isCategoryExam: isCategoryExam === 'true',
            ...(isCategoryExam === 'true' && { targetCategory }),
            questions: processedQuestions,
            active: true,
            company: companyId
        };
    }

    processQuestions(questions, files, examType) {
        const questionsArray = Array.isArray(questions) ? questions : [questions];
        return questionsArray.map((question, index) => {
            return examType === 'multiple_choice' 
                ? this.processMultipleChoiceQuestion(question, files, index)
                : this.processEssayQuestion(question);
        });
    }

    processMultipleChoiceQuestion(question, files, index) {
        const questionObj = {
            type: 'multiple_choice',
            questionText: question.text,
            image: files && files[index] ? `/uploads/exam-images/${files[index].filename}` : null,
            options: []
        };

        const options = Array.isArray(question.options) ? question.options : [question.options];
        options.forEach((option, optIndex) => {
            questionObj.options.push({
                text: option,
                isCorrect: question.correctOption === optIndex.toString()
            });
        });

        return questionObj;
    }

    processEssayQuestion(question) {
        return {
            type: 'essay',
            questionText: question.text,
            baseText: question.baseText,
            maxScore: question.maxScore || 10,
            evaluationCriteria: question.evaluationCriteria || '',
            expectedAnswer: question.expectedAnswer || '',
            status: 'pending'
        };
    }

    async processExamSubmission(examId, userId, companyId, answers, timeSpent) {
        const exam = await Exam.findById(examId);
        if (!exam) throw new Error('Prova não encontrada');

        const processedAnswers = this.processSubmittedAnswers(exam.questions, answers);
        const hasEssay = this.hasEssayQuestions(exam.questions);

        const attempt = new ExamAttempt({
            exam: examId,
            user: userId,
            company: companyId,
            answers: processedAnswers,
            timeSpent,
            status: hasEssay ? 'pending_review' : 'completed'
        });

        if (!hasEssay) {
            const { score, passed } = this.calculateMultipleChoiceScore(processedAnswers, exam.minimumScore);
            attempt.score = score;
            attempt.passed = passed;
        }

        await attempt.save();
        return { hasEssay, attempt };
    }

    processSubmittedAnswers(questions, answers) {
        return questions.map((question, index) => {
            if (question.type === 'multiple_choice') {
                const selectedOption = parseInt(answers[index]);
                const isCorrect = question.options[selectedOption]?.isCorrect || false;
                return {
                    type: 'multiple_choice',
                    selectedOption,
                    isCorrect,
                    score: isCorrect ? (question.maxScore || 10) : 0
                };
            }
            return {
                type: 'essay',
                text: answers[index],
                score: 0,
                status: 'pending'
            };
        });
    }

    calculateMultipleChoiceScore(answers, minimumScore) {
        const totalScore = answers.reduce((acc, curr) => acc + curr.score, 0);
        const maxPossibleScore = answers.length * 10;
        const score = (totalScore / maxPossibleScore) * 100;
        return {
            score,
            passed: score >= minimumScore
        };
    }

    hasEssayQuestions(questions) {
        return questions.some(q => q.type === 'essay');
    }

    async gradeExamAttempt(attemptId, grades, feedback) {
        const attempt = await ExamAttempt.findById(attemptId);
        if (!attempt) throw new Error('Tentativa não encontrada');

        const exam = await Exam.findById(attempt.exam);
        if (!exam) throw new Error('Prova não encontrada');

        attempt.answers = attempt.answers.map((answer, index) => ({
            ...answer,
            score: grades[index],
            feedback: feedback[index]
        }));

        const totalScore = grades.reduce((acc, curr) => acc + Number(curr), 0);
        const maxPossibleScore = exam.questions.reduce((acc, q) => acc + (q.maxScore || 10), 0);
        attempt.score = (totalScore / maxPossibleScore) * 100;
        attempt.passed = attempt.score >= exam.minimumScore;
        attempt.status = 'graded';

        await attempt.save();

        await NotificationManager.send(
            attempt.user,
            'Prova Corrigida!',
            `Sua prova "${exam.title}" foi corrigida. Clique para ver o resultado.`,
            'info',
            `/exams/${exam._id}/result`,
            attempt.company
        );

        return attempt;
    }
}

export default new ExamService(); 