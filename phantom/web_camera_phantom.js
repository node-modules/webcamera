/*!
 * web-camera - lib/web_camera_phantom.js
 *
 * Usage:
 *
 * $ phantomjs web_camera_phantom.js 1:address 2:top 3:left 4:width 5:height 6:ViewWidth 7:viewHeight \
 *   8:output 9:waitTime 10:timeout 11:streamType 12:userScript 13:logfile
 * 
 * Authors: 
 *   dead_horse <dead_horse@qq.com>
 *   苏千 <suqian.yf@taobao.com>
 */

var system = require('system');
var webPage = require('webpage');
var fs = require('fs');
var args = system.args;
var page = webPage.create();

var address = args[1];

var clipRect = {
  top: parseInt(args[2], 10) || 0,
  left: parseInt(args[3], 10) || 0,
  width: parseInt(args[4], 10) || 'all',
  height: parseInt(args[5], 10) || 'all'
};

var viewportSize = {
  width: parseInt(args[6], 10) || 'all',
  height: parseInt(args[7], 10) || 'all'
};

if (viewportSize.width !== 'all' && viewportSize.height !== 'all') {
  page.viewportSize = viewportSize;
}

var output = args[8] || '/dev/stdout';
var waitTime = parseInt(args[9], 10) || 0;
var timeout = parseInt(args[10], 10) || 120000;
var streamType = args[11] || 'png';
var userScript = args[12] || null;
var logfile = args[13] || '/tmp/phantom_shot.log';
if (logfile.indexOf('--') === 0) {
  logfile = '/tmp/phantom_shot.log';
}

var logger = fs.open(logfile, 'a');

var start = Date.now();

var log = function () {
  var args = Array.prototype.slice.call(arguments);
  logger.writeLine('[' + system.pid + '] [' + Date() + '] [' + (Date.now() - start) + 'ms] ' + args.map(function (a) {
    return String(a);
  }).join(' '));
  logger.flush();
};

var version = phantom.version.major + '.' + phantom.version.minor + '.' + phantom.version.patch;

log('phantomjs ' + version, ', os architecture: ' + system.os.architecture, 
  ', name: ' + system.os.name,
  ', version: ' + system.os.version);

log('clipRect: ' + JSON.stringify(clipRect),
  ', viewportSize: ' + JSON.stringify(page.viewportSize),
  ', output: ' + output,
  ', waitTime: ' + waitTime,
  ', timeout: ' + timeout,
  ', streamType: ' + streamType,
  ', userScript: ' + userScript,
  ', logfile: ' + logfile
);

var pageDimensions = page.evaluate(function() {
  return {
    width: Math.max( 
      document.body.offsetWidth, 
      document.body.scrollWidth, 
      document.documentElement.clientWidth, 
      document.documentElement.scrollWidth, 
      document.documentElement.offsetWidth
    ), 
    height: Math.max(
      document.body.offsetHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    )
  };
});

/*
 * Given a shotSize dimension, return the actual number of pixels in the 
 * dimension that phantom should render.
 *
 * @param (String) dimension
 * @param (String or Number) value
 */
var pixelCount = function(dimension, value) {
  return {
    window: args[{
      width: 'windowWidth', 
      height: 'windowHeight'
    }[dimension]],
    all: pageDimensions[dimension]
  }[value] || value;
};

// Set the rectangle of the page to render
if (clipRect.width !== 'all' && clipRect.height !== 'all') {
  page.clipRect = {
    top: clipRect.top,
    left: clipRect.left, 
    width: pixelCount('width', clipRect.width), 
    height: pixelCount('height', clipRect.height)
  };
}

var resourcesNum = 0;

var _done = false;

function finish(reason) {
  if (_done) {
    return;
  }

  var base64 = page.renderBase64(streamType);
  page.render(output);
  // page.close();
  // fs.write(output, base64, 'wb');
  log(reason, ', render to ' + output + ', base64 file size: ' + base64.length);
  _done = true;
  // setTimeout(function () {
  //   phantom.exit(0);
  // }, 10);
  phantom.exit(0);
}

var lastSize = 0;

var resources = {};

page.onResourceRequested = function (req, networkRequest) {
  resources[req.id] = {start: Date.now()};
  resourcesNum++;
  log('req(#' + req.id + '):', req.method, req.url, ', resources left: ' + resourcesNum);
};

page.onResourceReceived = function (res) {
  var reqInfo = resources[res.id];
  if (res.stage === 'start') {
    reqInfo.size = res.bodySize;
    return;
  }

  resourcesNum--;
  var bodySize = reqInfo.size;
  var use = Date.now() - reqInfo.start;
  var size = page.renderBase64(streamType).length;
  log('res(#' + res.id + '):', res.status, use + 'ms', ', size: ' + bodySize, res.url, 
    ', content size: ' + page.content.length, 
    ', render base64 size: ' + size, 
    ', resources left: ' + resourcesNum);
  if (res.url === address) {
    log('page title:', page.title || 'no-title');
  }

  // empty is 4224
  // if (res.stage === 'end' && size > 5000 && lastSize > 5000 && size === lastSize) {
  //   // size 没有变化
  //   log('finish when gen content size:' + page.content.length, 'base64 size: ' + size);
  //   page.onResourceReceived = null;
  //   // setTimeout(finish, 500);
  //   finish();
  // }
  // lastSize = size;
};

// timeout之后不管怎么样都超时退出
setTimeout(function () {
  finish(timeout + ' ms timeout finish');
}, timeout);

page.open(address, function (status) {
  log('open status: ' + status);
  if (status !== 'success' && !_done) {
    phantom.exit(1);
    return ;
  }
  userScript && page.evaluate(eval('('+userScript+')'));
  if (waitTime) {
    setTimeout(function () {
      finish('open status, wait for' + waitTime + ' ms to finish');
    }, waitTime);
  } else {
    finish('open status finish');
  }  
});
