const mongoose = require('mongoose');
const Course = require('../models/Course');
require('dotenv').config();

const courses = [
    {
        title: 'Introduction to Web Development',
        description: 'Learn the basics of HTML, CSS, and JavaScript.',
        modules: [
            {
                title: 'HTML Fundamentals',
                lessons: [
                    {
                        title: 'Basic HTML Structure',
                        videoUrl: 'https://example.com/video1',
                        duration: 15
                    },
                    {
                        title: 'HTML Elements',
                        videoUrl: 'https://example.com/video2',
                        duration: 20
                    }
                ]
            }
        ],
        experiencePoints: 100
    },
    {
        title: 'JavaScript Mastery',
        description: 'Advanced JavaScript concepts and modern ES6+ features.',
        modules: [
            {
                title: 'ES6 Features',
                lessons: [
                    {
                        title: 'Arrow Functions',
                        videoUrl: 'https://example.com/video3',
                        duration: 25
                    },
                    {
                        title: 'Destructuring',
                        videoUrl: 'https://example.com/video4',
                        duration: 20
                    }
                ]
            }
        ],
        experiencePoints: 150
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        await Course.deleteMany({});
        await Course.insertMany(courses);
        console.log('Sample courses created successfully!');
        process.exit();
    })
    .catch(error => {
        console.error('Error seeding courses:', error);
        process.exit(1);
    });