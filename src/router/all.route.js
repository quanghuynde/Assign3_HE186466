const express = require("express");
const mongoose = require("mongoose");
const authenticateToken = require("../../middleware/auth");

const router = express.Router();

const Student = require("../models/Student");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");

router.use(authenticateToken);

// GET /api/classes/:classId/students?status=enrolled

router.get("/classes/:classId/students", async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: `Invalid classId: ${classId}` });
    }

    // Check status in collection classes in field enrollment
    if (!status || !["enrolled", "dropped"].includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const classData = await Class.findById(classId)
      .populate({
        path: "enrollments.studentId",
        select: "studentCode fullName email",
      })
      .lean();

    //Check exist studentId in collection classes
    if (!classData) {
      return res
        .status(404)
        .json({ error: `Class with id = ${classId} not found` });
    }

    const format = classData.enrollments
      //filter status in field enrollments
      .filter((item) => item.status === status)
      .map((item) => {
        return {
          studentId: item.studentId._id,
          studentCode: item.studentId.studentCode,
          fullName: item.studentId.fullName,
          email: item.studentId.email,
        };
      });

    return res.status(200).json(format);
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/classes/:classId/attendance-summary

router.get("/classes/:classId/attendance-summary", async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: `Invalid classId: ${classId}` });
    }

    const classData = await Class.findById(classId)
      .populate({
        path: "enrollments.studentId",
        select: "studentCode fullName",
      })
      .lean();

    if (!classData) {
      return res
        .status(404)
        .json({ error: `Class with id = ${classId} not found` });
    }

    //Get student enrolled
    const enrollments = classData.enrollments.filter(
      (item) => item.status === "enrolled",
    );

    const format = [];

    for (const item of enrollments) {
      //find Attendance with student
      const attendances = await Attendance.find({
        // use classId, studentId because ref in models
        classId: classId,
        studentId: item.studentId._id,
      }).lean();

      const totalSessions = attendances.length;

      // With find status in collection Attendance
      // Count number of each status: PRESENT, ABSENT
      const present = attendances.filter(
        (item) => item.status === "PRESENT",
      ).length;

      //const count status
      const absent = attendances.filter(
        (item) => item.status === "ABSENT",
      ).length;

      let attendanceRate = 0;

      if (totalSessions > 0) {
        // Calculate attendance rate
        attendanceRate = Math.round((present / totalSessions) * 1000) / 10;
      }

      format.push({
        studentCode: item.studentId.studentCode,
        fullName: item.studentId.fullName,
        totalSessions: totalSessions,
        present: present,
        absent: absent,
        attendanceRate: attendanceRate,
        warning: attendanceRate < 80,
      });
    }

    return res.status(200).json(format);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/students/:studentId/attendances

router.get("/students/:studentId/attendances", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ error: `Invalid studentId: ${studentId}` });
    }

    const student = await Student.findById(studentId).lean();

    if (!student) {
      return res
        .status(404)
        .json({ error: `Student with id = ${studentId} not found` });
    }

    const attendances = await Attendance.find({
      studentId: studentId,
    })
      .populate({
        path: "classId",
        select: "className subjectId",
        populate: {
          path: "subjectId",
          select: "name",
        },
      })
      .sort({ date: -1 })
      .lean();

    const format = attendances.map((item) => {
      return {
        className: item.classId?.className,
        subjectName: item.classId?.subjectId?.name,
        date: item.date,
        status: item.status,
      };
    });

    return res.status(200).json(format);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

// POST /api/classes/:classId/attendances

router.post("/classes/:classId/attendances", async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, records } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ error: `Invalid classId: ${classId}` });
    }

    const classData = await Class.findById(classId)
      .populate({
        path: "enrollments.studentId",
        select: "studentCode fullName",
      })
      .lean();

    if (!classData) {
      return res
        .status(404)
        .json({ error: `Class with id = ${classId} not found` });
    }

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const attendanceDate = new Date(date);

    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date",
      });
    }

    const today = new Date();

    attendanceDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (attendanceDate > today) {
      return res.status(400).json({
        error: "Date cannot be in the future",
      });
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        error: "Records is required and cannot be empty",
      });
    }

    const enrollments = classData.enrollments.filter(
      (item) => item.status === "enrolled",
    );

    for (const record of records) {
      if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
        return res.status(400).json({
          error: `Invalid studentId: ${record.studentId}`,
        });
      }

      const enrollment = enrollments.find(
        (item) => item.studentId._id.toString() === record.studentId.toString(),
      );

      if (!enrollment) {
        return res.status(400).json({
          error: `Student ${record.studentId} does not belong to class`,
        });
      }

      if (!["PRESENT", "ABSENT"].includes(record.status)) {
        return res.status(400).json({
          error: `Invalid status: ${record.status}`,
        });
      }
    }

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId._id.toString();

      const record = records.find(
        (item) => item.studentId.toString() === studentId,
      );

      if (!record) {
        return res.status(400).json({
          error: `Missing attendance for student ${enrollment.studentId.studentCode} (${enrollment.studentId.fullName})`,
        });
      }
    }

    let updatedCount = 0;

    for (const record of records) {
      const oldAttendance = await Attendance.findOne({
        studentId: record.studentId,
        classId: classId,
        date: attendanceDate,
      });

      if (oldAttendance) {
        oldAttendance.status = record.status;
        await oldAttendance.save();
        updatedCount++;
      } else {
        const newAttendance = new Attendance({
          studentId: record.studentId,
          classId: classId,
          date: attendanceDate,
          status: record.status,
        });

        await newAttendance.save();
      }
    }

    const present = records.filter((item) => item.status === "PRESENT").length;

    const absent = records.filter((item) => item.status === "ABSENT").length;

    return res.status(201).json({
      message: "Attendance recorded successfully",
      totalRecords: records.length,
      present: present,
      absent: absent,
      updatedCount: updatedCount,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
