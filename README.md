web-camera
==========

网页截图工具 (by phantomjs)。通过phantomjs来打开渲染网页，对网页进行截图。   

## Usage  

```js
var Camera = require('webcamera');
var fs = require('fs');

var camera = Camera.create({
  tfsOpts: {    
    appkey: 'tfscom',
    rootServer: '10.232.4.44:3800',
    imageServers: [
      'img01.daily.taobaocdn.net',
      'img02.daily.taobaocdn.net',
      'img03.daily.taobaocdn.net',
      'img04.daily.taobaocdn.net'
    ]    
  }
});

//截图保存到本地
camera.shot('http://www.baidu.com', './baidu.png', function (err, data) {
  //data.should.equal('./baidu.png');
});

//截图作为stream
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

//截图上传TFS
camera.shotTFS('http://www.baidu.com', function (err, data) {
  /*
  data.should.like:
  {name: 'T1OyeyXm0mXXXXXXXX.png', size: 36889, url: 'img04.daily.taobaocdn.net/tfscom/T1OyeyXm0mXXXXXXXX.png'}
  */
});
```

所有的调用都可以在`callback`之前传入参数`options`. 

|名字|类型|含义|
|----|----|----|
|clipRect|Object|指定截图的矩形区域。有四个属性:top(0), left(0), height(window), width(window)。height和width可以设置为window或者all,window将会截取当前一屏，all会截取网页全部大小|
|viewportSize|Object|设置网页的分辨率，有两个属性:width(1024), height(768)。|
|renderDelay|Number|网页加载完成之后延迟多少毫秒之后截图，默认为0|
|picPath|String|设置图片保存位置，只在`shot`方法时生效，等效于shot方法的第二个参数|
|mimeType|String|设置截图的保存类型（只有在没设置图片保存路径的情况下生效，否则使用图片保存路径的后缀类型），支持png, jpeg, gif.默认为png|
|script|Function|网页加载完成之后可以在网页中执行这个方法。|
