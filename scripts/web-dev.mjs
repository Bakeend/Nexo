import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const publicPort = Number(process.env.PORT ?? 8082);
const expoPort = publicPort === 8081 ? 8082 : 8081;
const expoCli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));

const expo = spawn(process.execPath, [expoCli, 'start', '--web', '--port', String(expoPort)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

const addIsolationHeaders = (headers) => ({
  ...headers,
  'cross-origin-embedder-policy': 'credentialless',
  'cross-origin-opener-policy': 'same-origin',
});

const proxy = createServer((request, response) => {
  const upstream = httpRequest(
    {
      hostname: '127.0.0.1',
      port: expoPort,
      path: request.url,
      method: request.method,
      headers: {
        ...request.headers,
        host: `127.0.0.1:${expoPort}`,
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, addIsolationHeaders(upstreamResponse.headers));
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', (error) => {
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain' });
    response.end(`Expo web server is starting: ${error.message}`);
  });

  request.pipe(upstream);
});

proxy.on('upgrade', (request, socket, head) => {
  const upstream = connect(expoPort, '127.0.0.1', () => {
    const headers = Object.entries(request.headers)
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\r\n');

    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

const shutdown = () => {
  proxy.close();
  expo.kill('SIGINT');
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

proxy.listen(publicPort, '127.0.0.1', () => {
  console.log(`Nexo web proxy: http://localhost:${publicPort}`);
  console.log(`Expo Metro server: http://localhost:${expoPort}`);
});

expo.once('exit', (code) => {
  proxy.close();
  if (code && code !== 130) process.exitCode = code;
});
