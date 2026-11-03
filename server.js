const express = require('express');
const app = express();
const connectDB = require('./config/db')
const Router = require('./src/router/all.route')
const authRouter = require('./src/router/authRoute');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

app.use('/auth', authRouter);
app.use('/api', Router)



connectDB()
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
