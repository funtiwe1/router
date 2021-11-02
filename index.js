
'use strict';

const client = require('ari-client');
const fs = require('fs');
const sleep = require('./utils.js').sleep
const Log = require('./utils.js').Log
const udpserver = require('./udpserver')
const asr = require('./speech').asr_s
const tts = require('./speech').tts_f

const IP_RTPSERVER = '5.189.230.61';
const IP_ASTERSERVER = '5.189.230.61';
const APPNAME = 'router';



client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (e, ari) {
  //client.connect('http:\/\/' + IP_ASTERSERVER + ':8088', 'amd', '57d5cf235bc84181cb101335ce689eba',function (err, ari) {
  let log = new Log('router.log');
  if (e) {
    log.log('Error connect asterisk ari')
    log.log(e.message);
    return;
  }

  log.log('Connected to asterisk');
  ari.start(APPNAME);
  log.log('Started '+APPNAME+' app');

  //

  let curport = 8010;
  //let external_host = IP_RTPSERVER + ':' + port;

  ari.on('StasisStart', async (event, outgoing)=> {
    log.log('StasisStart %s',outgoing.id);
    let rs = null;
    let usrv = null;
    let text = 'Вы находитесь в главном меню. Для выбора приложения введите цифру. Один - повторялка. Два - АМД!';
    let filename = 'del_'+new Date().getTime();
    let port = curport++;

    try {
      filename = await tts(text,filename,'\/var/spool\/asterisk\/recording\/');
    } catch(e){
      log.log('Error get tts');
      throw new Error(e.message);
    }

    let playback = new ari.Playback();
    outgoing.play({media:'recording:'+filename},playback)
    .then(async ()=>{
      //record();
      playback.on('PlaybackFinished',async ()=>{
        record();
      });
      log.log('Started play');
    }).catch((e)=>{
      throw new Error(e.message);
    });

    function record() {
      log.log('Finished play');
      getRTP(ari,APPNAME,IP_RTPSERVER,port)
      .then((d)=>{
        usrv = new udpserver.RtpUdpServerSocket(IP_RTPSERVER + ':' + port,rs);
        try {
          rs = asr();
          rs.on('data',(d)=>{
            log.log(d);
            let r = d.results[0].alternatives[0].transcript;
            if (!r) return;
            log.log(r);
            switch (r) {
              case 'Повторялка':break;
              case 'Автоответчики': break;
              default:{
                let playback = new ari.Playback();
                outgoing.play({media:'recording:'+filename},playback);
              };
            }
          });
        } catch(e) {
          log.log('Error get asr');
          throw new Error(e.message);
        }
      });
    }

    outgoing.once('StasisEnd', function (event, ch) {
      log.log('StasisEnd: '+ch.id);
    });

    outgoing.once('ChannelHangupRequest', (e,ch)=>{

    });
  });
})
