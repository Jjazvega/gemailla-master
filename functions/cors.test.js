const assert = require('node:assert/strict');
const test = require('node:test');
const { applyCors, getAllowedOrigins } = require('./cors');

function createRequest(origin) {
  return {
    get(header) {
      return header.toLowerCase() === 'origin' ? origin : undefined;
    },
  };
}

function createResponse() {
  const headers = new Map();
  return {
    headers,
    set(name, value) {
      headers.set(name, value);
    },
  };
}

test('getAllowedOrigins requires explicit safe origins and ignores wildcard values', () => {
  process.env.ALLOWED_ORIGINS = ' https://app.gemailla.com , *, null, https://admin.gemailla.com ';

  assert.deepEqual(getAllowedOrigins(), [
    'https://app.gemailla.com',
    'https://admin.gemailla.com',
  ]);
});

test('applyCors allows only origins present in ALLOWED_ORIGINS', () => {
  process.env.ALLOWED_ORIGINS = 'https://app.gemailla.com,https://admin.gemailla.com';
  const res = createResponse();

  assert.equal(applyCors(createRequest('https://app.gemailla.com'), res), true);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://app.gemailla.com');
  assert.equal(res.headers.get('Vary'), 'Origin');
});

test('applyCors rejects unconfigured origins without reflecting the request origin', () => {
  process.env.ALLOWED_ORIGINS = 'https://app.gemailla.com';
  const res = createResponse();

  assert.equal(applyCors(createRequest('https://evil.example'), res), false);
  assert.equal(res.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal(res.headers.get('Vary'), 'Origin');
});

test('applyCors does not require CORS headers for non-browser requests without Origin', () => {
  process.env.ALLOWED_ORIGINS = '';
  const res = createResponse();

  assert.equal(applyCors(createRequest(undefined), res), true);
  assert.equal(res.headers.has('Access-Control-Allow-Origin'), false);
  assert.equal(res.headers.get('Vary'), 'Origin');
});
