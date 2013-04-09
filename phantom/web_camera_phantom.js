/*!
 * web-camera - lib/web_camera_phantom.js
 * Author: dead_horse <dead_horse@qq.com>
 */
var system = require('system');
var webPage = require('webpage');
var args = system.args;
var page = webPage.create();

var address = args[1];

var clipRect = {
  top: parseInt(args[2], 10),
  left: parseInt(args[3], 10),
  width: parseInt(args[4], 10),
  height: parseInt(args[5], 10)
};
page.viewportSize = {
  width: parseInt(args[6], 10),
  height: parseInt(args[7], 10)
};
var output = args[8];
var waitTime = parseInt(args[9], 10);
if (isNaN(waitTime)) {
  waitTime = 0;
}
var timeout = parseInt(args[10], 10);
if (isNaN(timeout)) {
  timeout = 10000;
}
var streamType = args[11];
var userScript = args[12];


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
page.clipRect = {
  top: clipRect.top,
  left: clipRect.left, 
  width: pixelCount('width', clipRect.width), 
  height: pixelCount('height', clipRect.height)
};

var start = Date.now();
var resourcesNum = 0;

page.onResourceReceived = function (response) {
  if (response.url === address) {
    if (response.status !== 200) {
      console.log('error', response.status);
      return phantom.exit();
    }
    //page.onResourceReceived = null;
  }
};

function finish() {
  if (output) {
    page.render(output);
  } else {
    console.log(page.renderBase64(streamType));
  }
  //page.close();
  phantom.exit(0);
}

// timeout之后不管怎么样都超时退出
setTimeout(finish, timeout);

page.open(address, function (status) {
  if (status !== 'success') {
    //page.close();
    phantom.exit(1);
    return ;
  }
  userScript && page.evaluate(eval('('+userScript+')'));
  setTimeout(finish, waitTime);
});
