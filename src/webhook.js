const crypto = require('crypto');

function signPayload(fields, secret) {
  const dataToSign = [fields.fileName, fields.bucket, fields.size, fields.contentType, fields.timestamp].join('|');
  return crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
}

async function notifyWebhook(payload, { webhookUrl, secret, fetchFn = fetch } = {}) {
  if (!webhookUrl || !secret) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'Webhook not configured: missing WEBHOOK_URL or WEBHOOK_SECRET env vars',
    }));
    return;
  }

  const signature = signPayload(payload, secret);
  const body = JSON.stringify({ ...payload, signature });

  try {
    const response = await fetchFn(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'follow',
    });
    const responseText = await response.text();

    console.log(JSON.stringify({
      severity: response.ok ? 'INFO' : 'WARNING',
      message: 'Webhook call finished',
      httpStatus: response.status,
      responseBody: responseText,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'Webhook call failed',
      error: error.message,
    }));
  }
}

module.exports = { signPayload, notifyWebhook };