/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const ObjectId = require('mongodb').ObjectID;
const {
  OpenVidu
} = require('openvidu-node-client');
const uuidv1 = require('uuid/v1');
console.log("START MEDIA SERVER", sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
const openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
const fs = require('fs');


const db = Consultation.getDatastore().manager;

const sendConsultationClosed = function (consultation) {
  // emit consultation closed event with the consultation
  sails.sockets.broadcast(consultation.owner, 'consultationClosed', {
    data: {
      consultation,
      _id: consultation.id
    }
  });
};

const columns =
[{colName:'Consultation invite time', key:'inviteCreatedAt'},
{colName:'Doctor who sent invite', key:''},
{colName:'Consultation meeting time', key:''},
{colName:'Queue name', key:''},
{colName:'Patient request consultation time', key:''},
{colName:'IMAD team', key:''},
{colName:'IMAD nurse name', key:''},
{colName:'Doctor who take the consultation', key:''},
{colName:'Consultation close time', key:''},
{colName:'Number of text message send by doctor', key:''},
{colName:'Number of text message send by patient', key:''},
{colName:'Number of success call made by doctor', key:''},
{colName:'Number of failed call made by doctor', key:''},
{colName:'Call duration average', key:''},

{colName:'Patient satisfaction rate', key:''},
{colName:'Patient satisfaction message', key:''},
{colName:'Doctor satisfaction rate', key:''},
{colName:'Doctor satisfaction message', key:''}]

async function saveAnonymousDetails(consultation){

  // consultation = await Consultation.findOne({id:'5e81e3838475f6352ef40aec'})
  const anonymousConsultation = {

    consultationId: consultation.id,
    IMADTeam: consultation.IMADTeam,
    acceptedAt: consultation.acceptedAt,
    closedAt: consultation.closedAt || Date.now(),
    consultationCreatedAt: consultation.createdAt,
    queue: consultation.queue,
    owner: consultation.owner,
    acceptedBy: consultation.acceptedBy,

    patientRating:  consultation.patientRating,
    patientComment: consultation.patientComment,
    doctorRating: consultation.doctorRating,
    doctorComment:  consultation.doctorComment,

  }
  const invite = await PublicInvite.findOne({ id: consultation.invite })
  if(invite){
    anonymousConsultation.inviteScheduledFor = invite.scheduledFor;
    anonymousConsultation.invitedBy = invite.invitedBy;
    anonymousConsultation.inviteCreatedAt = invite.createdAt;
  }

  const doctorTextMessagesCount = await Message.count({from: consultation.acceptedBy, consultation: consultation.id, type:'text'})
  const patientTextMessagesCount = await Message.count({from: consultation.owner, consultation: consultation.id, type:'text'})
  const missedCallsCount = await Message.count({consultation: consultation.id, type:{in:['videoCall', 'audioCall']}, acceptedAt:0 })
  const successfulCalls = await Message.find({consultation: consultation.id, type:{in:['videoCall', 'audioCall']}, acceptedAt:{'!=':0} })

  const callDurations = successfulCalls.map(c=> c.closedAt - c.acceptedAt)
  const sum = callDurations.reduce((a, b) => a + b, 0);
  const averageCallDuration = (sum / callDurations.length) || 0;


  anonymousConsultation.doctorTextMessagesCount = doctorTextMessagesCount
  anonymousConsultation.patientTextMessagesCount = patientTextMessagesCount
  anonymousConsultation.missedCallsCount = missedCallsCount
  anonymousConsultation.successfulCallsCount = successfulCalls.length
  anonymousConsultation.averageCallDuration = averageCallDuration

  console.log('anonymous consultation ',anonymousConsultation )
  await AnonymousConsultation.create(anonymousConsultation)


}
// saveAnonymousDetails()
module.exports = {
  async consultationOverview(req, res) {
    let match = [{
      owner: new ObjectId(req.user.id)
    }];
    if (req.user && req.user.role === 'doctor') {

      match = [{
        acceptedBy: new ObjectId(req.user.id)
      },{
        invitedBy: new ObjectId(req.user.id)
      }
      ];
    }

    if(req.user.viewAllQueues){
      let queues =  (await Queue.find({})).map(queue => new ObjectId(queue.id));
      match.push(
        {
          status: 'pending',
          queue : { $in: queues }

        },
      )
    }else
    //filter the queue of the user
    if (req.user.allowedQueues && req.user.allowedQueues.length > 0) {
      let queues = req.user.allowedQueues.map(queue => new ObjectId(queue.id));

      match.push(
        {
          status: 'pending',
          queue : { $in: queues }
        },
      )
    }

    const agg = [{
      $match: {
        $or: match
      }
    },
    {
      $project: {
        consultation: '$$ROOT'
      }
    },
    {
      $lookup: {
        from: 'message',
        localField: '_id',
        foreignField: 'consultation',
        as: 'messages'
      }
    },
    {
      $project: {
        consultation: 1,
        lastMsg: {
          $arrayElemAt: [
            '$messages',
            -1
          ]
        },

        messages: 1

      }
    },
    {
      $project: {
        consultation: 1,
        lastMsg: 1,
        messages: {
          $filter: {
            input: '$messages',
            as: 'msg',
            cond: {
              $and: [{
                $eq: [
                  '$$msg.read',
                  false
                ]
              },
              {
                $or: [{
                  $eq: [
                    '$$msg.to',
                    new ObjectId(req.user.id)
                  ]
                }, {
                  $eq: [
                    '$$msg.to',
                    null
                  ]
                }]
              }
              ]
            }
          }
        }
      }
    },
    {
      $project: {

        consultation: 1,
        lastMsg: 1,
        unreadCount: {
          $size: '$messages'
        }
      }
    },
    {
      $lookup: {
        from: 'user',
        localField: 'consultation.owner',
        foreignField: '_id',
        as: 'nurse'
      }
    },
    {
      $lookup: {
        from: 'queue',
        localField: 'consultation.queue',
        foreignField: '_id',
        as: 'queue'
      }
    },
    {
      $lookup: {
        from: 'user',
        localField: 'consultation.acceptedBy',
        foreignField: '_id',
        as: 'doctor'
      }
    },
    {
      $project: {
        consultation: 1,
        lastMsg: 1,
        unreadCount: 1,
        doctor: {
          $arrayElemAt: ['$doctor', 0]
        },
        nurse: {
          $arrayElemAt: ['$nurse', 0]
        },
        queue: {
          $arrayElemAt: ['$queue', 0]
        }

      }
    },
    {
      $project: {
        consultation: 1,
        lastMsg: 1,
        unreadCount: 1,
        'doctor.firstName': 1,
        'doctor.lastName': 1,
        'doctor.phoneNumber': 1,
        'nurse.firstName': 1,
        'nurse.lastName': 1,
        'queue.name': 1,
      }
    }, {
      $skip: parseInt(req.query.skip) || 0
    }, {
      $limit: parseInt(req.query.limit) || 500
    }
    ];


    const consultationCollection = db.collection('consultation');
    const results = await consultationCollection.aggregate(agg);

    res.json(await results.toArray());

  },

  async create(req, res) {
    let consultationJson = req.body;

    if (req.body.invitationToken) {
      // If a consultation already exist, another one should not be created
      const existingConsultation = await Consultation.findOne({ invitationToken: req.body.invitationToken });
      if (existingConsultation) {
        return res.json(existingConsultation);
      }
      const invite = await PublicInvite.findOne({ inviteToken: req.body.invitationToken });
      if (invite) {
        if(invite.scheduledFor){
            if(invite.scheduledFor - Date.now() > 10 * 60 * 1000){
              console.log('can create consultation yet')
              return res.status(401).json({success: false, message: 'Too early for consultation'})
            }
        }

        consultationJson.firstName = invite.firstName ? invite.firstName : "No firstname";
        consultationJson.lastName = invite.lastName ? invite.lastName : "No lastname";
        consultationJson.gender = invite.gender ? invite.gender : "unknown";
        consultationJson.queue = invite.queue;
        consultationJson.invitedBy = invite.invitedBy;
        consultationJson.invite = invite.id;
      }
    }

    Consultation.create(consultationJson).fetch().then(consultation => {
      console.log(consultation);
      res.json(consultation);
    }).catch(err => {
      console.log("ERROR WHILE CREATING CONSULTATION", err);
      let error = err && err.cause ? err.cause : err;
      res.status(400).json(error);
    })
  },

  async acceptConsultation(req, res) {
    const consultation = await Consultation.updateOne({
      _id: req.params.consultation,
      status: 'pending'
    })
      .set({
        status: 'active',
        acceptedBy: req.user.id,
        acceptedAt: new Date()
      });

    if (!consultation) {
      return res.notFound();
    }

    sails.sockets.broadcast(consultation.owner, 'consultationAccepted', {
      data: {
        consultation,
        _id: consultation.id,
        doctor: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          phoneNumber: req.user.phoneNumber ? req.user.phoneNumber : ''
        }
      }
    });
    sails.sockets.broadcast(consultation.queue || consultation.invitedBy, 'consultationAccepted', {
      data: {
        consultation,
        _id: consultation.id,
        doctor: {
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          phoneNumber: req.user.phoneNumber ? req.user.phoneNumber : ''
        }
      }
    });

    res.status(200);
    return res.json({
      message: 'success'
    });
  },


  async closeConsultation(req, res) {

    try {


      const closedAt = new Date();

      const consultation = await Consultation.findOne({
        id: req.params.consultation
      });
      if (!consultation || consultation.status !== 'active') {
        return res.notFound();
      }

      await saveAnonymousDetails(consultation)

      if (consultation.invitationToken) {
        await PublicInvite.destroyOne({ inviteToken: consultation.invitationToken })
      }



      const messageCollection = db.collection('message');
      const consultationCollection = db.collection('consultation');

      const callMessages = await Message.find({ consultation: req.params.consultation, type: {in: ['videoCall', 'audioCall']}})

      // const callMessages = await callMessagesCursor.toArray();
      // save info for stats
      await AnonymousCall.createEach(callMessages.map(m=>{
        delete m.id;
        return m
      }))

      if(!consultation.queue){
        consultation.queue = null
      }


      // mark consultation as closed and set closedAtISO for mongodb ttl
      const { result } = await consultationCollection.update({ _id: new ObjectId(req.params.consultation) }, {
        $set: {
          status: 'closed',
          closedAtISO: closedAt,
          closedAt: closedAt.getTime()
        }
      });



      // set consultationClosedAtISO for mongodb ttl index
      await messageCollection.update({ consultation: new ObjectId(req.params.consultation) }, {
        $set: {
          consultationClosedAtISO: closedAt,
          consultationClosedAt: closedAt.getTime()
        }
      }, { multi: true });



      // emit consultation closed event with the consultation
      sendConsultationClosed(consultation);

      res.status(200);
      return res.json({
        message: 'success'
      });

    } catch (error) {
      sails.log('error ', error);
    }
  },

  async call(req, res) {
    try {
      // the consultation this call belongs to
      console.log("Start call");
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });
      console.log("Got consultation", consultation.id);
      const callerSession = await openvidu.createSession({
        customSessionId: req.params.consultation
      });
      console.log("Caller session", callerSession);

      const callerToken = await callerSession.generateToken();
      console.log("Caller token", callerToken);

      const calleeSession = await openvidu.createSession({
        customSessionId: req.params.consultation
      });
      console.log("callee session", calleeSession);

      const calleeToken = await calleeSession.generateToken();
      console.log("callee token", calleeToken);

      // the current user
      const user = await User.findOne({
        id: req.user.id
      });


      const calleeId = (req.user.id === consultation.owner) ? consultation.acceptedBy : consultation.owner;
      console.log("Callee id", calleeId);

      // create a new message
      const msg = await Message.create({
        type: (req.query.audioOnly === 'true') ? 'audioCall' : 'videoCall',
        consultation: req.params.consultation,
        from: req.user.id,
        to: calleeId
      }).fetch();

      const data = {
        consultation: req.params.consultation,
        token: calleeToken,
        id: calleeSession.id,
        user: {
          firstName: user.firstName,
          lastName: user.lastName
        },
        audioOnly: req.query.audioOnly === 'true',
        msg
      };

      sails.sockets.broadcast(calleeId, 'newCall', {
        data
      });

      return res.json({
        token: callerToken,
        id: callerSession.id,
        msg
      });

    } catch (error) {
      return res.json(error);
    }
  },

  async rejectCall(req, res) {
    try {
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });

      await Message.updateOne({
        _id: req.params.message,
        consultation: req.params.consultation
      })
        .set({
          closedAt: new Date()
        })

      const message = await Message.findOne({ id: req.params.message })

      sails.sockets.broadcast(consultation.acceptedBy, 'rejectCall', {
        data: {
          consultation,
          message
        }
      });

      sails.sockets.broadcast(consultation.owner, 'rejectCall', {
        data: {
          consultation,
          message
        }
      });


      res.json({
        status: 200
      });
    } catch (error) {
      return res.json(error);
    }

  },


  async acceptCall(req, res) {
    try {
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });

      await Message.updateOne({
        _id: req.params.message,
        consultation: req.params.consultation
      })
        .set({
          acceptedAt: new Date()
        });

      const message = await Message.findOne({ id: req.params.message })
      sails.sockets.broadcast(consultation.acceptedBy, 'acceptCall', {
        data: {
          consultation,
          message
        }
      });


      sails.sockets.broadcast(consultation.owner, 'acceptCall', {
        data: {
          consultation,
          message
        }
      });


      res.json({
        status: 200
      });
    } catch (error) {
      return res.json(error);
    }

  },

  uploadFile(req, res) {
    const fileId = uuidv1();
    const filePath = `${req.params.consultation}_${fileId}${req.headers['mime-type'].split('/')[1] ? `.${req.headers['mime-type'].split('/')[1]}` : ''}`;
    req.file('attachment')
      .upload({
        dirname: sails.config.globals.attachmentsDir,
        saveAs: filePath
      }, async function whenDone(err, uploadedFiles) {
        if (err) {
          return res.status(500).send(err);
        } else {
          sails.log('uploaded ', uploadedFiles);
          if (!uploadedFiles[0]) { return res.status(400); }

          try {
            if (process.env.NODE_ENV !== 'development') {
              const { is_infected } = await sails.config.globals.clamscan.is_infected(uploadedFiles[0].fd);
              if (is_infected) {
                return res.status(400).send(new Error('File is infected'));
              }
            }
          } catch (error) {
            sails.log('Error scanning', error);
            return res.serverError();
          }


          const message = await Message.create({
            type: 'attachment',
            mimeType: req.headers['mime-type'],
            fileName: decodeURIComponent(req.headers['filename']),
            filePath,
            consultation: req.params.consultation,
            to: req.body.to || null,
            from: req.user.id
          }).fetch();

          return res.send({
            message,
            textParams: req.params
          });
        }
      });
  },

  async attachment(req, res) {
    const msg = await Message.findOne({
      id: req.params.attachment
    });

    if (!msg.mimeType.startsWith('audio') && !msg.mimeType.endsWith('jpeg') && !msg.mimeType.endsWith('png')) {
      res.setHeader('Content-disposition', `attachment; filename=${msg.fileName}`);
    }
    const filePath = `${sails.config.globals.attachmentsDir}/${msg.filePath}`;

    if (!fs.existsSync(filePath)) {
      return res.notFound();
    }
    const readStream = fs.createReadStream(filePath);


    readStream.pipe(res);
  },

  sendReport(req, res) {
    const filePath = `${uuidv1()}.pdf`;

    req.file('report')
      .upload({
        dirname: './.tmp',
        saveAs: filePath
      }, async function whenDone(err, uploadedFiles) {
        if (err) {
          return res.status(500).send(err);
        } else {

          try {

            await sails.helpers.email.with({
              to: 'aapozaid@gmail.com',
              subject: 'Report',
              text: 'PDF report ',
              attachments: [{
                fileName: 'Report.pdf',
                path: uploadedFiles[0].fd
              }]
            })

          } catch (error) {
            res.send(500)
          }

        }
      });

  },

  async patientFeedback(req, res) {
    try {
      await Consultation.updateOne({
        id: req.body.consultationId,
      }).set({
        patientRating: req.body.rating || '',
        patientComment: req.body.comment,
      });
      await AnonymousConsultation.updateOne({
        consultationId: req.body.consultationId,
      }).set({
        patientRating: req.body.rating || '',
        patientComment: req.body.comment,
      });
      res.json({ status: 200 });
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  async doctorFeedback(req, res) {
    try {
      await Consultation.updateOne({
        id: req.body.consultationId,
      }).set({
        doctorRating: req.body.rating || '',
        doctorComment: req.body.comment,
      });
      await AnonymousConsultation.updateOne({
        consultationId: req.body.consultationId,
      }).set({
        doctorRating: req.body.rating || '',
        doctorComment: req.body.comment,
      });
      res.json({ status: 200 });
    } catch (error) {
      return res.status(500).json(error);
    }
  }

};
