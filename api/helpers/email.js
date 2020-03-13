const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp',
  port: 25,
  secure: false,
  auth: {

  }
});
module.exports = {


  friendlyName: 'Email',

  description: 'Sends Emails.',


  inputs: {
    to: {
      type: 'string',
      required: true
    },
    subject:{
      type: 'string',

      required: true
    },
    text:{
      type: 'string',
      required: true
    },
    attachments:{
      type:'ref'
    }

  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs, exits) {



    const options = {
      from: 'noreply@hcuge.ch',
      to: inputs.to,
      subject: inputs.subject,
      text: inputs.text,

    };

    if(inputs.attachments){
      options.attachments = [{
        fileName: 'Report.pdf',
        path: uploadedFiles[0].fd
      }]
    }

    transporter.sendMail(options, (error, info) => {
      if (error) {
        // ...

        sails.log('error sending email ', error);
        exits.error(error)
      } else {
        // ...
        sails.log('email send successfully ');
        exits.success()
      }

      // fs.unlinkSync(uploadedFiles[0].fd);
    });
  }


};

