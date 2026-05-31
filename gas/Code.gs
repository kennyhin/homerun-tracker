// ============================================
// Home Run Tracker - Google Apps Script Backend
// Deploy as a Web App (execute as me, access: anyone)
// ============================================

// ===== CONFIG =====
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // ← Create sheet, paste ID here

const SHEET_NAMES = {
  STUDENTS: 'Students',
  HOMERUNS: 'HomeRuns',
  COACHES: 'Coaches'
};

const ADMIN_EMAIL = 'kenny.hin@slamnv.org';

// ============================================
// WEB APP ENTRY POINTS
// ============================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    var callback = (e && e.parameter && e.parameter.callback) || null;
    var result;

    switch (action) {
      case 'getGrades':    result = getGrades(); break;
      case 'getTeachers':  result = getTeachers(e); break;
      case 'getStudents':  result = getStudents(e); break;
      case 'submitHomeRuns': result = submitHomeRuns(e); break;
      default:             result = { error: 'Invalid action: ' + action };
    }

    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message || String(err) });
  }
}

function doPost(e) {
  return doGet(e);
}

// ============================================
// ACTIONS
// ============================================

function getGrades() {
  var sheet = getSheet(SHEET_NAMES.STUDENTS);
  if (!sheet) return { grades: [] };
  var data = sheet.getDataRange().getValues();
  var grades = {};
  for (var i = 1; i < data.length; i++) {
    var grade = String(data[i][2] || '').trim(); // Column C = Grade
    if (grade) grades[grade] = true;
  }
  var sorted = Object.keys(grades).sort(sortGrade);
  return { grades: sorted };
}

function getTeachers(e) {
  var grade = (e && e.parameter && e.parameter.grade) || '';
  var sheet = getSheet(SHEET_NAMES.STUDENTS);
  if (!sheet) return { teachers: [] };
  var data = sheet.getDataRange().getValues();
  var teachers = {};
  for (var i = 1; i < data.length; i++) {
    var rowGrade = String(data[i][2] || '').trim();
    var teacher = String(data[i][3] || '').trim(); // Column D = Teacher
    if (rowGrade === grade && teacher) teachers[teacher] = true;
  }
  return { teachers: Object.keys(teachers).sort() };
}

function getStudents(e) {
  var teacher = (e && e.parameter && e.parameter.teacher) || '';
  var grade = (e && e.parameter && e.parameter.grade) || '';
  var sheet = getSheet(SHEET_NAMES.STUDENTS);
  if (!sheet) return { students: [] };
  var data = sheet.getDataRange().getValues();
  var students = [];
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || '').trim();     // Column A = Student Name
    var gradeLevel = String(data[i][2] || '').trim();
    var teacherName = String(data[i][3] || '').trim();
    if (teacherName === teacher && gradeLevel === grade && name) {
      students.push({
        id: 'stu_' + i,
        name: name,
        grade: gradeLevel,
        teacher: teacherName
      });
    }
  }
  return { students: students };
}

function submitHomeRuns(e) {
  var params = e && e.parameter ? e.parameter : {};
  var submissionsRaw = params.submissions || '[]';
  var submissions;

  if (typeof submissionsRaw === 'string') {
    try { submissions = JSON.parse(decodeURIComponent(submissionsRaw)); }
    catch(err) { submissions = []; }
  } else {
    submissions = submissionsRaw;
  }

  if (!submissions.length) {
    return { error: 'No submissions provided' };
  }

  // 1. Save to Sheet
  var sheet = getSheet(SHEET_NAMES.HOMERUNS);
  if (!sheet) return { error: 'HomeRuns sheet not found' };

  var now = new Date();
  var rows = submissions.map(function(s) {
    return [
      now,                                            // Timestamp
      s.date || new Date().toISOString().split('T')[0], // Date
      s.studentName,                                  // Student Name
      s.grade,                                        // Grade
      s.teacher,                                      // Teacher
      s.status,                                       // Status (homeRun / noHomeRun)
      s.studentId                                     // Student ID
    ];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  // 2. Send email to coaches
  var emailSent = sendCoachEmail(submissions, params.teacher, params.grade, params.date);

  return {
    success: true,
    count: submissions.length,
    emailSent: emailSent
  };
}

// ============================================
// EMAIL TO COACHES
// ============================================

function sendCoachEmail(submissions, teacher, grade, date) {
  var coachSheet = getSheet(SHEET_NAMES.COACHES);
  var coachEmails = [];

  if (coachSheet) {
    var data = coachSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var email = String(data[i][1] || '').trim(); // Column B = Email
      if (email && email.indexOf('@') > -1) coachEmails.push(email);
    }
  }

  // Always include admin
  if (ADMIN_EMAIL && coachEmails.indexOf(ADMIN_EMAIL) === -1) {
    coachEmails.push(ADMIN_EMAIL);
  }

  if (!coachEmails.length) return false;

  var hrCount = submissions.filter(function(s) { return s.status === 'homeRun'; }).length;
  var noHrCount = submissions.length - hrCount;

  var subject = '🏃 Home Run Report — ' + teacher + ' (' + grade + ') — ' + (date || new Date().toISOString().split('T')[0]);

  var html = '<div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;">';
  html += '<h2 style="color:#E86C00;">🏃 SLAM Home Run Tracker</h2>';
  html += '<p><strong>Teacher:</strong> ' + teacher + '</p>';
  html += '<p><strong>Grade:</strong> ' + grade + '</p>';
  html += '<p><strong>Date:</strong> ' + (date || new Date().toLocaleDateString()) + '</p>';
  html += '<hr style="border:1px solid #ddd;margin:16px 0;"/>';
  html += '<table style="width:100%;border-collapse:collapse;">';
  html += '<tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Student</th>';
  html += '<th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Status</th></tr>';

  submissions.forEach(function(s) {
    var icon = s.status === 'homeRun' ? '✅ Home Run' : '❌ No Home Run';
    var bg = s.status === 'homeRun' ? '#e8f8f0' : '#fde8e8';
    html += '<tr style="background:' + bg + ';"><td style="padding:8px;border-bottom:1px solid #eee;">' + s.studentName + '</td>';
    html += '<td style="padding:8px;text-align:center;border-bottom:1px solid #eee;font-weight:600;">' + icon + '</td></tr>';
  });

  html += '</table>';
  html += '<p style="margin-top:16px;font-size:14px;color:#666;">';
  html += '✅ ' + hrCount + ' Home Run | ❌ ' + noHrCount + ' No Home Run<br/>';
  html += 'Total: ' + submissions.length + ' athletes</p>';
  html += '<p style="font-size:12px;color:#999;margin-top:20px;">SLAM! Nevada Home Run Tracker — Athletic Department</p>';
  html += '</div>';

  try {
    MailApp.sendEmail({
      to: coachEmails.join(','),
      subject: subject,
      htmlBody: html,
      name: 'SLAM Home Run Tracker'
    });
    return true;
  } catch (err) {
    Logger.log('Email failed: ' + err.message);
    return false;
  }
}

// ============================================
// HELPERS
// ============================================

function getSheet(name) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(SHEET_ID);
  } catch (e) {
    Logger.log('Cannot open sheet: ' + SHEET_ID);
    return null;
  }
  return ss.getSheetByName(name);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

// Sort grades: Kinder, 1st, 2nd, 3rd, etc.
function sortGrade(a, b) {
  var order = { 'kinder': 0, 'kindergarten': 0, 'pre-k': -1, 'pk': -1 };
  var aKey = String(a).toLowerCase();
  var bKey = String(b).toLowerCase();
  if (order[aKey] !== undefined && order[bKey] !== undefined) return order[aKey] - order[bKey];
  if (order[aKey] !== undefined) return -1;
  if (order[bKey] !== undefined) return 1;
  // Extract number from strings like "1st Grade", "2nd Grade"
  var aNum = parseInt(aKey);
  var bNum = parseInt(bKey);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return aKey.localeCompare(bKey);
}

// ============================================
// SETUP - Run once to create sheets
// ============================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Students sheet
  var studentsSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  if (!studentsSheet) {
    studentsSheet = ss.insertSheet(SHEET_NAMES.STUDENTS);
  }
  if (studentsSheet.getLastRow() === 0) {
    studentsSheet.appendRow(['Student Name', 'Grade Level', 'Grade', 'Teacher']);
    // Sample data - replace with your actual athletes
    studentsSheet.appendRow(['Alex Martinez', 'Elementary', 'Kinder', 'Ms. Smith']);
    studentsSheet.appendRow(['Bella Chen', 'Elementary', 'Kinder', 'Ms. Smith']);
    studentsSheet.appendRow(['Carlos Rivera', 'Elementary', '1st Grade', 'Mr. Johnson']);
    studentsSheet.appendRow(['Diana Park', 'Elementary', '1st Grade', 'Mr. Johnson']);
    studentsSheet.appendRow(['Ethan Brown', 'Elementary', '2nd Grade', 'Mrs. Davis']);
    studentsSheet.appendRow(['Fiona Lee', 'Elementary', '2nd Grade', 'Mrs. Davis']);
    studentsSheet.appendRow(['Gabriel Kim', 'Elementary', '3rd Grade', 'Mr. Wilson']);
    studentsSheet.appendRow(['Hannah Wilson', 'Elementary', '3rd Grade', 'Mr. Wilson']);
    studentsSheet.appendRow(['Isaac Torres', 'Elementary', '4th Grade', 'Ms. Garcia']);
    studentsSheet.appendRow(['Jasmine Wright', 'Elementary', '4th Grade', 'Ms. Garcia']);
    studentsSheet.appendRow(['Kevin Patel', 'Elementary', '5th Grade', 'Mr. Thompson']);
    studentsSheet.appendRow(['Luna Nguyen', 'Elementary', '5th Grade', 'Mr. Thompson']);
  }

  // HomeRuns sheet
  var hrSheet = ss.getSheetByName(SHEET_NAMES.HOMERUNS);
  if (!hrSheet) {
    hrSheet = ss.insertSheet(SHEET_NAMES.HOMERUNS);
  }
  if (hrSheet.getLastRow() === 0) {
    hrSheet.appendRow(['Timestamp', 'Date', 'Student Name', 'Grade', 'Teacher', 'Status', 'Student ID']);
  }

  // Coaches sheet
  var coachSheet = ss.getSheetByName(SHEET_NAMES.COACHES);
  if (!coachSheet) {
    coachSheet = ss.insertSheet(SHEET_NAMES.COACHES);
  }
  if (coachSheet.getLastRow() === 0) {
    coachSheet.appendRow(['Name', 'Email']);
    coachSheet.appendRow(['Coach Kenny', ADMIN_EMAIL]);
  }

  Logger.log('Setup complete! Sheet ID: ' + ss.getId());
}
