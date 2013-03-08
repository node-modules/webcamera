var Camera = require('../');

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

camera.shot('http://www.baidu.com', {
  picPath: './baidu.png', 
  script: function () {
    document.getElementById('kw').value = 'test script';
  }
}, function (err, data) {
  console.log(err, data);
});


camera.shot('www.baidu.com', {clipRect: {top: '100', left: '100'}, viewportSize: {width: 1920, heigth: 1080}}, function (err, data) {
  console.log(err, data);
});