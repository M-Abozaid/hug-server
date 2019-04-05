const express = require('express');
const router = express.Router();// eslint-disable-line new-cap
const { Consultation } = require('mongoose').models;

/* GET home page. */
router.post('/', async function (req, res, next) {

  const consultation = new Consultation(req.body);
  await consultation.save();
  res.json(consultation);

});

router.get('/:id', function (req, res, next) {

});

module.exports = router;