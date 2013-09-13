/*!
 * web-camera - lib/web_camera_phantom.js
 *
 * Usage:
 *
 * $ phantomjs web_camera_phantom.js 1:address 2:top 3:left 4:width 5:height 6:ViewWidth 7:viewHeight \
 *   8:output 9:quality 10:waitTime 11:timeout 12:streamType 13:userScript 14:logfile
 * 
 * Authors: 
 *   dead_horse <dead_horse@qq.com>
 *   苏千 <suqian.yf@taobao.com>
 */

var system = require('system');
var webPage = require('webpage');
var fs = require('fs');
var args = Array.prototype.slice.call(system.args).filter(function (a) {
  return !a || a.indexOf('--') !== 0;
});

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
var quality = parseInt(args[9], 10) || null;
var waitTime = parseInt(args[10], 10) || 0;
var timeout = parseInt(args[11], 10) || 120000;
var streamType = args[12] || 'png';

if (output !== '/dev/stdout') {
  streamType = output.substring(output.lastIndexOf('.') + 1);
}

var userScript = args[13] || null;
var logfile = args[14] || '/tmp/phantom_shot.log';
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

log.apply(null, Array.prototype.slice.call(system.args).map(function (a, index) {
  return '"' + a + '"';
}));

log('clipRect: ' + JSON.stringify(clipRect),
  ', viewportSize: ' + JSON.stringify(page.viewportSize),
  ', output: ' + output,
  ', waitTime: ' + waitTime,
  ', timeout: ' + timeout,
  ', streamType: ' + streamType,
  ', quality: ' + (quality ? quality : 'default'),
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

  if (!output || output !== '/dev/stdout') {
    if (quality) {
      page.render(output, {quality: quality});
    } else {
      page.render(output);
    }
  } else {
    var base64 = page.renderBase64(streamType);
    console.log(base64);
    log('base64 ' + streamType + ' file size: ' + base64.length);
  }
  log(reason, ', render "' + address + '" to ' + output);
  _done = true;
  phantom.exit(0);
}

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
  // var size = page.renderBase64(streamType).length;
  log('res(#' + res.id + '):',
    res.status, 
    use + 'ms, size: ' + bodySize, res.url, 
    ', content size: ' + page.content.length, 
    // ', render base64 size: ' + size, 
    ', resources left: ' + resourcesNum);
  if (res.url === address) {
    log('page title:', page.title || 'no-title');
  }
};

// timeout之后不管怎么样都超时退出
setTimeout(function () {
  finish(timeout + 'ms timeout to finish');
}, timeout);

page.open(address, function (status) {
  log('open status: ' + status);
  if (status !== 'success' && !_done) {
    // code 100 meaning open url fail
    phantom.exit(100);
    return ;
  }
  userScript && page.evaluate(eval('('+userScript+')'));
  if (waitTime) {
    setTimeout(function () {
      finish('open "' + status + '", wait for ' + waitTime + 'ms to finish');
    }, waitTime);
  } else {
    finish('open "' + status + '" to finish');
  }  
});
