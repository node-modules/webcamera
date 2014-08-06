web-camera
==========

网页截图工具 (by phantomjs)。通过phantomjs来打开渲染网页，对网页进行截图。

## Usage

```js
var Camera = require('webcamera');
var fs = require('fs');

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
 *   - qnClient      {Object}   qiniu client instance
 *   - qnOpts        {Object}   qiniu options. if do not have qnClient and qnOpts, shotQN become invalid
 */
var camera = Camera.create({
  tfsOpts: {
    // tfs options
  },
  qnOpts: {
    accessKey: 'accessKey',
    secretKey: 'secretKey',
    bucket: 'webcamera'
  }
});

// 当处理速度比调用速度低时会触发此事件
camera.on('overload', function (listLength) {
  //listLength为排队等待处理的长度
});

// 截图保存到本地
camera.shot('http://www.baidu.com', './baidu.png', function (err, data) {
  // data.should.equal('./baidu.png');
});

// 截图作为stream
camera.shotStream('http://www.baidu.com', function (err, s) {
  var datas = [];
  var filePath = './test.jpg';
  var file = fs.createWriteStream(filePath, {encoding: 'binary'});
  s.on('data', function (data) {
    file.write(data.toString('binary'), 'binary');
  });
  s.on('end', function () {
    console.log('get pictrue ok');
  });
});

// 截图上传TFS
camera.shotTFS('http://www.baidu.com/',320, 'baidu.png', function (err, data) {
  /*
  data.should.like:
  {name: 'L1/1/320/baidu.png', size: 36889, url: 'xxx/L1/1/320/baidu.png'}
  */
});

//截图上传到七牛空间，第二个参数为上传七牛的options，第三个参数是截图的options
camera.shotQN('http://www.baidu.com', {key: 'test/baidu.png'}, {quality: 10}, function (err, data) {
  /*
  data.should.like:
  ({
    hash: 'FlDGti9pVGQ3sw2oao-mVu3nZWjZ',
    key: 'test/baidu.png',
    url: 'http://webcamera.u.qiniudn.com/test/baidu.png'
  })
  */
});
```

所有的调用都可以在`callback`之前传入参数`options`.

```js
camera.shotTFS('http://www.baidu.com',320, 'baidu.png', {
  clipRect: {
    top: 0,
    left:0,
    height: 'all',
    width: 'all'
  }
}, function (err, data) {
  /*
  data.should.like:
  {name: 'L1/1/320/baidu.png', size: 36889, url: 'xxx/L1/1/320/baidu.png'}
  */
});
```

|名字|类型|含义|
|----|----|----|
|clipRect|Object|指定截图的矩形区域。有四个属性:top(0), left(0), height(window), width(window)。height和width可以设置为window或者all,window将会截取当前一屏，all会截取网页全部大小|
|viewportSize|Object|设置网页的分辨率，有两个属性:width(1024), height(768)。|
|renderDelay|Number|网页加载完成之后延迟多少毫秒之后截图，默认为0|
|picPath|String|设置图片保存位置，只在`shot`方法时生效，等效于shot方法的第二个参数|
|mimeType|String|设置截图的保存类型（只有在没设置图片保存路径的情况下生效，否则使用图片保存路径的后缀类型），支持png, jpeg, gif.默认为png|
|script|Function|网页加载完成之后可以在网页中执行这个方法。|
|quality|Number|0~100，指定生成图片的质量，数值越高质量越好|

## Install

```bash
$ npm install webcamera
```

## Dependences
* [`phantomjs`](http://phantomjs.org/) >= v1.9
* [`TFS`](http://github.com/fengmk2/tfs) >= v0.1.2

## Debug

```bash
$ tail -f /tmp/phantom_shot.log &
$ phantomjs "phantom/web_camera_phantom.js" "https://github.com/" > github.png
```

github page screen shot: [github.png](http://nfs.nodeblog.org/b/0/b06ed6be50682731bfae32d79b25894b.png)

## command line tool
`npm install webcamera -g`, 之后可以使用web camera 提供的命令行工具进行网页截图。需要安装`phantomjs`。

```
camera -u http://www.google.com -o google.png

Options:
  -u, --url     Web's url
  -o, --out     Output screenshot picture path                                                  [default: "./out.png"]
  -c, --config  config file path, you can define much more options by a js file or a json file
```

可以通过传递配置文件的方式进行批量截图，并对截图的详细参数进行设置，配置文件可以是json文件或者js文件，配置文件模版：

```
#json形式
[{
  "url": "http://cnodejs.org",
  "out": "cnodejs.png"
}, {
  "url": "http://nodejs.org",
  "out": "nodejs.png",
  "options": {
    "viewportSize": {
      "width": 1280,
      "height": 800
    }
  }
}, {
  "url": "http://google.com",
  "out": "google.png",
  "options": {
    "quality": 10
  }
}]

#js形式
var url = 'http://google.com';

var config = [];

for (var quality = 10; quality <= 100; quality += 10) {
  config.push({
    url: url,
    out: 'google@' + quality + '.jpg',
    options: {
      quality: quality
    }
  });
}

module.exports = config;

```

推荐通过js形式的配置文件，将会更加灵活。

## Licences
(The MIT License)

Copyright (c) 2013 dead-horse and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
