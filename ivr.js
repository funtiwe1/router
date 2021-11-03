'use strict'
const udpserver = require('./udpserver')
const speech = require('@google-cloud/speech')
const Log = require('./utils.js').Log
const asr = require('./speech').asr_s
const tts = require('./speech').tts_f
const getRTP = require('./utils').getRTP


const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'ru-RU';

// google request
const request_g = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: true, // If you want interim results, set this to true
};

class IVR {
  rs = null;
  usrv = null;
  ari = null;
  port = null;
  ch = null;
  appname = null;
  rtpserver = null;
  last_text = '';
  client = null;
  rs = null;

  constructor(ari,port,ch,appname,rtpserver) {
    this.ari = ari;
    this.port = port;
    this.ch = ch;
    this.appname = appname;
    this.rtpserver = rtpserver;

    this.client = new speech.SpeechClient();
    this.rs = this.client
    .streamingRecognize(request_g)
    .on('error', console.error)

    this.usrv = new udpserver.RtpUdpServerSocket(this.rtpserver + ':' + this.port,this.rs);
  }

  play(text,log) {
    return new Promise(async (res,rej)=>{
    let filename = 'del_'+new Date().getTime();
    try {
      filename = await tts(text,filename,'\/var/spool\/asterisk\/recording\/');
    } catch(e){
      log.log('Error get tts');
      throw new Error(e.message);
    }

    let playback = new this.ari.Playback();
    this.ch.play({media:'recording:'+filename},playback)
    .then(async ()=>{
      //record();
      playback.on('PlaybackFinished',async ()=>{
        log.log('Finished play');
        res();
      });
      log.log('Started play');
    }).catch((e)=>{
      throw new Error(e.message);
    });

  })
}

record(time,log){
  return new Promise((res,rej)=>{
      log.log('Start record');
      this.rs.on('data',(d)=>{
        this.last_text = d.results[0].alternatives[0].transcript;
        //log.log(rtext);
      });

      getRTP(this.ari,this.appname,this.rtpserver,this.port,this.ch)
      .then((d)=>{
        try {
          //rs = asr();

          setTimeout(()=>{
            //log.log(this.last_text);
            this.usrv.close();
            this.rs.end();
            if (!this.last_text) res(null);
            else res(this.last_text);
          },time);
        } catch(e) {
          log.log('Error get asr');
          throw new Error(e.message);
        }
      });
  })
}

close() {

}
}
module.exports.IVR = IVR;
