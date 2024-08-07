const mongoose = require('mongoose');
const CourseEnroll = require('../../model/courseModel/courseEnrollSchema');
const Student = require('../../model/studentModel/studentSchema');
const Semester = require('../../model/semesterModel/semesterSchema');
const OfferCourseDetails = require('../../model/courseModel/offerCourseDetailsSchema');
const OfferCourse = require('../../model/courseModel/offerCourseSchema');
const ErrorHandler = require('../../utils/ErrorHandler');
const catchAsync = require('../../middleware/catchAsyncError');

// student course enroll.
exports.enrollCourse = catchAsync(async (req, res, next) => {
    const { courseId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorHandler('Invalid courseId ObjectId', 400));
    }

    try {
        const studentId = req.user._id;
        const student = await Student.findById(studentId);

        if (!student) {
            return next(new ErrorHandler('Student not found', 404));
        }

        // Fetch the latest semester
        const lastSemester = await Semester.findOne().sort({ createdAt: -1 }).exec();
        if (!lastSemester) {
            return next(new ErrorHandler('No semester found', 404));
        }
        const departmentOfferCourses = await OfferCourseDetails.findOne({
            semester: lastSemester._id,
            department: student.department
        })

        if (!departmentOfferCourses) {
            return next(new ErrorHandler('No courses offered for the student’s department', 404));
        }
        const courseExists = departmentOfferCourses.courses.includes(courseId);
        if (!courseExists) {
            return next(new ErrorHandler('Course not found in offered courses', 404));
        }
        let enrollment;
        const existingEnrollment = await CourseEnroll.findOne({ student: student._id });

        if (existingEnrollment) {
            if (existingEnrollment.semester.equals(lastSemester._id)) {
                if (existingEnrollment.enrollCourses.some(enrolledCourse => enrolledCourse.course.equals(courseId))) {
                    return next(new ErrorHandler('Course already enrolled', 400));
                } else {
                    // Add the course to the existing enrollment
                    existingEnrollment.enrollCourses.push({ course: courseId });
                    enrollment = await existingEnrollment.save();
                }
            } else {
                // Create new enrollment because the semester does not match
                enrollment = new CourseEnroll({
                    student: studentId,
                    semester: lastSemester._id,
                    enrollCourses: [{ course: courseId }]
                });
                await enrollment.save();
            }
        } else {
            // No existing enrollment found, create a new one
            enrollment = new CourseEnroll({
                student: studentId,
                semester: lastSemester._id,
                enrollCourses: [{ course: courseId }]
            });
            await enrollment.save();
        }
        enrollment = await CourseEnroll.findById(enrollment._id).populate('enrollCourses.course');

        return res.status(200).json({ enrollCourse: enrollment });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get OfferCourses by advising
exports.getOfferCoursesByAdvising = catchAsync(async (req, res, next) => {
    const studentID = req.user._id;
    const student = await Student.findById(studentID);
    if (!student) {
        return next(new ErrorHandler('Student not found', 404));
    }

    const lastSemester = await Semester.findOne().sort({ createdAt: -1 }).exec();
    if (!lastSemester) {
        return next(new ErrorHandler('No semester found', 404));
    }
    const offerCourseDetails = await OfferCourseDetails.findOne({
        semester: lastSemester._id,
        department: student.department
    }).populate([
        {
            path: 'semester',
            select: 'season year'
        },
        {
            path: 'courses',
            populate: [
                { path: 'courseName', select: 'courseCode' },
                { path: 'facultyName', select: 'name' },
                { path: 'classRoom', select: 'building classroomNo' },
                { path: 'labRoom', select: 'building classroomNo' },
            ]
        }
    ]);

    if (!offerCourseDetails) {
        return next(new ErrorHandler('No course details found for the specified semester and department', 404));
    }

    res.status(200).json({
        success: true,
        offerCourseDetails: offerCourseDetails
    });
})

// faculty course enroll by semester
exports.facultyCourseListBySemester = catchAsync(async (req, res, next) => {
    const {semesterId} = req.params

    try{
        const facultyId = req.user._id
        const findSemester = await OfferCourseDetails.findOne({ 'semester': semesterId })
            .populate({
            path: 'courses',
            populate: [
                { path: 'courseName', select:'courseCode' },
                { path: 'facultyName', select: 'name' },
                { path: 'classRoom', select: 'building classroomNo' },
                { path: 'labRoom', select: 'building classroomNo' },
            ]
        })
        if (findSemester) {
            const courses = findSemester.courses.filter(course => course.facultyName.equals(facultyId));

            if (courses.length > 0) {
                res.status(200).json({
                    courseNames: courses
                });
            } else {
                return next(new ErrorHandler('No courses found for the given faculty in this semester', 404));
            }
        } else {
            return next(new ErrorHandler('Semester not found', 404));
        }
    }catch (err){
        return next(new ErrorHandler(err.message, 500));
    }
});

// get course student list
exports.facultyEnrollCoursesStudentList = catchAsync(async (req, res, next) => {
    const { semesterId, courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorHandler('Invalid courseId ObjectId', 400));
    }
    if (!mongoose.Types.ObjectId.isValid(semesterId)) {
        return next(new ErrorHandler('Invalid semesterId ObjectId', 400));
    }
    const courseObj = new mongoose.Types.ObjectId(courseId);

    try {
        const enrollments = await CourseEnroll.find({
            semester: semesterId,
            'enrollCourses.course': courseObj
        })

        if (!enrollments || enrollments.length === 0) {
            return next (new ErrorHandler('No students found for the specified course and semester',404))
        }
        const filteredEnrollments = enrollments.map(enrollment => {
             enrollment.enrollCourses.filter(course => {
                if (course.course && course.course.equals(courseObj)) {
                    return true;
                }
                return false;
            });
            return {
                ...enrollment._doc,
            };
        });

        res.json({ enrollments: filteredEnrollments });
    } catch (error) {
        console.error('Error retrieving enrollments:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Advising semester enroll courses get
exports.getAdvisingCourses = catchAsync(async (req, res, next)=>{
    const studentID = req.user._id;
    const student = await Student.findById(studentID);

    if (!student) {
        return next(new ErrorHandler('Student not found', 404));
    }

    const lastSemester = await Semester.findOne().sort({ createdAt: -1 }).exec();
    if (!lastSemester) {
        return next(new ErrorHandler('No semester found', 404));
    }

    const findCourses = await CourseEnroll.findOne({
        student: student._id,
        semester: lastSemester._id
    }).populate([
        {
            path: 'student',
            select: 'name studentID'
        },
        {
            path:'enrollCourses.course',
            populate:[
                {path: 'courseName', select:'courseCode'},
                { path: 'classRoom', select: 'building classroomNo' },
                { path: 'labRoom', select: 'building classroomNo' }
            ]

        }
    ])
    if(!findCourses){
        return next (new ErrorHandler('No founded courses', 404))
    }
    res.status(200).json({
        success: true,
        courses: findCourses
    })
})

// Delete enroll Course
exports.deleteEnrollCourseById = catchAsync(async (req, res, next) => {
    const studentID = req.user._id;
    const student = await Student.findById(studentID);

    if (!student) {
        return next(new ErrorHandler('Student not found', 404));
    }

    // Fetch the latest semester
    const lastSemester = await Semester.findOne().sort({ createdAt: -1 }).exec();
    if (!lastSemester) {
        return next(new ErrorHandler('No semester found', 404));
    }

    const { courseId } = req.params;
    console.log(`Received courseId: ${courseId}`);
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return next(new ErrorHandler('Invalid courseId ObjectId', 400));
    }
    const findCourse = await CourseEnroll.findOneAndUpdate(
        { 'enrollCourses.course': courseId },
        { $pull: { enrollCourses: { course: courseId } } },
        { new: true }
    );

    if (!findCourse) {
        return next(new ErrorHandler('Course not found', 404));
    }
    const course = await OfferCourse.findById(courseId);
    if (course) {
        course.seat++;
        await course.save();
    }

    res.status(200).json({
        course,
        status: 'success',
        message: 'Delete successfully'
    });
});
