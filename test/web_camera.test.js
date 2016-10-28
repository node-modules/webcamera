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

var qnOpts = {
  accessKey: 'test',
  secretKey: 'haha',
  bucket: 'test'
};

var camera;
var noTFSCamera;

describe('lib/web_camera.js', function () {
  afterEach(mm.restore);

  describe('#create', function () {
    it('should create use default', function () {
      noTFSCamera = Camera.create();
      should.not.exist(noTFSCamera.tfsClient);
    })

    it('should create use qnOpts', function () {
       camera = Camera.create({qnOpts: qnOpts});
    })

    it('should create with wrong phantom path', function () {
      noTFSCamera = Camera.create({
        phantom: '/not/exist'
      });
      camera.phantom.should.equal('phantomjs');
    });
  });

  describe('#shot', function () {
    it('should shot default ok', function (done) {
      camera.shot(__filename, function (err, data, pid) {
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        pid.should.be.number;
        pid.should.above(0);
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
        quality: 80,
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
        fs.statSync(data).size.should.above(0);
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
        should.not.exist(data);
        should.exist(err);
        err.message.should.equal('phantomjs exit with code 100, open url fail');
        Array.isArray(err.args).should.be.ok;
        done();
      });
    });

    it('should return when page has error', function(done) {
      camera = Camera.create();
      camera.shot('https://os.alipayobjects.com/rmsportal/UKYoZFxFsmwxVjB.html', './test.png', function (err, data) {
        data.should.include('test.png');
        fs.existsSync(data).should.be.ok;
        fs.unlinkSync(data);
        done(err);
      });
    });
  });

  describe('#shotStream', function () {
    it('should shotStream default ok', function (done) {
      camera.shotStream(__filename, function (err, s, pid) {
        var datas = [];
        var filePath = './test.png';
        s.should.have.property('pid').with.be.Number;
        var file = fs.createWriteStream(filePath, {encoding: 'binary'});
        s.on('data', function (data) {
          file.write(data.toString('binary'), 'binary');
        });
        s.on('end', function () {
          fs.existsSync(filePath).should.be.ok;
          fs.unlinkSync(filePath);
          done();
        });
        pid.should.be.Number;
        pid.should.above(0);
      });
    });

    it('should shotStream with options ok', function (done) {
      camera.shotStream(__filename,
      {mimeType: 'jpg', clipRect: {top: 100, left: 100, width: 100, height: 100}}, function (err, s, pid) {
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
        pid.should.be.Number;
        pid.should.with.above(0);
      });
    });
  });


  describe('overload event', function () {
    it('should emit overload', function (done) {
      mm(camera, 'workerNum', 1);
      done = pedding(3, done);
      camera.once('overload', function (num) {
        num.should.equal(1);
        done();
      });
      camera.shotStream(__filename, function (err, s) {
        should.not.exist(err);
        done();
      });
      camera.shotStream(__filename, function (err, s) {
        should.not.exist(err);
        done();
      });
    });
  });
});
