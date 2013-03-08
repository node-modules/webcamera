/*!
 * camera - lib/web_camera.js
 * Author: dead_horse <dead_horse@qq.com>
 */

'use strict';

/**
 * Module dependencies.
 */
var child_process = require('child_process');
var path = require('path');
var tfs = require('tfs');
var fs = require('fs');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var utility = require('utility');
var urlModule = require('url');


var Camera = function (options) {
  options = options || {};
  this.path = options.path || path.join(__dirname, '../pics');
  this.workerNum = options.workerNum || 5;
  this.phantom = options.phantom || 'phantomjs';
  this.phantomScript = options.phantomScript || path.join(__dirname, '../phantom/web_camera_phantom.js');
  this.tfsClient = options.tfsClient;
  if (!this.tfsClient && options.tfsOpts) {
    this.tfsClient = tfs.createClient(options.tfsOpts);
  }
};

Camera.prototype.processArgs = function (url, options) {
  var mimeType = options.mimeType || 'png';
  var renderDelay = options.renderDelay || 200;
  var clipRect = options.clipRect || {};
  var viewportSize = options.viewportSize || {};
  url = urlModule.parse(url).protocol ? url : 'http://' + url;
  switch(options._type) {
    case 'tfs': options.picPath = path.join(this.path, 
        utility.md5(url + JSON.stringify(clipRect) + JSON.stringify(viewportSize))) + '.' + mimeType;
      options.mimeType = '';
      break;
    case 'pic': 
      options.picPath = options.picPath || path.join(this.path, 
        utility.md5(url + JSON.stringify(clipRect) + JSON.stringify(viewportSize))) + '.' + mimeType;
      options.mimeType = '';
      break;
    case 'stream': 
      options.picPath = '';
      options.mimeType = options.mimeType || 'PNG';
      break;
  }
  return [
    this.phantomScript,
    url,
    clipRect.top || 0,
    clipRect.left || 0,
    clipRect.width || 'window',
    clipRect.height || 'window',
    viewportSize.width || 1024,
    viewportSize.height || 768,
    options.picPath || '',
    options.renderDelay || 0,
    this.timeout || 10000,
    options.mimeType || '',
    options.script ? String(options.script) : '',
    '--disk-cache=yes'
  ];
};


var tasks = []; //任务队列
var notify = new EventEmitter();
var workerNum = 0;

Camera.prototype.phantomProcess = function (args, callback) {  
  workerNum++;
  var _this = this;
  var phantom = child_process.spawn(this.phantom, args);
  function finish() {
    workerNum--;
    tasks.length && _this.phantomProcess.apply(_this, tasks.shift());
  }
  if (args[8]) {
    phantom.on('exit', function (code) {
      finish();
      if (code) {
        var err = new Error('phantomjs exit with code ' + code);
        err.args = args;
        return callback(err);
      }
      callback(null, args[8]);
    });
  } else {
    var s = new stream.Stream();
    s.readable = true;
    phantom.stdout.on('data', function(data) {
      s.emit('data', new Buffer(''+data, 'base64'));
    });

    phantom.on('exit', function() {
      s.emit('end');
      finish();
    });
    callback(null, s);
  }
};

Camera.prototype._handleShot = function (url, options, callback) {
  var args = this.processArgs(url, options);
  tasks.push([args, callback]);
  if (workerNum < this.workerNum) {
    this.phantomProcess.apply(this, tasks.shift());
  }
};

Camera.prototype.shot = function (url, path, options, callback) {
  switch (arguments.length) {
    case 2: // url, callback
      callback = path;
      options = {};
      break;
    case 3: //url, path, callback | url, options, callback
      callback = options;
      if (typeof path === 'string') {
        options = {picPath: path};
      } else {
        options = path || {};
      }
      break;
    case 4: // url, path, options, callback
      options = options || {};
      options.picPath = path;
      break;
  }
  options._type = 'pic';
  this._handleShot(url, options, callback);  
};


Camera.prototype.shotTFS = function (url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  options._type = 'tfs';
  var self = this;
  if (!self.tfsClient) {
    return callback(new Error('TFS not inited'));
  }
  self._handleShot(url, options, function (err, pic) {
    if (err) {
      return callback(err);
    }
    self.tfsClient.upload(pic, function (err, info) {
      fs.unlink(pic, utility.noop);
      callback(err, info);
    });
  });
};

Camera.prototype.shotStream = function (url, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }  
  options = options || {};
  options._type = 'stream';
  this._handleShot(url, options, callback);
};

exports.create = function (options) {
  return new Camera(options);
};