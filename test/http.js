/*
 * @Author       : lovefc
 * @Date         : 2021-03-11 15:34:02
 * @LastEditTime : 2021-03-15 17:27:42
 */
const http = require('http');
const fc_body = require('../index.js');

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
    let body = new fc_body();
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
  res.end(`
    <form action="/app/upload" enctype="multipart/form-data" method="post">
      <div>Text: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="file" multiple="multiple" /></div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

server.listen(3007, () => {
  console.log('Server listening on http://localhost:3007/ ...');
});