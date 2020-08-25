const schedule = require('node-schedule');

const CONSULTATION_TIMEOUT = 24 * 60 * 60 * 1000;

module.exports = {


  startCron: () => schedule.scheduleJob('*/5 * * * *', async () => {

    const now = Date.now();
    const consultationsToBeClosed = await Consultation.find({
      status: { '!=': 'closed' },
      or: [
        {
          acceptedAt: 0,
          createdAt: {
            '<': now - CONSULTATION_TIMEOUT
          }
        },
        {
          acceptedAt: { '!=': 0, '<': now - CONSULTATION_TIMEOUT }
        }
      ]
    });

    console.log('consultatins to be clsed ', consultationsToBeClosed);

    await Promise.all(consultationsToBeClosed.map(async c => {

      await Consultation.closeConsultation(c);
    }));
  })

};
