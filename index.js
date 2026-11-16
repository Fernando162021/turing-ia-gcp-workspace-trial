const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processFile', (cloudEvent) => {
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

  } catch (error) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'Error processing the uploaded file',
      error: error.message,
      stack: error.stack,
    }));
    throw error;
  }
});