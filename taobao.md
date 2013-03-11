淘宝CentOS机器使用
================

## 安装依赖  

* phantomjs 和 字体库安装： 

```
yum install phantomjs freetype.x86_64 freetype-devel.x86_64 fontconfig.x86_64 fontconfig-devel.x86_64 fonts-chinese.noarch freetype-devel fontconfig-devel  -b test
```

* 字体存放路径： `/usr/share/fonts/chinese/TrueType/`，将.tff字体文件放入到这个目录。   

## 注意事项  

1. 如果要对自身网站截图，务必通过ip方式直接访问本机，不要通过域名方式访问。  
2. 如果需要对其他淘系网站截图，由于同机房http无法调用，所以需要咨询PE绑定host。   
3. 尽量去除被截图网页的无关资源，减少由于http无法访问导致的错误。   

## 联系人  

旺旺@不四  