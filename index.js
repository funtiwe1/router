
'use strict';

const client = require('ari-client');
const fs = require('fs');
const sleep = require('./utils.js').sleep
const Log = require('./utils.js').Log
const asr = require('./speech').asr_s
const tts = require('./speech').tts_f
const getRTP = require('./utils').getRTP
const IVR = require('./ivr').IVR

const IP_RTPSERVER = '5.189.230.61';
const IP_ASTERSERVER = '5.189.230.61';
const APPNAME = 'router';



client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (e, ari) {
  //client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (err, ari) {
  let log = new Log('router.log');
  let curport = 8010;
  let text = 'Вы находитесь в главном меню. Для выбора приложения введите цифру. Один - повторялка. Два - АМД!';
  let ivr = null;

  if (e) {
    log.log('Error connect asterisk ari')
    log.log(e.message);
    return;
  }

  log.log('Connected to asterisk');
  ari.start(APPNAME);
  log.log('Started '+APPNAME+' app');

  ari.once('StasisStart', async (event, outgoing)=> {
    log.log('StasisStart %s',outgoing.id);
    try {
      ivr = new IVR(ari,curport++,outgoing,APPNAME,IP_RTPSERVER);
    } catch(e) {
      log.log('Error create IVR '+e.message);
      return;
    }

    ivr.play(text,log)
    .then((d)=>{
      ivr.record(5000,log)
      .then((d)=>{
        //log.log(d);
        switch (d) {
          case 'Повторялка':outgoing.move({app:'ivr'});break;
          case 'Автоответчики': outgoing.move({app:'amd'});break;
          default:{
            //let playback = new ari.Playback();
            outgoing.move({app:'amd'}).catch((e)=>{log.log(e)});
            //outgoing.play({media:'recording:'+filename},playback);
          };
        }
      })
    })

    outgoing.once('StasisEnd', function (event, ch) {
      log.log('StasisEnd: '+ch.id);
      ivr.close();
    });

    outgoing.once('ChannelHangupRequest', (e,ch)=>{

    });
  });
})
