const mongoose = require("mongoose");
const Subject = require("./Subject");
const Student = require("./Student");

const classSchema = new mongoose.Schema({
  className: {
    type: String,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },
  lecturerName: {
    type: String,
  },

  status: {
    type: String,
  },
  enrollments: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
      status: {
        type: String
      }
    },
  ],
});

module.exports = mongoose.model("Class", classSchema);
