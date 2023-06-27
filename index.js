const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


/****** MICROSERVICE ****  */
let bodyParser = require('body-parser');
let mongoose = require('mongoose');

app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

let User = mongoose.model('User', {
  username: {
    type: String,
    require: true
  }
})

let Exercise = mongoose.model('Exercise', {
  user_id: String,
  description: String,
  duration: Number,
  date: Date //"Mon Jan 01 1990",
})

app.post('/api/users', (req, res) => {

  User.create([{ username: req.body.username }]).
    then(user => {
      if (user) {
        console.log(user)
        res.json({ "username": user[0].username, "_id": user[0]._id })
      }
    })
})

app.get('/api/users', (req, res) => {
  User.find().then(users => {
    res.json(users);
  });
})

function createExercise(user, details, date, res) {
  let exercise = new Exercise({
    user_id: user._id,
    date: date,
    duration: details.duration,
    description: details.description
  })

  exercise.save(function(err, e) {
    if (err) return console.error(err);
    res.json({
      "_id": user._id,
      "username": user.username,
      "date": e.date.toDateString(),
      "duration": e.duration,
      "description": e.description
    });
  });
}

function findLogs(user, qs, res) {
  let query_conditions = { user_id: user._id };

  if (qs.from && qs.to) {
    query_conditions.date = { $gte: qs.from, $lte: qs.to };
  } else if (qs.from) {
    query_conditions.date = { $gte: qs.from };
  } else if (qs.to) {
    query_conditions.date = { $lte: qs.to };
  }

  let query = Exercise.find(query_conditions);

  if (qs.limit) {
    let limit = Number(qs.limit);
    query = query.limit(limit);
  }

  query.exec((err, data) => {
    if (err) return console.error(err);
    if (data) {
      var count = data.length;
      var log = JSON.parse(JSON.stringify(data));
      log.forEach(e => e.date = new Date(e.date).toDateString());
      
      res.json({ _id: user._id, username: user.username, count: count, log: log });
    }
  })

}

app.post('/api/users/:_id/exercises', (req, res) => {
  let date = new Date();

  if (req.body.date) date = new Date(req.body.date);

  User.findById(req.params._id).
    then(user => {
      if (!user) return console.log("User not found");
      createExercise(user, req.body, date, res);
    });

});

app.get('/api/users/:_id/logs', (req, res) => {
  //?[from][&to][&limit] from, to = dates (yyyy-mm-dd); limit = number
  User.findById(req.params._id).then(user => {
    if (!user) return console.log("User not found");
    findLogs(user, req.query, res);
  });
});
