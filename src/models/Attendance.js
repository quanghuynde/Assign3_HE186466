const mongoose = require("mongoose");
const Student = require("./Student");
const Class = require("./Class");
const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },
  date: {
    type: Date,
  },
  status: {
    type: String,
  },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
