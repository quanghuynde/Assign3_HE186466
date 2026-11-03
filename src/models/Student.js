const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({

    studentCode: {
        type: String
    },
    fullName: {
        type: String
    },
    email: {
        type:String
    }
    
})

module.exports = mongoose.model('Student', studentSchema)