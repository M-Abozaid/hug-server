/**
 * ConsultationController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const ObjectId = require('mongodb').ObjectID;
const { OpenVidu } = require('openvidu-node-client');
const openvidu = new OpenVidu(sails.config.OPENVIDU_URL, sails.config.OPENVIDU_SECRET);
const ROLE_DOCTOR = 'doctor';
const ROLE_NURSE= 'nurse';

module.exports = {
  consultationOverview: async function(req, res){
    let match = [{
      'owner': new ObjectId(req.headers.id)
    }];
    if(req.user.role === 'doctor'){
      match = [
        {
          'acceptedBy': new ObjectId(req.headers.id)
        },
        {
          'status':'pending'
        }
      ];
    }

    const agg = [
      {
        '$match':{
          '$or':match
        }
      },
      {
        '$project':{
          'consultation':'$$ROOT'
        }
      },
      {
        '$lookup':{
          'from':'message',
          'localField':'_id',
          'foreignField':'consultation',
          'as':'messages'
        }
      },
      {
        '$project':{
          'consultation':1,
          'lastMsg':{
            '$arrayElemAt':[
              '$messages',
              -1
            ]
          },

          'messages':1,

        }
      },
      {
        '$project':{
          'consultation':1,
          'lastMsg':1,
          'messages':{
            '$filter':{
              'input':'$messages',
              'as':'msg',
              'cond':{
                '$and':[
                  {'$eq':[
                    '$$msg.read',
                    false
                  ]},
                  { '$or':[{'$eq':[
                    '$$msg.to',
                    new ObjectId(req.headers.id)
                  ]},{'$eq':[
                    '$$msg.to',
                    null
                  ]}]
                  }
                ]
              }
            }
          }
        }
      },
      {
        '$project':{

          'consultation':1,
          'lastMsg':1,
          'unreadCount':{
            '$size':'$messages'
          }
        }
      },
      {
        '$lookup':{
          'from':'user',
          'localField':'consultation.owner',
          'foreignField':'_id',
          'as':'nurse'
        }
      }
    ];

    const db = sails.models.consultation.getDatastore().manager;

    const consultationCollection = db.collection('consultation');
    let results =  await consultationCollection.aggregate(agg);

    res.json(await results.toArray());

  },

  acceptConsultation: async function(req, res){


    let consultation = await sails.models.consultation.updateOne({ _id: req.params.consultation, status:'pending' })
    .set({
      status:'active',
      acceptedBy: req.user.id,
      acceptedAt: Date.now()
    });


    if(!consultation){
      return res.notFound();
    }

    sails.sockets.broadcast(consultation.owner, 'consultationAccepted', {data:{ consultation, _id: consultation.id}});

    res.status(200);
    return res.json({message: 'success'});
  },

  closeConsultation: async function(req, res){


    let consultation = await sails.models.consultation.updateOne({ _id: req.params.consultation, status:'active' })
    .set({
      status:'closed',
      closedAt: Date.now()
    });


    if(!consultation){
      return res.notFound();
    }

    res.status(200);
    return res.json({message: 'success'});
  },


  call: async function(req, res){
    try {
      const consultation = await sails.models.consultation.findOne({ _id: req.params.consultation });
      const callerSession = await openvidu.createSession({customSessionId:req.params.consultation});
      const callerToken = await callerSession.generateToken();

      const calleeSession = await openvidu.createSession({customSessionId:req.params.consultation});
      const calleeToken = await calleeSession.generateToken();

      const user = await sails.models.user.findOne({id: req.headers.id });
      // call from nurse
      const data = { consultation:req.params.consultation, token:calleeToken, id: calleeSession.id, user:{ firstName: user.firstName, lastName: user.lastName}};
      if(req.headers.id === consultation.owner){
        sails.sockets.broadcast(consultation.acceptedBy, 'newCall', { data });
      }else if(req.headers.id === consultation.acceptedBy){
        sails.sockets.broadcast(consultation.owner, 'newCall', { data });
      }

      return res.json({ token:callerToken, id: callerSession.id });

    } catch (error) {
      return res.json(error);
    }
  },

  rejectCall: async function(req, res){
    try {
      const consultation = await sails.models.consultation.findOne({ _id: req.params.consultation });
      // call rejected by nurse
      if(req.headers.id === consultation.owner){
        sails.sockets.broadcast(consultation.acceptedBy, 'rejectCall', {data:{ consultation }});
      }else if(req.headers.id === consultation.acceptedBy){
        sails.sockets.broadcast(consultation.owner, 'rejectCall', {data:{ consultation }});
      }

      res.json({status:200});
    } catch (error) {
      return res.json(error);
    }

  }

};
