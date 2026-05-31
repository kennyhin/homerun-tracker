// ============================================
// Home Run Tracker - Google Apps Script Backend
// Teams-based: players on teams, teachers mark them,
// coach gets ONE email when all players are rated.
// ============================================

// ===== CONFIG =====
var SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

var SHEETS = {
  PLAYERS:  'Players',
  TEAMS:    'Teams',
  HOMERUNS: 'HomeRuns',
  COACHES:  'Coaches',
  TEACHERS: 'Teachers'
};

var SUPERVISOR_EMAIL = 'kenny.hin@slamnv.org';
var APP_NAME = 'SLAM Home Run Tracker';

// ============================================
// WEB APP ENTRY POINTS
// ============================================

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    var callback = (e && e.parameter && e.parameter.callback) || null;
    var result;

    switch (action) {
      case 'getGrades':      result = getGrades(); break;
      case 'getTeachers':    result = getTeachers(e); break;
      case 'getPlayers':     result = getPlayers(e); break;
      case 'submitHomeRuns': result = submitHomeRuns(e); break;
      case 'getTeamStatus':  result = getTeamStatus(e); break;
      case 'getTeams':       result = getTeamsList(); break;
      default:               result = { error: 'Invalid action: ' + action };
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

function doPost(e) { return doGet(e); }

// ============================================
// ACTIONS
// ============================================

function getGrades() {
  var sheet = getSheet(SHEETS.PLAYERS);
  if (!sheet) return { grades: [] };
  var data = sheet.getDataRange().getValues();
  var grades = {};
  for (var i = 1; i < data.length; i++) {
    var grade = String(data[i][2] || '').trim();
    if (grade) grades[grade] = true;
  }
  return { grades: Object.keys(grades).sort(sortGrade) };
}

function getTeachers(e) {
  var grade = (e && e.parameter && e.parameter.grade) || '';
  var sheet = getSheet(SHEETS.PLAYERS);
  if (!sheet) return { teachers: [] };
  var data = sheet.getDataRange().getValues();
  var teachers = {};
  for (var i = 1; i < data.length; i++) {
    var rowGrade = String(data[i][2] || '').trim();
    var teacher = String(data[i][3] || '').trim();
    if (rowGrade === grade && teacher) teachers[teacher] = true;
  }
  return { teachers: Object.keys(teachers).sort() };
}

function getPlayers(e) {
  var teacher = (e && e.parameter && e.parameter.teacher) || '';
  var grade = (e && e.parameter && e.parameter.grade) || '';
  var sheet = getSheet(SHEETS.PLAYERS);
  if (!sheet) return { players: [] };
  var data = sheet.getDataRange().getValues();
  var players = [];
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][0] || '').trim();    // A = Player Name
    var team = String(data[i][1] || '').trim();     // B = Team
    var grd = String(data[i][2] || '').trim();      // C = Grade
    var tchr = String(data[i][3] || '').trim();     // D = Teacher
    if ((tchr === teacher || !teacher) && (!grade || grd === grade) && name) {
      players.push({
        id: 'p_' + i,
        name: name,
        team: team,
        grade: grd,
        teacher: tchr
      });
    }
  }
  return { players: players };
}

// Get all teams (for admin)
function getTeamsList() {
  var sheet = getSheet(SHEETS.TEAMS);
  if (!sheet) return { teams: [] };
  var data = sheet.getDataRange().getValues();
  var teams = [];
  for (var i = 1; i < data.length; i++) {
    var teamName = String(data[i][0] || '').trim();
    var coachEmail = String(data[i][1] || '').trim();
    var coachName = String(data[i][2] || '').trim();
    var playerIds = String(data[i][3] || '').trim().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (teamName) {
      teams.push({ teamName: teamName, coachEmail: coachEmail, coachName: coachName, playerIds: playerIds });
    }
  }
  return { teams: teams };
}

// Check if a team is fully rated and send email if so
function getTeamStatus(e) {
  var teamName = (e && e.parameter && e.parameter.teamName) || '';
  if (!teamName) return { error: 'No team specified' };

  var team = getTeamByName(teamName);
  if (!team) return { error: 'Team not found: ' + teamName };

  var hrSheet = getSheet(SHEETS.HOMERUNS);
  var today = new Date().toISOString().split('T')[0];
  var allSubmitted = true;
  var report = [];

  team.playerIds.forEach(function(pid) {
    var entry = findHomeRunEntry(pid, today);
    if (entry) {
      report.push({ playerId: pid, playerName: entry.playerName, status: entry.status, teacher: entry.teacher });
    } else {
      allSubmitted = false;
      var player = getPlayerById(pid);
      report.push({ playerId: pid, playerName: player ? player.name : pid, status: 'pending', teacher: '' });
    }
  });

  return {
    teamName: teamName,
    coachEmail: team.coachEmail,
    coachName: team.coachName,
    total: team.playerIds.length,
    submitted: report.filter(function(r) { return r.status !== 'pending'; }).length,
    allSubmitted: allSubmitted,
    report: report
  };
}

// Home Run submission from teacher
function submitHomeRuns(e) {
  var params = e && e.parameter ? e.parameter : {};
  var submissionsRaw = params.submissions || '[]';
  var teacherName = params.teacher || '';
  var grade = params.grade || '';
  var date = params.date || new Date().toISOString().split('T')[0];

  var submissions;
  if (typeof submissionsRaw === 'string') {
    try { submissions = JSON.parse(decodeURIComponent(submissionsRaw)); }
    catch(err) { submissions = []; }
  } else {
    submissions = submissionsRaw;
  }

  if (!submissions.length) return { error: 'No submissions provided' };

  // 1. Save each submission to HomeRuns sheet
  var hrSheet = getSheet(SHEETS.HOMERUNS);
  if (!hrSheet) return { error: 'HomeRuns sheet not found' };

  var now = new Date();
  var rows = submissions.map(function(s) {
    return [
      now,
      date,
      s.playerName,
      s.team || '',
      s.grade,
      teacherName,
      s.status,       // homeRun / noHomeRun
      s.playerId
    ];
  });
  hrSheet.getRange(hrSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  // 2. Check each team — if all players rated, email the coach
  var teamsAffected = {};
  submissions.forEach(function(s) {
    if (s.team) teamsAffected[s.team] = true;
  });

  var emailsSent = 0;
  Object.keys(teamsAffected).forEach(function(teamName) {
    if (isTeamComplete(teamName, date)) {
      sendTeamCoachEmail(teamName, date);
      emailsSent++;
    }
  });

  return {
    success: true,
    count: submissions.length,
    emailsSent: emailsSent,
    teamsAffected: Object.keys(teamsAffected)
  };
}

// ============================================
// CRON JOB FUNCTIONS (called by time-based triggers)
// ============================================

// 2:00 PM — Remind teachers who haven't submitted yet
function cronRemindTeachers() {
  var today = new Date().toISOString().split('T')[0];
  var teachersSheet = getSheet(SHEETS.TEACHERS);
  var playersSheet = getSheet(SHEETS.PLAYERS);
  var hrSheet = getSheet(SHEETS.HOMERUNS);

  if (!teachersSheet || !playersSheet) return;

  var teacherData = teachersSheet.getDataRange().getValues();
  var playerData = playersSheet.getDataRange().getValues();
  var hrData = hrSheet ? hrSheet.getDataRange().getValues() : [];

  // Build map of which players each teacher is responsible for
  var teacherMap = {};
  for (var i = 1; i < playerData.length; i++) {
    var tName = String(playerData[i][3] || '').trim();
    var pName = String(playerData[i][0] || '').trim();
    var team = String(playerData[i][1] || '').trim();
    if (tName && pName) {
      if (!teacherMap[tName]) teacherMap[tName] = { email: '', players: [] };
      teacherMap[tName].players.push({ name: pName, team: team });
    }
  }

  // Attach emails
  for (var i = 1; i < teacherData.length; i++) {
    var tName = String(teacherData[i][0] || '').trim();
    var tEmail = String(teacherData[i][1] || '').trim();
    if (tName && teacherMap[tName]) teacherMap[tName].email = tEmail;
  }

  // Build set of already-submitted (teacher + player + date)
  var submitted = {};
  for (var i = 1; i < hrData.length; i++) {
    var d = String(hrData[i][1] || '').trim();
    var p = String(hrData[i][2] || '').trim();
    var t = String(hrData[i][5] || '').trim();
    if (d === today) submitted[t + '|' + p] = true;
  }

  // Find teachers with missing submissions
  var remindersSent = 0;
  Object.keys(teacherMap).forEach(function(tName) {
    var info = teacherMap[tName];
    var missing = info.players.filter(function(p) { return !submitted[tName + '|' + p.name]; });
    if (missing.length > 0 && info.email) {
      sendReminderEmail(tName, info.email, missing, today);
      remindersSent++;
    }
  });

  Logger.log('Reminder cron: ' + remindersSent + ' teachers reminded');
}

// 4:30 PM — Auto-send team emails (even if incomplete)
function cronAutoSend() {
  var today = new Date().toISOString().split('T')[0];
  var teamsSheet = getSheet(SHEETS.TEAMS);
  if (!teamsSheet) return;

  var teamData = teamsSheet.getDataRange().getValues();
  var emailsSent = 0;
  var missingReport = [];

  for (var i = 1; i < teamData.length; i++) {
    var teamName = String(teamData[i][0] || '').trim();
    var coachEmail = String(teamData[i][1] || '').trim();
    var coachName = String(teamData[i][2] || '').trim();
    var playerIds = String(teamData[i][3] || '').trim().split(',').map(function(s) { return s.trim(); }).filter(Boolean);

    if (!teamName || !playerIds.length) continue;

    // Build report
    var hrSheet = getSheet(SHEETS.HOMERUNS);
    var hrData = hrSheet ? hrSheet.getDataRange().getValues() : [];
    var report = [];
    var allDone = true;

    playerIds.forEach(function(pid) {
      var found = false;
      for (var j = 1; j < hrData.length; j++) {
        var d = String(hrData[j][1] || '').trim();
        var pId = String(hrData[j][7] || '').trim();
        if (d === today && pId === pid) {
          report.push({
            playerId: pid,
            playerName: String(hrData[j][2] || ''),
            status: String(hrData[j][6] || 'homeRun'),
            teacher: String(hrData[j][5] || '')
          });
          found = true;
          break;
        }
      }
      if (!found) {
        allDone = false;
        var player = getPlayerById(pid);
        report.push({ playerId: pid, playerName: player ? player.name : pid, status: 'noInput', teacher: 'No teacher input' });
      }
    });

    // Email coach
    if (coachEmail) {
      sendTeamReportEmail(teamName, coachEmail, coachName, report, today, allDone);
      emailsSent++;
    }

    // Track incomplete for supervisor alert
    if (!allDone) {
      var missing = report.filter(function(r) { return r.status === 'noInput'; });
      missingReport.push({ teamName: teamName, coachName: coachName, missingCount: missing.length, total: report.length });
    }
  }

  // Alert supervisor about incomplete teams
  if (missingReport.length > 0 && SUPERVISOR_EMAIL) {
    sendSupervisorAlert(missingReport, today);
  }

  Logger.log('Auto-send cron: ' + emailsSent + ' coach emails sent, ' + missingReport.length + ' incomplete');
}

// ============================================
// EMAIL FUNCTIONS
// ============================================

function sendReminderEmail(teacherName, teacherEmail, missingPlayers, date) {
  if (!teacherEmail) return;

  var subject = '🏃 Reminder: Home Run Tracker — ' + missingPlayers.length + ' player(s) still need marking';
  var playersList = missingPlayers.map(function(p) { return '• ' + p.name + ' (' + p.team + ')'; }).join('\n');

  var body = 'Hi ' + teacherName + ',\n\n' +
    'This is a friendly reminder from the SLAM! Home Run Tracker.\n\n' +
    'You still have ' + missingPlayers.length + ' player(s) that need to be marked for ' + date + ':\n\n' +
    playersList + '\n\n' +
    'Please visit the tracker and mark them:\n' +
    'https://kennyhin.github.io/homerun-tracker/\n\n' +
    '⚠️ If not completed by 4:30 PM, the system will auto-submit with "No Input" and your supervisor will be notified.\n\n' +
    'Thank you!\nSLAM! Nevada Athletic Department';

  try {
    MailApp.sendEmail(teacherEmail, subject, body, { name: APP_NAME });
  } catch(e) { Logger.log('Failed to send reminder to ' + teacherEmail + ': ' + e.message); }
}

function sendTeamCoachEmail(teamName, date) {
  var team = getTeamByName(teamName);
  if (!team || !team.coachEmail) return;

  var hrSheet = getSheet(SHEETS.HOMERUNS);
  var hrData = hrSheet ? hrSheet.getDataRange().getValues() : [];
  var report = [];
  var hrCount = 0;

  team.playerIds.forEach(function(pid) {
    for (var j = 1; j < hrData.length; j++) {
      var d = String(hrData[j][1] || '').trim();
      var pId = String(hrData[j][7] || '').trim();
      if (d === date && pId === pid) {
        var status = String(hrData[j][6] || 'homeRun');
        report.push({
          playerName: String(hrData[j][2] || ''),
          status: status,
          teacher: String(hrData[j][5] || '')
        });
        if (status === 'homeRun') hrCount++;
        break;
      }
    }
  });

  var subject = '✅ Home Run Report: ' + teamName + ' — ' + date;
  var body = buildCoachEmailBody(teamName, date, report, hrCount, true);
  try {
    MailApp.sendEmail(team.coachEmail, subject, body, { name: APP_NAME });
  } catch(e) { Logger.log('Failed to send coach email: ' + e.message); }
}

function sendTeamReportEmail(teamName, coachEmail, coachName, report, date, allDone) {
  var hrCount = report.filter(function(r) { return r.status === 'homeRun'; }).length;
  var noHrCount = report.filter(function(r) { return r.status === 'noHomeRun'; }).length;
  var noInputCount = report.filter(function(r) { return r.status === 'noInput'; }).length;

  var subject = (allDone ? '✅' : '⚠️') + ' Home Run Report: ' + teamName + ' — ' + date + (allDone ? '' : ' (INCOMPLETE)');
  var body = buildCoachEmailBody(teamName, date, report, hrCount, allDone);

  try {
    MailApp.sendEmail(coachEmail, subject, body, { name: APP_NAME });
  } catch(e) { Logger.log('Failed to send team report: ' + e.message); }
}

function buildCoachEmailBody(teamName, date, report, hrCount, allDone) {
  var noHrCount = report.filter(function(r) { return r.status === 'noHomeRun'; }).length;
  var noInputCount = report.filter(function(r) { return r.status === 'noInput'; }).length;

  var body = 'Hi Coach,\n\n' +
    (allDone ? '🎉 All players have been rated!\n\n' : '⚠️ Some players are still missing ratings (shown as "No Input" below).\n\n') +
    'Team: ' + teamName + '\n' +
    'Date: ' + date + '\n' +
    'Total Players: ' + report.length + '\n\n' +
    '------------------------\n';

  report.forEach(function(r) {
    var icon = r.status === 'homeRun' ? '✅ Home Run' : (r.status === 'noHomeRun' ? '❌ No Home Run' : '⚪ No Input');
    body += icon + ' — ' + r.playerName;
    if (r.teacher) body += ' (Teacher: ' + r.teacher + ')';
    body += '\n';
  });

  body += '\n------------------------\n' +
    'Summary: ✅ ' + hrCount + ' Home Run | ❌ ' + noHrCount + ' No Home Run';
  if (noInputCount > 0) body += ' | ⚪ ' + noInputCount + ' No Input';
  body += '\n\nSLAM! Nevada Athletic Department';

  return body;
}

function sendSupervisorAlert(incompleteTeams, date) {
  if (!SUPERVISOR_EMAIL) return;

  var subject = '⚠️ Home Run Tracker — Incomplete Teams for ' + date;
  var body = 'Hi Kenny,\n\nThe following teams have incomplete player ratings for ' + date + ':\n\n';

  incompleteTeams.forEach(function(t) {
    body += '• ' + t.teamName + ' (Coach: ' + t.coachName + '): ' + t.missingCount + '/' + t.total + ' still pending\n';
  });

  body += '\nA report has been sent to coaches with "No Input" for unrated players.\n' +
    'Teachers were also sent a reminder at 2:00 PM.\n\n' +
    'SLAM Home Run Tracker';

  try {
    MailApp.sendEmail(SUPERVISOR_EMAIL, subject, body, { name: APP_NAME });
  } catch(e) { Logger.log('Failed to send supervisor alert: ' + e.message); }
}

// ============================================
// SHEET DATA HELPERS
// ============================================

function getPlayerById(playerId) {
  var sheet = getSheet(SHEETS.PLAYERS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if ('p_' + i === playerId) {
      return {
        id: 'p_' + i,
        name: String(data[i][0] || '').trim(),
        team: String(data[i][1] || '').trim(),
        grade: String(data[i][2] || '').trim(),
        teacher: String(data[i][3] || '').trim()
      };
    }
  }
  return null;
}

function getTeamByName(teamName) {
  var sheet = getSheet(SHEETS.TEAMS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === teamName) {
      return {
        teamName: teamName,
        coachEmail: String(data[i][1] || '').trim(),
        coachName: String(data[i][2] || '').trim(),
        playerIds: String(data[i][3] || '').trim().split(',').map(function(s) { return s.trim(); }).filter(Boolean)
      };
    }
  }
  return null;
}

function findHomeRunEntry(playerId, date) {
  var sheet = getSheet(SHEETS.HOMERUNS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var d = String(data[i][1] || '').trim();
    var pId = String(data[i][7] || '').trim();
    if (d === date && pId === playerID(playerId)) {
      return {
        playerName: String(data[i][2] || '').trim(),
        team: String(data[i][3] || '').trim(),
        status: String(data[i][6] || '').trim(),
        teacher: String(data[i][5] || '').trim()
      };
    }
  }
  return null;
}

function isTeamComplete(teamName, date) {
  var team = getTeamByName(teamName);
  if (!team || !team.playerIds.length) return false;

  var hrSheet = getSheet(SHEETS.HOMERUNS);
  if (!hrSheet) return false;
  var data = hrSheet.getDataRange().getValues();

  for (var p = 0; p < team.playerIds.length; p++) {
    var pid = team.playerIds[p];
    var found = false;
    for (var i = 1; i < data.length; i++) {
      var d = String(data[i][1] || '').trim();
      var pId = String(data[i][7] || '').trim();
      if (d === date && pId === playerID(pid)) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

// Strip "p_" prefix for comparison
function playerID(id) {
  return String(id || '').replace(/^p_/, '');
}

// ============================================
// SHEET HELPERS
// ============================================

function getSheet(name) {
  try {
    return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  } catch (e) { return null; }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*');
}

function sortGrade(a, b) {
  var order = { 'kinder': 0, 'kindergarten': 0, 'pre-k': -1 };
  var aKey = String(a).toLowerCase();
  var bKey = String(b).toLowerCase();
  if (order[aKey] !== undefined && order[bKey] !== undefined) return order[aKey] - order[bKey];
  if (order[aKey] !== undefined) return -1;
  if (order[bKey] !== undefined) return 1;
  var aNum = parseInt(aKey), bNum = parseInt(bKey);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return aKey.localeCompare(bKey);
}

// ============================================
// SETUP — Run once to create all sheets
// ============================================

function setupSheets() {
  var ss;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); }
  catch(e) { ss = SpreadsheetApp.create('SLAM Home Run Tracker'); }
  Logger.log('Sheet ID: ' + ss.getId());

  // PLAYERS sheet: Name | Team | Grade | Teacher
  var ps = ss.getSheetByName(SHEETS.PLAYERS);
  if (!ps) ps = ss.insertSheet(SHEETS.PLAYERS);
  if (ps.getLastRow() === 0) {
    ps.appendRow(['Player Name', 'Team', 'Grade', 'Teacher']);

    // Baseball Team
    ps.appendRow(['Alex Martinez', 'Baseball', '3rd Grade', 'Ms. Harris']);
    ps.appendRow(['Bella Chen', 'Baseball', '3rd Grade', 'Ms. Harris']);
    ps.appendRow(['Carlos Rivera', 'Baseball', '3rd Grade', 'Mr. Tauni']);
    ps.appendRow(['Diana Park', 'Baseball', '3rd Grade', 'Mr. Tauni']);
    ps.appendRow(['Ethan Brown', 'Baseball', '4th Grade', 'Ms. Harris']);
    ps.appendRow(['Fiona Lee', 'Baseball', '4th Grade', 'Mr. Tauni']);

    // Soccer Team
    ps.appendRow(['Gabriel Kim', 'Soccer', '1st Grade', 'Mrs. Davis']);
    ps.appendRow(['Hannah Wilson', 'Soccer', '1st Grade', 'Mrs. Davis']);
    ps.appendRow(['Isaac Torres', 'Soccer', '2nd Grade', 'Mr. Wilson']);
    ps.appendRow(['Jasmine Wright', 'Soccer', '2nd Grade', 'Mr. Wilson']);
    ps.appendRow(['Kevin Patel', 'Soccer', '2nd Grade', 'Mrs. Davis']);
    ps.appendRow(['Luna Nguyen', 'Soccer', '2nd Grade', 'Mr. Wilson']);

    // Basketball Team
    ps.appendRow(['Mason Clark', 'Basketball', '5th Grade', 'Ms. Garcia']);
    ps.appendRow(['Nora Singh', 'Basketball', '5th Grade', 'Ms. Garcia']);
    ps.appendRow(['Oscar Hernandez', 'Basketball', '4th Grade', 'Mr. Thompson']);
    ps.appendRow(['Paige Adams', 'Basketball', '4th Grade', 'Mr. Thompson']);
    ps.appendRow(['Quinn Foster', 'Basketball', '5th Grade', 'Ms. Garcia']);
    ps.appendRow(['Ruby James', 'Basketball', '4th Grade', 'Mr. Thompson']);

    // T-Ball Team
    ps.appendRow(['Sam Reed', 'T-Ball', 'Kinder', 'Ms. Smith']);
    ps.appendRow(['Tara Gomez', 'T-Ball', 'Kinder', 'Ms. Smith']);
    ps.appendRow(['Uma Patel', 'T-Ball', 'Kinder', 'Mr. Johnson']);
    ps.appendRow(['Victor Li', 'T-Ball', 'Kinder', 'Mr. Johnson']);
    ps.appendRow(['Will Torres', 'T-Ball', '1st Grade', 'Ms. Smith']);
    ps.appendRow(['Xena Wright', 'T-Ball', '1st Grade', 'Mr. Johnson']);
  }

  // TEAMS sheet: TeamName | CoachEmail | CoachName | PlayerIDs (comma-separated)
  var ts = ss.getSheetByName(SHEETS.TEAMS);
  if (!ts) ts = ss.insertSheet(SHEETS.TEAMS);
  if (ts.getLastRow() === 0) {
    ts.appendRow(['Team Name', 'Coach Email', 'Coach Name', 'Player IDs']);
    ts.appendRow(['Baseball', 'baseball.coach@slamnv.org', 'Coach Harris', 'p_2,p_3,p_4,p_5,p_6,p_7']);
    ts.appendRow(['Soccer', 'soccer.coach@slamnv.org', 'Coach Davis', 'p_8,p_9,p_10,p_11,p_12,p_13']);
    ts.appendRow(['Basketball', 'basketball.coach@slamnv.org', 'Coach Garcia', 'p_14,p_15,p_16,p_17,p_18,p_19']);
    ts.appendRow(['T-Ball', 'tball.coach@slamnv.org', 'Coach Smith', 'p_20,p_21,p_22,p_23,p_24,p_25']);
  }

  // TEACHERS sheet: Name | Email
  var tchs = ss.getSheetByName(SHEETS.TEACHERS);
  if (!tchs) tchs = ss.insertSheet(SHEETS.TEACHERS);
  if (tchs.getLastRow() === 0) {
    tchs.appendRow(['Teacher Name', 'Email']);
    tchs.appendRow(['Ms. Harris', 'harris@slamnv.org']);
    tchs.appendRow(['Mr. Tauni', 'tauni@slamnv.org']);
    tchs.appendRow(['Mrs. Davis', 'davis@slamnv.org']);
    tchs.appendRow(['Mr. Wilson', 'wilson@slamnv.org']);
    tchs.appendRow(['Ms. Garcia', 'garcia@slamnv.org']);
    tchs.appendRow(['Mr. Thompson', 'thompson@slamnv.org']);
    tchs.appendRow(['Ms. Smith', 'smith@slamnv.org']);
    tchs.appendRow(['Mr. Johnson', 'johnson@slamnv.org']);
  }

  // HOMERUNS sheet
  var hrs = ss.getSheetByName(SHEETS.HOMERUNS);
  if (!hrs) hrs = ss.insertSheet(SHEETS.HOMERUNS);
  if (hrs.getLastRow() === 0) {
    hrs.appendRow(['Timestamp', 'Date', 'Player Name', 'Team', 'Grade', 'Teacher', 'Status', 'Player ID']);
  }

  Logger.log('✅ All sheets created! Share this Sheet ID: ' + ss.getId());
  Logger.log('👉 Set this as SHEET_ID in the script.');
}

// ============================================
// TIME-BASED TRIGGERS SETUP (run once)
// ============================================

function createTimeTriggers() {
  // Remove existing triggers first
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // 2:00 PM — Teacher reminders
  ScriptApp.newTrigger('cronRemindTeachers')
    .timeBased()
    .atHour(14)
    .nearMinute(0)
    .everyDays(1)
    .create();

  // 4:30 PM — Auto-send (even incomplete)
  ScriptApp.newTrigger('cronAutoSend')
    .timeBased()
    .atHour(16)
    .nearMinute(30)
    .everyDays(1)
    .create();

  Logger.log('✅ Time triggers created!');
  Logger.log('  • 2:00 PM → Teacher reminders');
  Logger.log('  • 4:30 PM → Auto-send team emails + supervisor alert');
}
