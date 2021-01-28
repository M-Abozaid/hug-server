
const parseInviteId = require('./utils/parseInviteId')

module.exports = async function (req, res, proceed) {

  const ownerFilter = {

    type: 'PATIENT',

  }

  let queues = [];
  if (req.user.allowedQueues && req.user.allowedQueues.length > 0) {
    queues = req.user.allowedQueues.map(q => q.id);
  } else if (req.user.viewAllQueues) {
    queues = await Queue.find({});
    queues = queues.map(q => q.id);
  }

  ownerFilter.or = [
    {
      doctor: req.user.id
    },
    {

      queue: queues
    },
    {
      invitedBy: req.user.id
    }
  ]

  const inviteId = parseInviteId(req, res)
  if(inviteId){
    ownerFilter.id = inviteId
    const exists = await PublicInvite.count(ownerFilter)
    if(!exists){
      return res.notFound()
    }
  }else{
    req.query.where = JSON.stringify(ownerFilter);
  }

  return proceed();

};
