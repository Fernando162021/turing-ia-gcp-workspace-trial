const test = require('node:test');
const assert = require('node:assert');
const { handleFileUpload } = require('../index');

test('logs file metadata on successful upload', () => {
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

  handleFileUpload(cloudEvent);
  console.log = originalLog;

  assert.strictEqual(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.strictEqual(parsed.severity, 'INFO');
  assert.strictEqual(parsed.fileName, 'test.png');
  assert.strictEqual(parsed.bucket, 'turing-ia-bucket-test');
});

test('logs and re-throws error when cloudEvent.data is missing', () => {
  const errors = [];
  const originalError = console.error;
  console.error = (msg) => errors.push(msg);

  const badCloudEvent = {};

  assert.throws(() => handleFileUpload(badCloudEvent));
  console.error = originalError;

  assert.strictEqual(errors.length, 1);
  const parsed = JSON.parse(errors[0]);
  assert.strictEqual(parsed.severity, 'ERROR');
});