const parseInviteId = require('./utils/parseInviteId')
module.exports = async function (req, res, proceed) {

  const inviteId =  parseInviteId(req, res)

  if(!inviteId){
    return res.notFound()
  }
  let invite;
  const {role} = req.user

  if (role === 'doctor') {

    invite = await invite.count({
      id: inviteId,
      or: [
        { invitedBy: req.user.id },
        { doctor: req.user.id  }
      ]
    });

  }else if(role === 'scheduler'){
    invite = await invite.count({
      id: inviteId,
      invitedBy: req.user.id
    });
  }

  if (!invite) {

    return res.forbidden();
  }

  return proceed();
};
