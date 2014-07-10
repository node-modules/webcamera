/*!
 * camera - lib/web_camera.js
 * Authors:
 *   dead_horse <dead_horse@qq.com>
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com/)
 */

'use strict';

/**
 * Module dependencies.
 */

var child_process = require('child_process');
var path = require('path');
var fs = require('fs');
fs.existsSync = fs.existsSync || path.existsSync;
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var utility = require('utility');
var urlModule = require('url');
var util = require('util');
var qn = require('qn');
var tfs;
try {
  tfs = require('tfs');
} catch (err) {}

/**
 * web camera by Node.js and Phantomjs
 * @param {Object} options
 *   - path          {String}   default picture dir path
 *   - workerNum     {Number}   child_process max num
 *   - timeout       {Number}   child_process timeout.
 *   - phantom       {String}   phantomjs path
 *   - phantomScript {String}   phantomjs script path, use input arguments as default script
 *   - [phantomLog]  {String}   phantomjs log file path, default is '/tmp/phantom_shot.log'
 *   - tfsClient     {Object}   tfs client instance
 *   - tfsOpts       {Object}   tfs options. if do not have tfsClient and tfsOpts, shotTFS become invalid
 *   - qnClient      {Object}   qiniu client instance
 *   - qnOpts        {Object}   qiniu options. if do not have qnClient and qnOpts, shotQN become invalid
 */
var Camera = function (options) {
  options = options || {};
  this.path = options.path || path.join(__dirname, '../pics');
  this.workerNum = options.workerNum || 5;
  this.phantom = options.phantom || 'phantomjs';

  if (this.phantom !== 'phantomjs' && !fs.existsSync(this.phantom)) {
    console.warn(this.phantom + ' not exist, use default phantomjs');
    this.phantom = 'phantomjs';
  }

  this.phantomScript = options.phantomScript || path.join(__dirname, '../phantom/web_camera_phantom.js');
  this.phantomLog = options.phantomLog || '/tmp/phantom_shot.log';
  this.tfsClient = options.tfsClient;
  this.timeout = options.timeout;
  if (!this.tfsClient && options.tfsOpts && tfs) {
    this.tfsClient = tfs.createClient(options.tfsOpts);
  }
  this.qnClient = options.qnClient;
  if (!this.qnClient && options.qnOpts) {
    this.qnClient = qn.create(options.qnOpts);
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
  if (url[0] !== '/') {
    url = urlModule.parse(url).protocol ? url : 'http://' + url;
  }

  switch (options._type) {
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
  case 'qn':
    options.mimeType = mimeType;
    options.picPath = '';
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
    options.quality || 'default',
    options.renderDelay || 0,
    this.timeout || 10000,
    options.mimeType || '',
    options.script ? String(options.script) : '',
    this.phantomLog,
    '--disk-cache=true'
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
  var output = args[8];
  if (output && output !== '/dev/stdout') {
    // has output file
    phantom.on('exit', function (code) {
      finish();
      if (code) {
        var err = new Error('phantomjs exit with code ' + code);
        if (code === 100) {
          err.name = 'WebCameraOpenURLError';
          err.message += ', open url fail';
        }
        err.args = args;
        return callback(err);
      }
      callback(null, output, phantom.pid);
    });
  } else {
    var s = new stream.Stream();
    s.readable = true;
    s.pid = phantom.pid;
    phantom.stdout.on('data', function (data) {
      s.emit('data', new Buffer(data.toString(), 'base64'));
    });

    phantom.on('exit', function (code) {
      if (code) {
        var err = new Error('phantomjs exit with code ' + code);
        if (code === 100) {
          err.name = 'WebCameraOpenURLError';
          err.message += ', open url fail';
        }
        err.args = args;
        return s.emit('error', err);
      }
      s.emit('end');
      finish();
    });
    callback(null, s, phantom.pid);
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
 *   - [quality] {Number}     图片质量, 1 - 100, 越大质量越高
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
 * @param {Function} callback(err, data, pid)
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
 * @param {Number} partition        保存到TFS时需要传入partition确定命名空间
 * @param {String} filename       保存到TFS的名字
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
Camera.prototype.shotTFS = function (url, partition, filename, options, callback) {
  if (typeof filename !== 'string') {
    callback = options;
    options = filename;
    filename = 'webcamera_' + Date.now() + '_' + utility.md5(url).substring(0, 10) + '.png';
  }
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!this.tfsClient) {
    return callback(new Error('TFS not inited'));
  }

  options = options || {};
  options._type = 'tfs';
  var self = this;
  self._handleShot(url, options, function (err, s) {
    if (err) {
      return callback(err);
    }
    self.tfsClient.uploadFile(s, partition % 1000 + 1, filename, callback);
  });
};

/**
 * shot web page, genarate a picture and upload to qiniu.
 * @param {String} url        web page url
 * @param {Object} qnOptions  上传七牛的参数，详见 https://github.com/fengmk2/qn
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
Camera.prototype.shotQN = function (url, qnOptions, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!this.qnClient) {
    return callback(new Error('QN not inited'));
  }

  options = options || {};
  qnOptions = qnOptions || {};
  options._type = 'qn';
  var self = this;
  self._handleShot(url, options, function (err, s) {
    if (err) {
      return callback(err);
    }
    console.log(s);
    self.qnClient.upload(s, qnOptions, callback);
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
    options = null;
  }
  options = options || {};
  options._type = 'stream';
  this._handleShot(url, options, callback);
};

exports.create = function (options) {
  return new Camera(options);
};
