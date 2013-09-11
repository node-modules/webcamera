/*!
 * camera - test/web_camera.js
 * Author: dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */
var Camera = require('../');
var mm = require('mm');
var child_process = require('child_process');
var should = require('should');
var fs = require('fs');
var pedding = require('pedding');

var tfsOpts =  {
  appkey: 'tfscom',
  rootServer: 'restful-store.daily.tbsite.net:3800',
  imageServers: [
    'img01.daily.taobaocdn.net',
    'img02.daily.taobaocdn.net',
  ],
};

var camera = Camera.create({tfsOpts: tfsOpts});
var noTFSCamera;
describe('lib/web_camera.js', function () {
  afterEach(mm.restore);

  describe('#create', function () {
    it('should create use default', function (done) {
      noTFSCamera = Camera.create();
      should.not.exist(noTFSCamera.tfsClient);
      done();
    });

    it('should create use tfsClient', function (done) {
      camera = Camera.create({tfsClient: {mock: true}});
      camera.tfsClient.should.eql({mock: true});
      done();
    });

    it('should create use tfsOpts', function (done) {
      camera = Camera.create({tfsOpts: tfsOpts});
      done();
    });

    it('should create with wrong phantom path', function () {
      noTFSCamera = Camera.create({
        phantom: '/not/exist'
      });
      camera.phantom.should.equal('phantomjs');
    });
  });

  describe('#shot', function () {
    it('should shot default ok', function (done) {
      camera.shot(__filename, function (err, data) {
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });
    });

    it('should shot to path ok', function (done) {
      camera.shot(__filename, './baidu.png', function (err, data) {
        data.should.include('baidu.png');
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });      
    });

    it('should shot with options ok', function (done ) {
      camera.shot(__filename, {
        picPath: './baidu.jpg',
        clipRect: {
          top: 100,
          left: 100,
          width: 100,
          height: 100
        },
        renderDelay: 100
      }, function (err, data) {
        data.should.include('baidu.jpg');
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });
    });

    it('should shot with path and options ok', function (done) {
      camera.shot(__filename, 'baidu.gif', {}, function (err, data) {
        data.should.include('baidu.gif');
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);        
      });
    });

    it('should shot error of phantom', function (done) {
      camera.shot('www.zcxvk213123213.com', function (err, data) {
        err.message.should.equal('phantomjs exit with code 1');
        Array.isArray(err.args).should.be.ok;
        done();
      });      
    });
  });

  describe('#shotStream', function () {
    it('should shotStream default ok', function (done) {
      camera.shotStream(__filename, function (err, s) {
        var datas = [];
        var filePath = './test.png';
        var file = fs.createWriteStream(filePath, {encoding: 'binary'});
        s.on('data', function (data) {
          file.write(data.toString('binary'), 'binary');          
        });
        s.on('end', function () {
          fs.existsSync(filePath).should.be.ok;
          fs.unlinkSync(filePath);
          done();
        });
      });
    });

    it('should shotStream with options ok', function (done) {
      camera.shotStream(__filename, 
      {mimeType: 'jpg', clipRect: {top: 100, left: 100, width: 100, height: 100}}, function (err, s) {
        var datas = [];
        var filePath = './test.jpg';
        var file = fs.createWriteStream(filePath, {encoding: 'binary'});
        s.on('data', function (data) {
          file.write(data.toString('binary'), 'binary');          
        });
        s.on('end', function () {
          fs.existsSync(filePath).should.be.ok;
          fs.unlinkSync(filePath);
          done();
        });
      });
    });
  });
  
  describe('#shotTFS', function () {
    afterEach(mm.restore);

    it('should error of no tfs', function (done) {
      noTFSCamera.shotTFS(__filename, 320, function (err) {
        err.message.should.equal('TFS not inited');
        done();
      });
    });

    it('should shotTFS default ok', function (done) {
      camera.shotTFS(__filename, 320, function (err, data) {
        data.should.have.keys('name', 'size', 'url');
        data.name.should.include('.png');
        data.size.should.above(30000);
        done(err);
      });
    });

    it('should shotTFS error of tfs error', function (done) {
      mm.error(camera.tfsClient, 'uploadFile', 'mock error');
      camera.shotTFS(__filename, 320, function (err) {
        err.message.should.equal('mock error');
        done();
      });
    });

    it('should shotTFS default ok', function (done) {
      camera.shotTFS(__filename, 320, 'baidu.png', {
        script: function () {
          document.getElementById('kw').value = 'test script';
        },
        viewportSize: {
          width: 768,
          height: 420
        },
      }, function (err, data) {
        data.should.have.keys('name', 'size', 'url');
        data.name.should.equal('L1/1/321/baidu.png');
        data.size.should.above(20000);
        done(err);
      });
    });
  });

  describe('overload event', function () {
    it('should emit overload', function (done) {
      mm(camera, 'workerNum', 1);
      done = pedding(3, done);
      camera.once('overload', function (num) {
        console.log('overload', num);
        num.should.equal(1);
        done();
      });
      camera.shotStream(__filename, function (err, s) {
        should.not.exist(err);
        console.log('s1')
        done();
      });
      camera.shotStream(__filename, function (err, s) {
        should.not.exist(err);
        console.log('s2')
        done();
      });
    });
  });
});