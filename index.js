const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const moment = require('moment');
const bodyParser = require('body-parser');
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
}); app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//=========================== DB ===========================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env['DB_URL'], {
      useUnifiedTopology: true,
      useNewUrlParser: true
    });
  } catch (err) {
    console.error(err);
  }
}
connectDB();
//=========================== END DB =======================
const Schema = mongoose.Schema;
// User
const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  })
let User = mongoose.model('User', UserSchema)
// Exerciser
const ExerciseSchema = new Schema(
  {
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, required: true }
  },
  {
    timestamps: true
  })
let Exercise = mongoose.model('Exercise', ExerciseSchema)
//==========================================================
app.post("/api/users", async (req, res) => {
  const newUser = await User.create({ username: req.body.username })
  res.json({
    username: newUser.username,
    _id: newUser._id
  })
})
app.get("/api/users", async (req, res) => {
  const UserList = await User.find().select(['-__v']).lean()
  res.json(UserList)
})
//==========================================================
app.post('/api/users/:_id/exercises', async (req, res) => {
  let cur_date = req.body.date;
  if (!cur_date) {
    cur_date = new Date()
  }
  const _id = req.params._id;
  const { username } = await User.findOne({ _id }).select(['-__v', '-_id']).lean()
  const duration = Number(req.body.duration);
  const description = req.body.description;
  const date = cur_date;
  await Exercise.create({ userId:_id, description, duration, date })
  res.json({
    _id: _id,
    username: username,
    date: moment(cur_date).format('ddd MMMM DD YYYY'),
    duration: duration,
    description: description
  })
})
app.get('/api/users/:_id/logs', async (req, res) => {
  let _id = req.params._id
  let { from, to, limit } = req.query;
  from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
  to = moment(to, 'YYYY-MM-DD').isValid() ? moment(to, 'YYYY-MM-DD') : moment().add(1000000000000);
  User.findById(_id).then(user => {
    if (!user) throw new Error('Unknown user with _id');
    Exercise.find({ userId: _id })
      .where('date').gte(from).lte(to)
      .limit(+limit).exec()
      .then(log => res.status(200).send({
        _id: _id,
        username: user.username,
        count: log.length,
        log: log.map(o => ({
          description: o.description,
          duration: o.duration,
          date: moment(o).format('ddd MMMM DD YYYY')
        }))
      }))
  }).catch(err => {
    console.log(err);
    res.status(500).send(err.message);
  })
})
//==========================================================
const PORT = 4000
mongoose.connection.once('open', () => {
  console.log('Connection to MongooseDB');
  app.listen(PORT || process.env.PORT, () => console.log(`Server running on port http://localhost:${PORT}`));
})