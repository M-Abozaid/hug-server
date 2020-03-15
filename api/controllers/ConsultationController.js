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
const openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
const fs = require('fs');


const db = Consultation.getDatastore().manager;

module.exports = {
  async consultationOverview(req, res) {
    let match = [{
      owner: new ObjectId(req.user.id)
    }];
    if (req.user && req.user.role === 'doctor') {
      match = [{
        acceptedBy: new ObjectId(req.user.id)
      },
      {
        status: 'pending'
      }
      ];
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
        'nurse.firstName': 1,
        'nurse.lastName': 1,
        'queue.name': 1,
      }
    }
    ];


    const consultationCollection = db.collection('consultation');
    const results = await consultationCollection.aggregate(agg);

    res.json(await results.toArray());

  },

  async create(req, res) {
    let consultationJson = req.body;

    if (req.body.invitationToken) {
      const existingConsultation = await Consultation.findOne({ invitationToken: req.body.invitationToken, status: "pending" });
      if (existingConsultation) {
        return res.json(existingConsultation);
      }
      const invite = await PublicInvite.findOne({ inviteToken: req.body.invitationToken });
      if (invite) {
        consultationJson.firstName = invite.firstName ? invite.firstName : "No firstname";
        consultationJson.lastName = invite.lastName ? invite.lastName : "No lastname";
        consultationJson.gender = invite.gender ? invite.gender : "unknown";
        consultationJson.queue = invite.queue;
      }
    }

    Consultation.create(consultationJson).fetch().then(consultation => {
      console.log(consultation);
      res.json(consultation);
    }).catch(err => {
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
          lastName: req.user.lastName
        }
      }
    });
    sails.sockets.broadcast('doctors', 'consultationAccepted', {
      data: {
        consultation,
        _id: consultation.id,
        doctor: {
          firstName: req.user.firstName,
          lastName: req.user.lastName
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

      const consultationCollection = db.collection('consultation');
      // mark consultation as closed and set closedAtISO for mongodb ttl
      const { result } = await consultationCollection.update({ _id: new ObjectId(req.params.consultation) }, {
        $set: {
          status: 'closed',
          closedAtISO: closedAt,
          closedAt: closedAt.getTime()
        }
      });



      const messageCollection = db.collection('message');
      // set consultationClosedAtISO for mongodb ttl index
      await messageCollection.update({ consultation: new ObjectId(req.params.consultation) }, {
        $set: {
          consultationClosedAtISO: closedAt,
          consultationClosedAt: closedAt.getTime()
        }
      }, { multi: true });


      // emit consultation closed event with the consultation
      sails.sockets.broadcast(consultation.owner, 'consultationClosed', {
        data: {
          consultation,
          _id: consultation.id
        }
      });

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
        });

      // call rejected by nurse
      if (req.user.id === consultation.owner) {
        sails.sockets.broadcast(consultation.acceptedBy, 'rejectCall', {
          data: {
            consultation
          }
        });
      } else if (req.user.id === consultation.acceptedBy) {
        sails.sockets.broadcast(consultation.owner, 'rejectCall', {
          data: {
            consultation
          }
        });
      }

      res.json({
        status: 200
      });
    } catch (error) {
      return res.json(error);
    }

  },


  async acceptCall(req, res) {
    try {
      await Message.updateOne({
        _id: req.params.message,
        consultation: req.params.consultation
      })
        .set({
          acceptedAt: new Date()
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

  }

};
