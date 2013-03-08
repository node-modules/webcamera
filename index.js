module.exports = process.env.WEB_CAMERA_COV ? require('./lib-cov/web_camera') : require('./lib/web_camera');
