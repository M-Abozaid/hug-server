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

const _ = require('@sailshq/lodash');


const db = Consultation.getDatastore().manager;


const columns = [
  { colName: 'Invitation envoyée le', key: 'inviteCreatedAt' },
  { colName: 'Consultation planifiée le', key: 'inviteScheduledFor' },
  { colName: 'File d\'attente', key: 'queue.name' },
  { colName: 'Patient consultation demandée à', key: 'consultationCreatedAt' },
  { colName: 'IMAD equipe', key: 'IMADTeam' },
  { colName: 'Consultation clôturée le', key: 'closedAt' },
  { colName: 'Total appel avec réponse', key: 'successfulCallsCount' },
  { colName: 'Total appel sans réponse', key: 'missedCallsCount' },
  { colName: 'Moyenne durée appel', key: 'averageCallDuration' },
  { colName: 'Patient taux satisfaction', key: 'patientRating' },
  { colName: 'Patient satisfaction message', key: 'patientComment' },
  { colName: 'Docteur taux satisfaction', key: 'doctorRating' },
  { colName: 'Docteur satisfaction message', key: 'doctorComment' },
  { colName: 'Department', key: 'acceptedBy.department' },
  { colName: 'Function', key: 'acceptedBy._function' },
  { colName: 'Docteur ID', key: 'acceptedBy.id' }


];





// saveAnonymousDetails()
module.exports = {
  async consultationOverview (req, res) {


    let match = [{
      owner: new ObjectId(req.user.id)
    }];
    if (req.user && req.user.role === 'doctor') {

      match = [{
        acceptedBy: new ObjectId(req.user.id)
      }, {
        invitedBy: new ObjectId(req.user.id),
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
          firstName:-1, email:-1
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
        consultationJson.invitedBy = invite.invitedBy;
        consultationJson.invite = invite.id;


      }
    } else if (process.env.DEFAULT_QUEUE_ID) {
      const queuesUsersCollection = db.collection('queue_allowedQueues_queue__user_allowedQueues');
      const results = await queuesUsersCollection.find({ queue_allowedQueues_queue: new ObjectId(process.env.DEFAULT_QUEUE_ID) });

      const queuesUsers = await results.toArray();
      const userCollection = db.collection('user');
      const doctorsCurs = await userCollection.find({ role: 'doctor', $or: [{ viewAllQueues: true }, { _id: { $in: queuesUsers.map(qu => new ObjectId(qu.user_allowedQueues)) } }] });

      const doctors = await doctorsCurs.toArray();

      doctors.forEach(async doctor => {
        if (doctor && doctor.enableNotif && doctor.notifPhoneNumber) {
          a = await sails.helpers.sms.with({
            phoneNumber: doctor.notifPhoneNumber,
            message: `Un patient est dans la file d'attente`
          });
        }
      });
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

      res.json(consultation);
    }).catch(err => {
      console.log('ERROR WHILE CREATING CONSULTATION', err);
      const error = err && err.cause ? err.cause : err;
      res.status(400).json(error);
    });
  },

  async acceptConsultation (req, res) {

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
        return res.notFound();
      }
      await Consultation.closeConsultation(consultation);


      res.status(200);
      return res.json(consultation);

    } catch (error) {
      sails.log('error ', error);
    }
  },

  async testCall (req, res) {
    try {

      const data1 = {};
      data1['mediaMode'] = 'ROUTED';
      data1['recordingMode'] = 'MANUAL';
      data1['RECORDING_LAYOUT'] = 'BEST_FIT';
      data1['recordingLayout'] = 'BEST_FIT';

      const openviduServers = await sails.helpers.openviduServer();

      const serverIndex = Math.floor(Math.random() * openviduServers.length);

      const openvidu = new OpenVidu(openviduServers[serverIndex].url, openviduServers[serverIndex].password);

      const session = await openvidu.createSession(data1);
      const token = await session.generateToken();

      console.log('sessoin tokens', session, token);
      return res.json({ token });
    } catch (err) {
      console.error(err);
    }


  },

  async call (req, res) {
    try {

      const openviduServers = await sails.helpers.openviduServer();

      const serverIndex = Math.floor(Math.random() * openviduServers.length);

      const openvidu = new OpenVidu(openviduServers[serverIndex].url, openviduServers[serverIndex].password);

      // the consultation this call belongs to
      console.log('Start call');
      const consultation = await Consultation.findOne({
        _id: req.params.consultation
      });
      console.log('Got consultation', consultation.id);
      const session = await openvidu.createSession({
        customSessionId: req.params.consultation
      });
      console.log('Caller session', session);

      const callerToken = await session.generateToken();
      console.log('Caller token', callerToken);


      const patientToken = await session.generateToken();
      console.log('callee token', patientToken);


      // the current user
      const user = await User.findOne({
        id: req.user.id
      });


      const calleeId = (req.user.id === consultation.owner) ? consultation.acceptedBy : consultation.owner;
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
        openViduURL: openviduServers[serverIndex].url
      }).fetch();

      const patientMsg = Object.assign({}, msg);
      patientMsg.token = patientToken;



      console.log('SEND CALL TO', calleeId);
      sails.sockets.broadcast(calleeId, 'newCall', {
        data: {
          consultation: req.params.consultation,
          token: patientToken,
          id: session.id,
          user: {
            firstName: user.firstName,
            lastName: user.lastName
          },
          audioOnly: req.query.audioOnly === 'true',
          msg: patientMsg
        }
      });

      if (consultation.translator) {
        const translatorToken = await session.generateToken();
        const translatorMsg = Object.assign({}, msg);
        translatorMsg.token = translatorToken;

        sails.sockets.broadcast(consultation.translator, 'newCall', {
          data: {
            consultation: req.params.consultation,
            token: translatorToken,
            id: session.id,
            audioOnly: req.query.audioOnly === 'true',
            msg: translatorMsg
          }
        });

      }

      if (consultation.guest) {
        const guestToken = await session.generateToken();
        const guestMsg = Object.assign({}, msg);
        guestMsg.token = guestToken;

        sails.sockets.broadcast(consultation.guest, 'newCall', {
          data: {
            consultation: req.params.consultation,
            token: guestToken,
            id: session.id,
            audioOnly: req.query.audioOnly === 'true',
            msg: guestMsg
          }
        });

      }

      msg.token = callerToken;
      return res.json({
        token: callerToken,
        id: session.id,
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


      const message = await Message.findOne({ id: req.params.message }).populate('participants');

      // if conference remove them from participants
      if (message.isConferenceCall) {

        if (!message.participants.length || message.status === 'ended') {

          return res.json({
            status: 200
          });
        }

        await Message.removeFromCollection(message.id, 'participants', req.user.id);
        // if this is the last participant end the call and destroy the session
        const isParticipant = message.participants.find(p => p.id === req.user.id);

        if (req.user.role === 'doctor' && isParticipant) {
          await Message.endCall(message, consultation, 'DOCTOR_LEFT');

        } else
        // and set closed at
        if (message.participants.length <= 2 && isParticipant) {
          await Message.endCall(message, consultation, 'MEMBERS_LEFT');

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

      const message = await Message.findOne({ id: req.params.message }).populate('participants');

      // if conference remove them from participants
      if (message.isConferenceCall) {
        await Message.addToCollection(req.params.message, 'participants', req.user.id);

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
    const mappedConsultations = consultations.map(consultation => {
      if (consultation.owner) {
        consultation.owner.name = `${consultation.owner.firstName } ${ consultation.owner.lastName}`;
      }
      if (consultation.acceptedBy) {
        consultation.acceptedBy.name = `${consultation.acceptedBy.firstName } ${ consultation.acceptedBy.lastName}`;
      }
      const mappedConsultation = {};
      columns.forEach(col => {
        mappedConsultation[col.colName] = _.get(consultation, col.key);
      });
      return mappedConsultation;
    });

    const parser = new Json2csvParser({ fields: columns.map(c => c.colName) }, { encoding: 'utf-8' });
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

    let openvidu;
    if (call) {

      const [openViduServer] = await OpenviduServer.find({ url: call.openViduURL }).limit(1);
      if (openViduServer) {

        openvidu = new OpenVidu(openViduServer.url, openViduServer.password);
      } else {
        if (call.openViduURL === sails.config.OPENVIDU_URL) {
          openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
        } else {
          return res.status(500).send();
        }
      }
      const session = await openvidu.createSession({
        customSessionId: req.params.consultation
      });
      const token = await session.generateToken();

      call.token = token;
    }
    res.status(200).json(call);
  }

};

