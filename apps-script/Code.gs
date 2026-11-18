/**
 * Turing IA - Automation Tracker
 * Day 2 Trial Challenge: Google Workspace Automation
 *
 * Reads rows from the spreadsheet, evaluates each event,
 * and updates the "Status" column based on business rules.
 */

const COL = {
  DATE: 0,
  EVENT: 1,
  AMOUNT: 2,
  STATUS: 3,
  NOTIFIED: 4,
  SCHEDULED: 5
};

const HIGH_PRIORITY_THRESHOLD = 1000;

/**
 * Reads all data rows, calculates the priority status for each one
 * based on the amount, and writes the result back to the "Status" column.
 * Triggered automatically on every sheet edit.
 */
function processSheetData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  for (let row = 1; row < values.length; row++) {
    const amount = values[row][COL.AMOUNT];
    const currentStatus = values[row][COL.STATUS];

    if (!values[row][COL.EVENT]) continue;

    const newStatus = amount >= HIGH_PRIORITY_THRESHOLD ? "HIGH PRIORITY" : "NORMAL";

    if (currentStatus !== newStatus) {
      sheet.getRange(row + 1, COL.STATUS + 1).setValue(newStatus);
    }
  }

  Logger.log("processSheetData finished at " + new Date());
}

/**
 * Sends an email notification for any row marked HIGH PRIORITY
 * that has not been notified yet (Notified = FALSE).
 * Updates the "Notified" column to TRUE after sending.
 */
function sendNotifications() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  const recipientEmail = Session.getActiveUser().getEmail();
  let notificationsSent = 0;

  for (let row = 1; row < values.length; row++) {
    const status = values[row][COL.STATUS];
    const alreadyNotified = values[row][COL.NOTIFIED];

    if (status === "HIGH PRIORITY" && alreadyNotified !== true) {
      const eventName = values[row][COL.EVENT];
      const amount = values[row][COL.AMOUNT];
      const date = values[row][COL.DATE];

      const subject = "High Priority Event Detected: " + eventName;
      const body =
        "A high priority event was detected in the Automation Tracker:\n\n" +
        "Date: " + date + "\n" +
        "Event: " + eventName + "\n" +
        "Amount: $" + amount + "\n\n" +
        "This is an automated notification from Apps Script.";

      GmailApp.sendEmail(recipientEmail, subject, body);

      // Mark as notified so we don't send duplicate emails
      sheet.getRange(row + 1, COL.NOTIFIED + 1).setValue(true);
      notificationsSent++;
    }
  }

  Logger.log(notificationsSent + " notification(s) sent at " + new Date());
}

/**
 * Creates a follow-up calendar event for each HIGH PRIORITY row
 * that has already been notified and doesn't have a follow-up
 * scheduled yet. Uses the "Scheduled" column as a flag to prevent
 * duplicate events when this function runs more than once
 * (e.g. from the hourly trigger).
 */
function createFollowUpEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const calendar = CalendarApp.getDefaultCalendar();

  let eventsCreated = 0;

  for (let row = 1; row < values.length; row++) {
    const status = values[row][COL.STATUS];
    const notified = values[row][COL.NOTIFIED];
    const alreadyScheduled = values[row][COL.SCHEDULED];
    const eventName = values[row][COL.EVENT];

    // Only create a follow-up once: notified AND not yet scheduled
    if (status === "HIGH PRIORITY" && notified === true && alreadyScheduled !== true) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(10, 0, 0, 0);

      const endTime = new Date(startTime.getTime());
      endTime.setMinutes(endTime.getMinutes() + 30);

      const title = "Follow-up: " + eventName;
      const description =
        "Automatically scheduled by Apps Script.\n" +
        "Source row: " + (row + 1) + " in Automation Tracker.\n" +
        "Amount: $" + values[row][COL.AMOUNT];

      calendar.createEvent(title, startTime, endTime, {
        description: description
      });

      // Mark as scheduled so we never create a duplicate event for this row
      sheet.getRange(row + 1, COL.SCHEDULED + 1).setValue(true);
      eventsCreated++;
    }
  }

  Logger.log(eventsCreated + " calendar event(s) created at " + new Date());
}