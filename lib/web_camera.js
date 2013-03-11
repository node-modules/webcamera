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
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * web camera by Node.js and Phantomjs
 * @param {Object} options 
 *   - path          {String}   default picture dir path
 *   - workerNum     {Number}   child_process max num
 *   - timeout       {Number}   child_process timeout.
 *   - phantom       {String}   phantomjs path
 *   - phantomScript {String}   phantomjs script path, use input arguments as default script
 *   - tfsClient     {Object}   tfs client instance
 *   - tfsOpts       {Object}   tfs options. if do not have tfsClient and tfsOpts, shotTFS become invalid
 */
var Camera = function (options) {
  options = options || {};
  this.path = options.path || path.join(__dirname, '../pics');
  this.workerNum = options.workerNum || 5;
  this.phantom = options.phantom || 'phantomjs';
  this.phantomScript = options.phantomScript || path.join(__dirname, '../phantom/web_camera_phantom.js');
  this.tfsClient = options.tfsClient;
  this.timeout = options.timeout;
  if (!this.tfsClient && options.tfsOpts) {
    this.tfsClient = tfs.createClient(options.tfsOpts);
  }
  EventEmitter.call(this);
};
util.inherits(Camera, EventEmitter);

/**
 * process arguments, generate phantomjs script's input arguments
 * @param {String} url     web page url
 * @param {Object} options input options
 * @return {Array}          phantomjs arguments
 */
Camera.prototype.processArgs = function (url, options) {
  var mimeType = options.mimeType || 'png';
  var renderDelay = options.renderDelay || 200;
  var clipRect = options.clipRect || {};
  var viewportSize = options.viewportSize || {};
  url = urlModule.parse(url).protocol ? url : 'http://' + url;
  switch(options._type) {
    case 'tfs': 
      options.mimeType = mimeType;
      options.picPath = '';
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

/**
 * handle phantomjs process
 */
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
  } else {
    this.emit('overload', tasks.length);
  }
};

/**
 * shot web page, genarate a picture.
 * @param {String} url        web page url
 * @param {String} path       save path. optional
 * @param {Object} options    shot options
 *   - clipRect {Object}      截取网页的矩形区域
 *     - top
 *     - left
 *     - width                可以为'window'或者'all',此时可以截取全屏或者全网页
 *     - height               可以为'window'或者'all',此时可以截取全屏或者全网页
 *   - viewportSize {Object}  渲染网页时的分辨率
 *     - width                default 1024
 *     - height               default 768
 *   - renderDelay  {Number}  网页加载完成之后延迟多少毫秒之后截图，默认为0
 *   - picPath      {String}  设置图片保存位置，等效于shot方法的第二个参数，(如果有第二个参数path, 会被第path参数覆盖)
 *   - mimeType     {String}  截图的格式， 没有传递保存路径的时候，会根据url, viewportSize, clipRect，mimeType生成一个名字，保存到默认的图片文件夹
 *   - script       {Function}网页加载完成之后可以在网页中执行这个方法。
 * @param {Function} callback(err, data)
 *   - data {String} pictrue path
 */
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

/**
 * shot web page, genarate a picture and upload to TFS.
 * @param {String} url        web page url
 * @param {Object} options    shot options
 *   - clipRect {Object}      截取网页的矩形区域
 *     - top
 *     - left
 *     - width                可以为'window'或者'all',此时可以截取全屏或者全网页
 *     - height               可以为'window'或者'all',此时可以截取全屏或者全网页
 *   - viewportSize {Object}  渲染网页时的分辨率
 *     - width                default 1024
 *     - height               default 768
 *   - renderDelay  {Number}  网页加载完成之后延迟多少毫秒之后截图，默认为0
 *   - mimeType     {String}  生成截图的格式
 *   - script       {Function}网页加载完成之后可以在网页中执行这个方法。
 * @param {Function} callback(err, data)
 *   - data {String} pictrue path
 */
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
  self._handleShot(url, options, function (err, s) {
    if (err) {
      return callback(err);
    }
    self.tfsClient.upload(s, options.mimeType, callback);
  });
};

/**
 * shot web page, genarate a picture Stream.
 * @param {String} url        web page url
 * @param {Object} options    shot options
 *   - clipRect {Object}      截取网页的矩形区域
 *     - top
 *     - left
 *     - width                可以为'window'或者'all',此时可以截取全屏或者全网页
 *     - height               可以为'window'或者'all',此时可以截取全屏或者全网页
 *   - viewportSize {Object}  渲染网页时的分辨率
 *     - width                default 1024
 *     - height               default 768
 *   - renderDelay  {Number}  网页加载完成之后延迟多少毫秒之后截图，默认为0
 *   - mimeType     {String}  生成截图的格式
 *   - script       {Function}网页加载完成之后可以在网页中执行这个方法。
 * @param {Function} callback(err, data)
 *   - data {String} pictrue path
 */
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