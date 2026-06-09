const app = require('./src/app');
const http = require('http');

const server = app.listen(0, () => {
  const port = server.address().port;
  const options = {
    hostname: '127.0.0.1',
    port,
    path: '/api/public/templates',
    method: 'OPTIONS',
    headers: {
      Origin: 'https://itbeesglobal.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  };

  const req = http.request(options, (res) => {
    console.log('statusCode', res.statusCode);
    console.log('headers', JSON.stringify(res.headers, null, 2));
    res.on('data', () => {});
    res.on('end', () => server.close());
  });

  req.on('error', (e) => {
    console.error('request error', e);
    server.close();
  });

  req.end();
});
