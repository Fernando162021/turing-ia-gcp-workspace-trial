/**
 * Day 3 — Secure webhook endpoint for the GCS → Cloud Function → Apps Script integration.
 * Receives file metadata from the Cloud Function (Day 1) via HTTP POST,
 * validates a shared-secret signature, logs the event to the
 * "GCS File Events" sheet, and sends a notification.
 */
function doPost(e) {
  const GCS_SHEET_NAME = "GCS File Events";
  const lock = LockService.getScriptLock();

  try {
    const payload = JSON.parse(e.postData.contents);

    const requiredFields = ["fileName", "bucket", "size", "contentType", "timestamp", "signature"];
    for (const field of requiredFields) {
      if (!(field in payload)) {
        return jsonResponse(400, { error: "Missing required field: " + field });
      }
    }

    if (!isSignatureValid(payload)) {
      Logger.log("Webhook rejected: invalid signature");
      return jsonResponse(401, { error: "Invalid signature" });
    }

    // Concurrency fix: GCS can trigger several near-simultaneous invocations
    lock.waitLock(10000); // wait up to 10s for the lock before giving up

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GCS_SHEET_NAME);
    sheet.appendRow([
      payload.timestamp,
      payload.fileName,
      payload.bucket,
      payload.size,
      payload.contentType,
      "Cloud Function (Day 1)",
      false
    ]);
    const thisRow = sheet.getLastRow(); // safe now: no other execution can append between these two lines

    const recipientEmail = PropertiesService.getScriptProperties().getProperty("NOTIFICATION_EMAIL");
    GmailApp.sendEmail(
      recipientEmail,
      "New file processed: " + payload.fileName,
      "A new file was uploaded to bucket \"" + payload.bucket + "\" and processed successfully.\n\n" +
      "File: " + payload.fileName + "\n" +
      "Size: " + payload.size + " bytes\n" +
      "Type: " + payload.contentType + "\n" +
      "Timestamp: " + payload.timestamp
    );

    sheet.getRange(thisRow, 7).setValue(true);

    Logger.log("GCS event processed successfully: " + payload.fileName + " (row " + thisRow + ")");
    return jsonResponse(200, { status: "ok", message: "Event logged and notification sent" });

  } catch (err) {
    Logger.log("Error processing webhook: " + err.message);
    return jsonResponse(500, { error: "Internal error: " + err.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Validates the HMAC-SHA256 signature sent by the Cloud Function.
 * The signature must match a hash of the payload fields (excluding "signature" itself)
 * computed with the shared secret stored in Script Properties.
 */
function isSignatureValid(payload) {
  const secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
  const dataToSign = payload.fileName + "|" + payload.bucket + "|" + payload.size + "|" +
                      payload.contentType + "|" + payload.timestamp;

  const computedSignature = Utilities.computeHmacSha256Signature(dataToSign, secret)
    .map(byte => ("0" + (byte & 0xFF).toString(16)).slice(-2))
    .join("");

  return computedSignature === payload.signature;
}

function jsonResponse(statusCode, body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}