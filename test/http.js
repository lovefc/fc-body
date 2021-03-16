/*
 * @Author       : lovefc
 * @Date         : 2021-03-11 15:34:02
 * @LastEditTime : 2021-03-16 16:00:11
 */
const http = require('http');
const fc_body = require('fc-body');

const server = http.createServer(async (req, res) => {

  //设置允许跨域的域名，*代表允许任意域名跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  //跨域允许的header类型
  res.setHeader("Access-Control-Allow-Headers", "Content-type,Content-Length,Authorization,Accept,X-Requested-Width");
  //跨域允许的请求方式
  res.setHeader("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  //设置响应头信息
  res.setHeader("X-Powered-By", ' 3.2.1');
  if (req.url === '/app/upload') {
    res.writeHead(200, {
      'content-type': 'text/html'
    });
    let body = new fc_body({
      isAutoSaveFile: true,
      savePath: __dirname + "/upload"
    });
    let post = '';
    // 注意,在{}里面的都是局部变量
    try {
      post = await body.getBody(req);
      console.log(post)
    } catch (e) {
      console.log(e);
    }
    res.end(post.title);
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/html'
  });
  res.end(`<link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/3.3.0/css/bootstrap.css"rel="stylesheet"><br/><br/><br/><div style="width:600px;background-color:#F1F1F1;margin:auto;top:100px;padding:40px;"><form action="/app/upload"method="post"enctype="multipart/form-data"><div class="form-group row"><label class="col-sm-2 col-form-label">Title</label><div class="col-sm-10"><input type="text"class="form-control"name="title"value=""></div></div><div class="form-group row"><label class="col-sm-2 col-form-label">Files</label><div class="col-sm-10"><input type="file"class="form-control-file"name="files"></div></div><button type="submit"class="btn btn-primary">上传</button></form></div>`);
})

server.listen(3007, () => {
  console.log('Server listening on http://localhost:3007/ ...');
});