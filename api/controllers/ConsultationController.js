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
console.log('START MEDIA SERVER', sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
// const openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
const fs = require('fs');
const Json2csvParser = require('json2csv').Parser;
const jwt = require('jsonwebtoken');

const _ = require('@sailshq/lodash');


const db = Consultation.getDatastore().manager;





module.exports = {
  async consultationOverview (req, res) {


    let match = [{
      owner: new ObjectId(req.user.id)
    }];
    if (req.user && req.user.role === 'doctor') {

      match = [{
        acceptedBy: new ObjectId(req.user.id)
      }, {
        doctor: new ObjectId(req.user.id),
        queue: null
      }
      ];
    }

    if (req.user && req.user.role === 'translator') {
      match = [{ translator: ObjectId(req.user.id) }];
    }

    if (req.user && req.user.role === 'guest') {
      match = [{ guest: ObjectId(req.user.id) }];
    }


    if (req.user.viewAllQueues) {
      const queues = (await Queue.find({})).map(queue => new ObjectId(queue.id));
      match.push(
        {
          status: 'pending',
          queue: { $in: queues }

        }
      );
    } else
    // filter the queue of the user
    if (req.user.allowedQueues && req.user.allowedQueues.length > 0) {
      const queues = req.user.allowedQueues.map(queue => new ObjectId(queue.id));

      match.push(
        {
          status: 'pending',
          queue: { $in: queues }
        }
      );
    }

    const agg = [{
      $match: {
        $or: match
      }
    },
    {
      $project:{
        invitationToken: 0
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
      $lookup: {
        from: 'user',
        localField: 'consultation.translator',
        foreignField: '_id',
        as: 'translator'
      }
    },
    {
      $lookup: {
        from: 'user',
        localField: 'consultation.guest',
        foreignField: '_id',
        as: 'guest'
      }
    },
    {
      $project: {
        guest:{
          phoneNumber:-1, email:-1
        },
        translator:{
          firstName:-1, email:-1, direct:-1
        },
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
        guest: {
          $arrayElemAt: ['$guest', 0]
        },
        translator: {
          $arrayElemAt: ['$translator', 0]
        },
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

  async create (req, res) {
    const consultationJson = req.body;
    const { user } = req;
    let invite;
    // if user is guest or translator

    if (user.role === 'guest' || user.role === 'translator') {
      if (!req.body.invitationToken) {
        return res.status(200).send(null);

      }
      const subInvite = await PublicInvite.findOne({ inviteToken: req.body.invitationToken });
      if (!subInvite) {
        return res.status(400).send();
      }

      invite = await PublicInvite.findOne({ id: subInvite.patientInvite });

      if (!invite) {
        return res.status(400).send();
      }

      // if the patient invite has contact details
      if (invite.emailAddress || invite.phoneNumber) {
        return res.status(200).send(null);
      }
      req.body.invitationToken = invite.inviteToken;

    }
    if (req.body.invitationToken) {

      // find patient invite

      if (!invite) {

        invite = await PublicInvite.findOne({ inviteToken: req.body.invitationToken });
      }



      // If a consultation already exist, another one should not be created
      const existingConsultation = await Consultation.findOne({ invitationToken: req.body.invitationToken });
      if (existingConsultation) {

        return res.json(existingConsultation);
      }



      if (invite) {
        if (invite.scheduledFor) {
          if (invite.scheduledFor - Date.now() > 10 * 60 * 1000) {
            console.log('cant create consultation yet');
            return res.status(401).json({ success: false, message: 'Too early for consultation' });
          }
        }

        consultationJson.firstName = invite.firstName ? invite.firstName : 'No firstname';
        consultationJson.lastName = invite.lastName ? invite.lastName : 'No lastname';
        consultationJson.gender = invite.gender ? invite.gender : 'unknown';
        consultationJson.queue = invite.queue;
        consultationJson.doctor = invite.doctor;
        consultationJson.invite = invite.id;
        consultationJson.invitedBy = invite.invitedBy;

        consultationJson.IMADTeam = invite.IMADTeam || 'none';
        consultationJson.birthDate = invite.birthDate;

      }
    }


    if (invite) {

      // get translator and guest invites under this invite (guest / translator)
      const subInvites = await PublicInvite.find({ patientInvite: invite.id });

      if (subInvites.length) {
        // get users created by these invites (guest / translator)
        const guest = await User.findOne({ inviteToken: { in: subInvites.map(i => i.id) }, role: 'guest' });
        const translator = await User.findOne({ inviteToken: { in: subInvites.map(i => i.id) }, role: 'translator' });

        if (guest) {
          consultationJson.guest = guest.id;
        }
        if (translator) {
          consultationJson.translator = translator.id;
        }

      }
    }

    Consultation.create(consultationJson).fetch().then(async consultation => {
      console.log(consultation);
      await Consultation.changeOnlineStatus(req.user, true)
      if(!req.body.invitationToken && process.env.DEFAULT_QUEUE_ID){
        await Consultation.sendPatientReadyToQueue(consultation,  process.env.DEFAULT_QUEUE_ID)
      }else{
        if(invite && invite.queue && !invite.doctor){
          await Consultation.sendPatientReadyToQueue(consultation,  invite.queue)
        }else if(invite.doctor){
          const doctor = await User.findOne({ id: invite.doctor });
          await Consultation.sendPatientReadyToDoctor(consultation, doctor)
        }
      }

      res.json(consultation);
    }).catch(err => {
      console.log('ERROR WHILE CREATING CONSULTATION', err);
      const error = err && err.cause ? err.cause : err;
      res.status(400).json(error);
    });
  },

  async acceptConsultation (req, res) {

    const consultation = await Consultation.updateOne({
      id: req.params.consultation,
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

    Consultation.getConsultationParticipants(consultation).forEach(participant => {

      sails.sockets.broadcast(participant, 'consultationAccepted', {
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
    });


    return res.status(200).json({
      message: 'success'
    });
  },


  async closeConsultation (req, res) {

    try {


      const consultation = await Consultation.findOne({
        id: req.params.consultation
      });
      if (!consultation || consultation.status !== 'active') {
        const anonymousConsultation = await AnonymousConsultation.find({consultationId: req.params.consultation})
        if(anonymousConsultation){
          return res.status(200).json(anonymousConsultation);
        }else{
          return res.notFound();
        }
      }

      // end any ongoing calls
      const selector = {
        consultation: req.params.consultation,
        type: { in: ['videoCall', 'audioCall'] },
        status: { in: ['ringing', 'ongoing'] }
      };



      const [call] = await Message.find({ where: selector, sort: [{ createdAt: 'DESC' }] }).limit(1);

      if(call){
          await Message.endCall(call, consultation, 'CONSULTATION_CLOSED');
      }
      await Consultation.closeConsultation(consultation);



      return res.status(200).json(consultation);

    } catch (error) {
      sails.log('error ', error);
    }
  },

  async testCall (req, res) {
    try {


      const mediasoupServers = await sails.helpers.getMediasoupServers();

      const serverIndex = Math.floor(Math.random() * mediasoupServers.length);

      const mediasoupServer = mediasoupServers[serverIndex]
      const roomIdPeerId = 'test_'+ uuidv1();
      const token = await sails.helpers.getMediasoupToken.with({roomId: roomIdPeerId, peerId: roomIdPeerId, server: mediasoupServer})

      return res.json({ token, peerId:roomIdPeerId });

    } catch (err) {
      console.error(err);
    }


  },

  async call (req, res) {
    try {

      const mediasoupServers = await sails.helpers.getMediasoupServers();

      const serverIndex = Math.floor(Math.random() * mediasoupServers.length);

      const mediasoupServer = mediasoupServers[serverIndex]

      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });
      console.log('Got consultation', consultation.id);


      const callerToken = await sails.helpers.getMediasoupToken.with({roomId: consultation.id, peerId: req.user.id, server: mediasoupServer})


      const calleeId = (req.user.id === consultation.owner) ? consultation.acceptedBy : consultation.owner;

      const patientToken = await sails.helpers.getMediasoupToken.with({roomId: consultation.id, peerId: calleeId, server: mediasoupServer});


      // the current user
      const user = await User.findOne({
        id: req.user.id
      });


      console.log('Callee id', calleeId);

      // create a new message
      const msg = await Message.create({
        type: (req.query.audioOnly === 'true') ? 'audioCall' : 'videoCall',
        consultation: req.params.consultation,
        from: req.user.id,
        to: calleeId,
        participants: [req.user.id],
        isConferenceCall: !!((consultation.translator || consultation.guest)),
        status: 'ringing',
        mediasoupURL: mediasoupServer.url
      }).fetch();

      await Message.addToCollection(msg.id, 'participants', req.user.id);
      await Message.addToCollection(msg.id, 'currentParticipants', req.user.id);

      const patientMsg = Object.assign({}, msg);
      patientMsg.token = patientToken;



      console.log('SEND CALL TO', calleeId);
      sails.sockets.broadcast(calleeId, 'newCall', {
        data: {
          consultation: req.params.consultation,
          token: patientToken,
          id: req.params.consultation,
          user: {
            firstName: user.firstName,
            lastName: user.lastName
          },
          audioOnly: req.query.audioOnly === 'true',
          msg: patientMsg
        }
      });

      if (consultation.translator) {
        const translatorToken = await sails.helpers.getMediasoupToken.with({roomId: consultation.id, peerId: consultation.translator, server: mediasoupServer});
        const translatorMsg = Object.assign({}, msg);
        translatorMsg.token = translatorToken;

        sails.sockets.broadcast(consultation.translator, 'newCall', {
          data: {
            consultation: req.params.consultation,
            token: translatorToken,
            id: req.params.consultation,
            audioOnly: req.query.audioOnly === 'true',
            msg: translatorMsg
          }
        });

      }

      if (consultation.guest) {
        const guestToken = await sails.helpers.getMediasoupToken.with({roomId: consultation.id, peerId: consultation.guest, server: mediasoupServer});
        const guestMsg = Object.assign({}, msg);
        guestMsg.token = guestToken;

        sails.sockets.broadcast(consultation.guest, 'newCall', {
          data: {
            consultation: req.params.consultation,
            token: guestToken,
            id: req.params.consultation,
            audioOnly: req.query.audioOnly === 'true',
            msg: guestMsg
          }
        });

      }

      msg.token = callerToken;
      return res.json({
        token: callerToken,
        id: req.params.consultation,
        msg
      });

    } catch (error) {
      console.error(error);
      return res.json(error);
    }
  },

  async rejectCall (req, res) {
    try {
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });


      const message = await Message.findOne({ id: req.params.message }).populate('currentParticipants')

      // if conference remove them from participants
      if (message.isConferenceCall) {

        if (!message.currentParticipants.length || message.status === 'ended') {

          return res.json({
            status: 200
          });
        }

        await Message.removeFromCollection(message.id, 'currentParticipants', req.user.id);
        // if this is the last participant end the call and destroy the session
        const isParticipant = message.currentParticipants.find(p => p.id === req.user.id);

        if (req.user.role === 'doctor' && isParticipant) {
          await Message.endCall(message, consultation, 'DOCTOR_LEFT');

        } else
        // and set closed at
        if (message.currentParticipants.length <= 2 && isParticipant) {
          await Message.endCall(message, consultation, 'MEMBERS_LEFT');

        }

        return res.json({
          status: 200
        });
      }

      await Message.updateOne({
        id: req.params.message,
        consultation: req.params.consultation
      })
      .set({
        closedAt: new Date()
      });

      await Message.endCall(message, consultation, 'MEMBERS_LEFT');

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


  async acceptCall (req, res) {
    try {
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });

      const message = await Message.findOne({ id: req.params.message }).populate('currentParticipants').populate('participants');


      // add them once to the participants list
      if(!message.participants.find(p=> p.id === req.user.id)){
        await Message.addToCollection(req.params.message, 'participants', req.user.id);
      }
      // if conference remove them from participants
      if (message.isConferenceCall) {
        await Message.addToCollection(req.params.message, 'currentParticipants', req.user.id);

        // if message doesn't have accepted At add it and set status to ongoing
        if (!message.acceptAt) {
          await Message.updateOne({
            _id: req.params.message,
            consultation: req.params.consultation
          })
            .set({
              acceptedAt: new Date(),
              status: 'ongoing'
            });

        }
        return res.json({
          status: 200
        });
      }
      await Message.updateOne({
        _id: req.params.message,
        consultation: req.params.consultation
      })
        .set({
          acceptedAt: new Date(),
          status: 'ongoing'
        });


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

  uploadFile (req, res) {
    const fileId = uuidv1();
    const filePath = `${req.params.consultation}_${fileId}${req.headers['mime-type'].split('/')[1] ? `.${req.headers['mime-type'].split('/')[1]}` : ''}`;
    req.file('attachment')
      .upload({
        dirname: sails.config.globals.attachmentsDir,
        saveAs: filePath
      }, async function whenDone (err, uploadedFiles) {
        if (err) {
          return res.status(500).send(err);
        } else {
          sails.log('uploaded ', uploadedFiles);
          if (!uploadedFiles[0]) { return res.status(400); }

          try {
            if (process.env.NODE_ENV !== 'development') {
              // eslint-disable-next-line camelcase
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

  async attachment (req, res) {
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

  sendReport (req, res) {
    const filePath = `${uuidv1()}.pdf`;

    req.file('report')
      .upload({
        dirname: './.tmp',
        saveAs: filePath
      }, async function whenDone (err, uploadedFiles) {
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
            });

          } catch (error) {
            res.send(500);
          }

        }
      });

  },

  async patientFeedback (req, res) {
    try {
      await Consultation.updateOne({
        id: req.body.consultationId
      }).set({
        patientRating: req.body.rating || '',
        patientComment: req.body.comment
      });
      await AnonymousConsultation.updateOne({
        consultationId: req.body.consultationId
      }).set({
        patientRating: req.body.rating || '',
        patientComment: req.body.comment
      });
      res.json({ status: 200 });
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  async doctorFeedback (req, res) {
    try {
      await Consultation.updateOne({
        id: req.body.consultationId
      }).set({
        doctorRating: req.body.rating || '',
        doctorComment: req.body.comment
      });
      await AnonymousConsultation.updateOne({
        consultationId: req.body.consultationId
      }).set({
        doctorRating: req.body.rating || '',
        doctorComment: req.body.comment
      });
      res.json({ status: 200 });
    } catch (error) {
      return res.status(500).json(error);
    }
  },


  async consultationsCSV (req, res) {

    const consultations = await AnonymousConsultation.find().populate('acceptedBy').populate('queue').populate('owner');
    const mappedConsultations = consultations.map(Consultation.getConsultationReport);

    const parser = new Json2csvParser({ fields: Consultation.columns.map(c => c.colName) }, { encoding: 'utf-8' });
    const csv = parser.parse(mappedConsultations);
    res.set({ 'Content-Disposition': 'attachment; filename="consultations_summary.csv"' });
    res.send(csv);

  },


  async getCurrentCall (req, res) {

    const selector = {
      consultation: req.params.consultation,
      type: { in: ['videoCall', 'audioCall'] },
      status: { in: ['ringing', 'ongoing'] }
    };



    const [call] = await Message.find({ where: selector, sort: [{ createdAt: 'DESC' }] }).limit(1);

    let mediasoupServer;
    if (call) {

      [mediasoupServer] = await MediasoupServer.find({ url: call.mediasoupURL }).limit(1);
      if (!mediasoupServer) {
        if (call.mediasoupURL === process.env.MEDIASOUP_URL) {
          mediasoupServer = {
            url: process.env.MEDIASOUP_URL,
            password: process.env.MEDIASOUP_SECRET,
            username: process.env.MEDIASOUP_USER
          }
        }
          else {
            return res.status(500).send();
          };
        }



      const token = await sails.helpers.getMediasoupToken.with({roomId: req.params.consultation, peerId: req.user.id, server: mediasoupServer})

      call.token = token;
    }
    res.status(200).json(call);
  },


  async getConsultationFromToken(req, res){
    const token = req.query.token;

    if(!token) {
      return res.status(400).json({
        message: 'invalidUrl'
      });
    }

    jwt.verify(
      token,
      sails.config.globals.APP_SECRET,
      async (err, decoded) => {
        if (err) {
          if (err.name == 'TokenExpiredError') {
            return res.status(400).json({
              message: 'tokenExpired'
            });
          }
          return res.status(500).json({success:false, message: 'Something went wrong'});
        }
        const consultation = await Consultation.findOne({id: decoded.consultationId});
        if(!consultation) {
          return res.status(400).json({
            message: 'invalidUrl'
          });
        }
        const queue = await Queue.findOne({id: consultation.queue});
        return res.status(200).json({id: consultation.id, status: consultation.status, queue});
      });
  },

  async planConsultation (req, res) {
    const {token, delay} = req.body

    if(!delay || delay>60 || delay<0) {
      return res.status(400).json({
        message: 'invalidDelay'
      });
    }


    if(!token) {
      return res.status(400).json({
        message: 'invalidUrl'
      });
    }

      jwt.verify(
        token,
        sails.config.globals.APP_SECRET,
        async (err, decoded) => {
          if (err) {
            if (err.name == 'TokenExpiredError') {
              return res.status(400).json({
                message: 'tokenExpired'
              });
            }
            return res.status(500).json({success:false, message: 'Something went wrong'});
          }
          const consultation = await Consultation.findOne({id: decoded.consultationId}).populate('invite');
          if(!consultation) {
            return res.status(400).json({

              message: 'invalidUrl'
            });

          }
          if(consultation.status !== 'pending') {
            return res.status(400).json({
              message: 'alreadyStarted'
            });

          }

          const doctor = await User.findOne({id: decoded.doctorId});
          if(!doctor) {
            return res.status(400).json({
              message: 'invalidUrl'
            });
          }

           const updatedConsultation = await Consultation.updateOne({
            id: decoded.consultationId,
            status: 'pending'
          })
            .set({
              status: 'active',
              acceptedBy: decoded.doctorId,
              acceptedAt: new Date()
            });

          Consultation.getConsultationParticipants(consultation).forEach(participant => {

            sails.sockets.broadcast(participant, 'consultationAccepted', {
              data: {
                consultation,
                _id: consultation.id,
                doctor: {
                  firstName: doctor.firstName,
                  lastName: doctor.lastName,
                  phoneNumber: doctor.phoneNumber ? doctor.phoneNumber : ''
                }
              }
            });
          });

          const patientLanguage = (consultation.invite && consultation.invite.patientLanguage)?
          consultation.invite.patientLanguage:
           process.env.DEFAULT_PATIENT_LOCALE;
          const doctorDelayMsg = sails._t(patientLanguage, 'doctor delay in minutes', { delay, patientLanguage, branding: process.env.BRANDING })
          const message = await Message.create({
            text:doctorDelayMsg,
            consultation: decoded.consultationId,
            type: 'text',
            to: consultation.owner
          }).fetch();
          await Message.afterCreate(message, (err, message) => {});


          return res.status(200).json({
            message: 'success'
          });


        })

  }
};

