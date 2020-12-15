import config from '../config/config';
import cache from './cache';
const {Extra} = require('telegraf');
import * as db from './db';

/** Message template helper
 * @param {String} name
 * @param {Object} message
 * @param {Boolean} anon
 * @return {String} text
 */
function ticketMsg(name, message) {
  return `${config.language.dear} <b>`+
    `${name}</b>,\n\n`+
    `${message.text}\n\n`+
    `${config.language.regards}\n`+
    `${message.from.first_name}`;
}

/**
 * Private chat
 * @param {Object} bot
 * @param {Object} ctx
 */
function privateReply(bot, ctx) {
  ctx.session.mode = '';
  ctx.session.mode = 'private_reply';
  bot.telegram.sendMessage(
      ctx.session.modeData.userid, ticketMsg(` ${config.language.customer}`,
      // eslint-disable-next-line new-cap
          ctx.message), Extra.HTML());
}

/**
 * Reply to tickets in staff chat.
 * @param {context} ctx Bot context.
 * @param {bot} bot Bot object.
 */
function chat(ctx, bot) {
  let replyText = '';
  // check whether person is an admin
  if (!ctx.session.admin) {
    return;
  }
  // try whether a text or an image/video is replied to
  try {
    // replying to non-ticket
    if (ctx.message == undefined ||
      ctx.message.reply_to_message == undefined) {
      return;
    }
    replyText = ctx.message.reply_to_message.text;
    if (replyText === undefined) {
      replyText = ctx.message.reply_to_message.caption;
    }

    let userid = replyText.match(new RegExp('#T' +
        '(.*)' + ' ' + config.language.from));
    if (userid === null || userid === undefined) {
      userid = replyText.match(new RegExp('#T' +
          '(.*)' + '\n' + config.language.from));
    }

    db.check(userid[1], function(ticket) {
      const name = replyText.match(new RegExp(
          config.language.from + ' ' + '(.*)' + ' ' +
      config.language.language));
        // replying to non-ticket
      if (userid === null || ticket == undefined) {
        return;
      }
      cache.ticketStatus[userid[1]] = false;

      // To user
      bot.telegram.sendMessage(ticket.userid,
          ticketMsg(name[1], ctx.message),
          // eslint-disable-next-line new-cap
          Extra.HTML()
      );
      
      // To staff
      bot.telegram.sendMessage(ctx.chat.id,
          `${config.language.msg_sent} ${name[1]}`,
          // eslint-disable-next-line new-cap
          Extra.HTML().notifications(false)
      );
      console.log(`Answer: `+ ticketMsg(name[1], ctx.message));
      cache.ticketSent[userid[1]] = undefined;
      // close ticket
      db.add(userid[1], 'closed', undefined);
    });
  } catch (e) {
    console.log(e);
    bot.telegram.sendMessage(
        config.staffchat_id, `An error occured, please 
          report this to your admin: \n\n ${e}`,
        // eslint-disable-next-line new-cap
        Extra.HTML().notifications(false)
    );
  }
}

export {
  privateReply,
  chat,
};
