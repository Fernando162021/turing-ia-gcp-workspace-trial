const test = require('node:test');
const assert = require('node:assert');
const { handleFileUpload } = require('../index');
const { validateFileMetadata } = require('../src/validation');
const { signPayload } = require('../src/webhook');

test('logs file metadata on successful upload', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (msg) => logs.push(msg);

  const cloudEvent = {
    data: {
      name: 'test.png',
      bucket: 'turing-ia-bucket-test',
      size: '12345',
      contentType: 'image/png',
      timeCreated: '2026-11-16T00:00:00Z',
    },
  };

  await handleFileUpload(cloudEvent);
  console.log = originalLog;

  assert.strictEqual(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.strictEqual(parsed.severity, 'INFO');
  assert.strictEqual(parsed.fileName, 'test.png');
  assert.strictEqual(parsed.bucket, 'turing-ia-bucket-test');
});

test('rejects and logs an error when cloudEvent.data is missing', async () => {
  const errors = [];
  const originalError = console.error;
  console.error = (msg) => errors.push(msg);

  const badCloudEvent = {};

  await assert.rejects(() => handleFileUpload(badCloudEvent));
  console.error = originalError;

  assert.strictEqual(errors.length, 1);
  const parsed = JSON.parse(errors[0]);
  assert.strictEqual(parsed.severity, 'ERROR');
});

test('validateFileMetadata flags missing fields', () => {
  const errors = validateFileMetadata({ name: 'a.png' });
  assert.strictEqual(errors.length, 3);
});

test('validateFileMetadata passes for complete, valid metadata', () => {
  const errors = validateFileMetadata({
    name: 'a.png', bucket: 'b', size: '100', contentType: 'image/png',
  });
  assert.strictEqual(errors.length, 0);
});

test('signPayload produces a deterministic HMAC-SHA256 hex signature', () => {
  const fields = { fileName: 'a.png', bucket: 'b', size: '100', contentType: 'image/png', timestamp: 't1' };
  const sig1 = signPayload(fields, 'my-secret');
  const sig2 = signPayload(fields, 'my-secret');
  const sig3 = signPayload(fields, 'different-secret');

  assert.strictEqual(sig1, sig2);
  assert.notStrictEqual(sig1, sig3);
  assert.match(sig1, /^[0-9a-f]{64}$/);
});