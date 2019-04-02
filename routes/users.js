const express = require('express');
const router = express.Router();// eslint-disable-line new-cap
const { User } = require('mongoose').models;


router.get('/:id', function (req, res, next) {
  res.send('comming soon');
});

router.post('/', async function (req, res, next) {


  const user = new User(req.body);
  await user.save();

  res.json(user);

});
module.exports = router;