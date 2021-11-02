'use strict'
const fs = require('fs');

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

function getDate(date,mode=false) {
  let y = date.getFullYear();
  let m = date.getMonth();
  let d = date.getDate();
  let h = date.getHours();
  let mm = date.getMinutes();
  let s = date.getSeconds();

  if (mode)
  return y+'.'+m+'.'+d+' '+h+':'+mm+':'+s;
  else {
    return h+':'+mm+':'+s;
  }
}

class Log {
  filename = 'all.log';
  file = null;

  constructor (filename){
    this.filename = filename;
    this.file = fs.createWriteStream(this.filename,{flags:'a'});
    console.log('Log file: '+filename);

    return this;
  };

  log(key,params) {
    console.log(key);
    this.file.write(key+'\n');
  };
};

function getRTP(ari,appname,rtpserver,port,ch) {
  return new Promise((res,rej)=>{
  let wch = ari.Channel();
  let lch = ari.Channel();
  let bridje = ari.Bridge();

  bridje.create({type: 'mixing'}).then(function(br){
    console.log('Create bridge: %s', br.id);
    lch.originate({
      endpoint: 'Local/12345@from-internal',
      app: appname,
      variables: {}
    }).then(function(channel){
      console.log('Created lch channel: %s', lch.id);
      let external_host = rtpserver + ':' + port;
      console.log('RTP server: %s', external_host);
      wch.externalMedia({
        app: appname,
        external_host: external_host,
        format: 'slin16'
      }).then(function(){
        console.log('Create WS Channel: %s', wch.id);
      }).catch(function(err){
        console.log('Error make WS originate %O', err);
        throw err
      });
    }).catch(function(err){
      console.log('Error make Local originate %O', err);
      throw err
    });
  }).catch(function(err){
    console.log('Error create bridge %O', err);
    throw err
  });

  lch.once('StasisStart', function (event, chan) {
    console.log('StasisStart lch channel id/name: %s / %s', lch.id, lch.name);
    chan.mute({direction: 'both'});
    bridje.addChannel({channel: [lch.id]}).then(function(){
      console.log('Added lch channel to bridge: %O / %O', lch.id, lch.name);
    }).catch(function(){
      console.log('Error add lch channel in bridge %O', err);
      throw err
    })
  })

  wch.once('StasisStart', function (event, chan) {
    console.log('StasisStart wschannel id/name: %s / %s', wch.id, wch.name);
    bridje.addChannel({channel: wch.id}).then(function(){
      console.log('Added wch channel in bridge: %O / %O', wch.id, wch.name);

      bridje.addChannel({channel: ch.id}).then(function(){
        //let recording = outgoing.LiveRecording(outgoing, {name: './111.wav'});
        //outgoing.record({name: recording.name, format: 'wav', beep: true, ifExists: 'overwrite'});
        console.log('Added client channel to bridge: %s / %s', ch.id, ch.name);
        //usrv = new udpserver.RtpUdpServerSocket(IP_RTPSERVER + ':' + port,recognizeStream);
        res();
        //let date_answer = getDate(new Date());
      }).catch(function(err){
        console.log('Error add client channel in bridge %O', err);
        throw err
      })
    }).catch(function(e){
      console.log('Error add wch chanel in bridge %O', e);
      throw e
    })
  })
})
}

module.exports.sleep = sleep
module.exports.Log = Log
module.exports.getRTP = getRTP
