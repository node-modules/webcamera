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
  rootServer: '10.232.4.44:3800',
  imageServers: [
    'img01.daily.taobaocdn.net',
    'img02.daily.taobaocdn.net',
  ],
};

var camera;
var noTFSCamera;
describe('lib/web_camera.js', function () {
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
  });

  describe('#shot', function () {
    it('should shot default ok', function (done) {
      camera.shot('www.baidu.com', function (err, data) {
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });
    });

    it('should shot to path ok', function (done) {
      camera.shot('www.baidu.com', './baidu.png', function (err, data) {
        data.should.include('baidu.png');
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });      
    });

    it('should shot with options ok', function (done ) {
      camera.shot('www.baidu.com', {
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
      camera.shot('www.baidu.com', 'baidu.gif', {}, function (err, data) {
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
      camera.shotStream('www.baidu.com', function (err, s) {
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
      camera.shotStream('www.baidu.com', {mimeType: 'jpg', clipRect: {top: 100, left: 100, width: 100, height: 100}}, function (err, s) {
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
      noTFSCamera.shotTFS('www.baidu.com', 320, function (err) {
        err.message.should.equal('TFS not inited');
        done();
      });
    });

    it('should shotTFS default ok', function (done) {
      camera.shotTFS('www.baidu.com', 320, function (err, data) {
        data.should.have.keys('name', 'size', 'url');
        data.name.should.include('.png');
        data.size.should.above(30000);
        done(err);
      });
    });

    it('should shotTFS error of tfs error', function (done) {
      mm.error(camera.tfsClient, 'uploadFile', 'mock error');
      camera.shotTFS('www.baidu.com', 320, function (err) {
        err.message.should.equal('mock error');
        done();
      });
    });

    it('should shotTFS default ok', function (done) {
      camera.shotTFS('www.baidu.com', 320, 'baidu.png', {
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

  describe('overload', function () {
    afterEach(mm.restore);
    it('should emit overload', function (done) {
      mm(camera, 'workerNum', 1);
      done = pedding(3, done);
      camera.once('overload', function (num) {
        num.should.equal(1);
        done();
      });
      camera.shotStream('www.baidu.com', function (err, s) {
        should.not.exist(err);
        done();
      });
      camera.shotStream('www.baidu.com', function (err, s) {
        should.not.exist(err);
        done();
      });
    });
  });
});