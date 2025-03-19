import User from '../models/User.js';
import Course from '../models/Course.js';
import History from '../models/History.js';
import { Exam, ExamAttempt } from '../models/Exam.js';
import Performance from '../models/Performance.js';
import { getUserCategory } from '../routes/profile.js';
import Banner from '../models/Banner.js';
import News from '../models/News.js';

class DashboardController {
  async index(req, res) {
    try {
      console.log('=== CARREGANDO DASHBOARD ===');

      const user = await User.findById(req.user._id)
        .populate('highlightedAchievement')
        .populate('achievements.achievement')
        .populate({
          path: 'completedCourses.course',
          select: 'title modules coverImage'
        });

      const category = await getUserCategory(req.user._id);
      const level = Math.floor(user.experience / 1000) + 1;

      console.log('Conquista em destaque:', user.highlightedAchievement);

      // Buscar banners ativos
      console.log('Buscando banners ativos para o dashboard...'); // Log para debug
      const currentDate = new Date();
      // Ajusta para o fuso horário local
      const offset = currentDate.getTimezoneOffset();
      currentDate.setMinutes(currentDate.getMinutes() - offset);
      
      console.log('Data atual:', currentDate); // Log para debug
      
      let headerBanner = null;
      let defaultBanners = [];

      try {
        // Buscar banner de cabeçalho
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log('Início do dia:', startOfDay);
        console.log('Fim do dia:', endOfDay);

        headerBanner = await Banner.findOne({
          company_id: req.user.company._id,
          type: 'header',
          status: 'active',
          $or: [
            {
              start_date: { $lte: endOfDay },
              end_date: { $gte: startOfDay }
            },
            {
              start_date: null,
              end_date: null
            }
          ]
        });

        // Buscar banners padrão
        defaultBanners = await Banner.find({
          company_id: req.user.company._id,
          type: 'default',
          status: 'active',
          start_date: { $lte: endOfDay },
          end_date: { $gte: startOfDay }
        }).sort({ createdAt: -1 });

        console.log('Banner de cabeçalho:', headerBanner); // Log para debug
        console.log('Banners padrão:', defaultBanners); // Log para debug
      } catch (error) {
        console.error('Erro ao buscar banners:', error);
        headerBanner = null;
        defaultBanners = [];
      }

      // Buscar novidades
      const news = await News.find({
        company_id: req.user.company,
        status: 'active'
      }).sort({ event_date: -1 }).limit(6);

      // Buscar histórico e filtrar cursos nulos
      const enrolled = await History.find({ user: req.user.id })
        .populate('course')
        .sort({ updatedAt: -1 });

      // Filtrar cursos nulos do histórico
      const validEnrolled = enrolled.filter(e => e.course);
      
      // Buscar e filtrar exames recentes válidos
      const recentExams = await Exam.find({ company: req.user.company })
        .populate('course')
        .limit(3);

      // Filtrar exames com cursos nulos
      const validRecentExams = recentExams.filter(exam => exam.course).map(exam => ({
        _id: exam._id,
        title: exam.title,
        course: {
          title: exam.course ? exam.course.title : 'Curso Removido'
        },
        timeLimit: exam.timeLimit,
        minimumScore: exam.minimumScore,
        questions: exam.questions || []
      }));

      // Get pending exams count
      const pendingExams = await Exam.countDocuments({
        active: true,
        course: { $ne: null },
        _id: {
          $nin: await ExamAttempt.distinct('exam', {
            user: req.user._id,
            passed: true
          })
        },
        company: req.user.company
      });

      // Get new courses count (added in the last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newCourses = await Course.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
        _id: { 
          $nin: validEnrolled.map(e => e.course._id).filter(Boolean)
        },
        company: req.user.company
      });

      // Buscar todas as tentativas de exame do usuário
      const examAttempts = await ExamAttempt.find({ 
        user: req.user._id 
      }).populate('exam');

      // Calcular estatísticas dos exames
      const examStats = {
        totalExams: examAttempts.length,
        averageScore: examAttempts.length ? 
          examAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / examAttempts.length : 0,
        passRate: examAttempts.length ? 
          (examAttempts.filter(a => a.passed).length / examAttempts.length) * 100 : 0,
        // Últimas 6 notas para o gráfico
        recentScores: examAttempts
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 6)
          .map(a => ({
            score: a.score || 0,
            date: a.createdAt
          }))
          .reverse()
      };

      const stats = {
        totalCourses: validEnrolled.length,
        completedCourses: validEnrolled.filter(h => h.progress === 100).length,
        totalXP: user.experience || 0,
        overallProgress: validEnrolled.length ? 
          Math.round(validEnrolled.reduce((acc, curr) => acc + curr.progress, 0) / validEnrolled.length) : 0,
        weeklyProgress: validEnrolled.filter(h => 
          new Date(h.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        examStats: examStats
      };

      // Buscar dados de desempenho do usuário
      const performanceData = await Performance.find({ userId: req.user._id })
        .sort({ date: -1 })
        .limit(6);

      console.log('Renderizando dashboard com dados:', {
        userFound: !!user,
        level,
        category,
        enrolledCount: validEnrolled.length,
        recentExamsCount: recentExams.length,
        bannersCount: defaultBanners.length + (headerBanner ? 1 : 0),
        newsCount: news.length
      });

      res.render('dashboard/index', {
        user,
        enrolled: validEnrolled,
        recentExams: validRecentExams,
        level,
        category,
        stats,
        indicators: {
          pendingExams,
          newCourses
        },
        headerBanner,
        banners: defaultBanners,
        error: req.flash('error'),
        success: req.flash('success'),
        performanceData: performanceData,
        news
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      console.error('Stack trace:', error.stack);
      
      try {
        res.render('errors/500', {
          error: 'Erro ao carregar dashboard',
          user: req.user
        });
      } catch (renderError) {
        res.status(500).send('Erro ao carregar dashboard');
      }
    }
  }
}

export default new DashboardController(); 