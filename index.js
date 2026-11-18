const functions = require('@google-cloud/functions-framework');
const { validateFileMetadata } = require('./src/validation');
const { notifyWebhook } = require('./src/webhook');

async function handleFileUpload(cloudEvent) {
  try {
    const file = cloudEvent.data;
    const { name, bucket, size, contentType, timeCreated } = file;

    console.log(JSON.stringify({
      severity: 'INFO',
      message: 'File received in bucket',
      bucket,
      fileName: name,
      sizeBytes: size,
      contentType,
      timeCreated,
    }));

    const validationErrors = validateFileMetadata(file);
    if (validationErrors.length > 0) {
      console.error(JSON.stringify({
        severity: 'ERROR',
        message: 'File metadata failed validation, webhook not called',
        validationErrors,
      }));
      return;
    }

    await notifyWebhook(
      { fileName: name, bucket, size, contentType, timestamp: timeCreated },
      { webhookUrl: process.env.WEBHOOK_URL, secret: process.env.WEBHOOK_SECRET }
    );

  } catch (error) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'Error processing the uploaded file',
      error: error.message,
      stack: error.stack,
    }));
    throw error;
  }
}

functions.cloudEvent('processFile', handleFileUpload);

module.exports = { handleFileUpload };