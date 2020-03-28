var schedule = require('node-schedule');

var j = schedule.scheduleJob(new Date(Date.now() - 5 * 1000), function(){
  console.log('The answer to life, the universe, and everything!');
});

console.log('job ', j)

// schedule.cancelJob(j.name)
