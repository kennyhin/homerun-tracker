// ============================================
// Home Run Tracker - Fully Static Demo
// All data baked in. Swap GAS_URL for live backend.
// ============================================

var DEMO_DATA = {
  grades: {
    'Kinder': {
      teachers: {
        'Ms. Harris': [
          {name:'Alex Martinez', team:'Baseball'},
          {name:'Bella Chen', team:'Soccer'},
          {name:'Carlos Rivera', team:'T-Ball'},
          {name:'Diana Park', team:'Baseball'},
          {name:'Ethan Brown', team:'Soccer'},
          {name:'Fiona Lee', team:'T-Ball'}
        ],
        'Mr. Thompson': [
          {name:'Gabriel Kim', team:'Baseball'},
          {name:'Hannah Wilson', team:'Soccer'},
          {name:'Isaac Torres', team:'T-Ball'},
          {name:'Jasmine Wright', team:'Baseball'},
          {name:'Kevin Patel', team:'Soccer'},
          {name:'Luna Nguyen', team:'T-Ball'}
        ]
      }
    },
    '1st Grade': {
      teachers: {
        'Ms. Williams': [
          {name:'Maya Johnson', team:'Soccer'},
          {name:'Noah Garcia', team:'Baseball'},
          {name:'Olivia Smith', team:'Basketball'},
          {name:'Pablo Ruiz', team:'Soccer'},
          {name:'Quinn Davis', team:'Baseball'},
          {name:'Rosa Martinez', team:'Basketball'}
        ],
        'Mr. Lee': [
          {name:'Sam Torres', team:'T-Ball'},
          {name:'Tina Chang', team:'Baseball'},
          {name:'Umar Hassan', team:'Soccer'},
          {name:'Vera Popov', team:'T-Ball'},
          {name:'Will Jones', team:'Baseball'},
          {name:'Xena Lopez', team:'Soccer'}
        ]
      }
    },
    '2nd Grade': {
      teachers: {
        'Mrs. Davis': [
          {name:'Yara Ahmed', team:'Basketball'},
          {name:'Zane Cooper', team:'Baseball'},
          {name:'Ava Thompson', team:'Soccer'},
          {name:'Blake Foster', team:'T-Ball'},
          {name:'Cora Mitchell', team:'Basketball'},
          {name:'Dylan Reed', team:'Baseball'}
        ],
        'Ms. Patel': [
          {name:'Elena Volkov', team:'Soccer'},
          {name:'Felix Nguyen', team:'T-Ball'},
          {name:'Grace Kang', team:'Baseball'},
          {name:'Hugo Alvarez', team:'Soccer'},
          {name:'Iris Okafor', team:'T-Ball'},
          {name:'Jake Wilson', team:'Baseball'}
        ]
      }
    },
    '3rd Grade': {
      teachers: {
        'Mr. Wilson': [
          {name:'Kira Nakamura', team:'Baseball'},
          {name:'Leo Petrov', team:'Soccer'},
          {name:'Mia Santos', team:'Basketball'},
          {name:'Nathan Kim', team:'Baseball'},
          {name:'Opal Jenkins', team:'Soccer'},
          {name:'Peter Chang', team:'Basketball'}
        ],
        'Mrs. Garcia': [
          {name:'Quincy Adams', team:'T-Ball'},
          {name:'Ruby Tanaka', team:'Baseball'},
          {name:'Sean Murphy', team:'Soccer'},
          {name:'Tara Singh', team:'T-Ball'},
          {name:'Ulric Johansson', team:'Baseball'},
          {name:'Violet Chen', team:'Soccer'}
        ]
      }
    },
    '4th Grade': {
      teachers: {
        'Ms. Martinez': [
          {name:'Wade Morris', team:'Basketball'},
          {name:'Xia Wu', team:'Baseball'},
          {name:'Yosef Levy', team:'Soccer'},
          {name:'Zara Idris', team:'T-Ball'},
          {name:'Aaron Blake', team:'Basketball'},
          {name:'Bianca Costa', team:'Baseball'}
        ],
        'Mr. Robinson': [
          {name:'Caleb Dunn', team:'Soccer'},
          {name:'Dalia Mahmoud', team:'T-Ball'},
          {name:'Eli Hoffman', team:'Baseball'},
          {name:'Farah Osei', team:'Soccer'},
          {name:'Grant Phillips', team:'T-Ball'},
          {name:'Hana Yoshida', team:'Baseball'}
        ]
      }
    },
    '5th Grade': {
      teachers: {
        'Mrs. Taylor': [
          {name:'Ivan Kozlov', team:'Baseball'},
          {name:'Julia Fernández', team:'Soccer'},
          {name:'Kyle Washington', team:'Basketball'},
          {name:'Lina Svensson', team:'Baseball'},
          {name:'Miguel Reyes', team:'Soccer'},
          {name:'Nadia Ahmadi', team:'Basketball'}
        ],
        'Mr. Anderson': [
          {name:'Oscar Nilsson', team:'T-Ball'},
          {name:'Priya Sharma', team:'Baseball'},
          {name:'Ravi Gupta', team:'Soccer'},
          {name:'Sofia Papadopoulos', team:'T-Ball'},
          {name:'Tyler Brooks', team:'Baseball'},
          {name:'Ursula Weber', team:'Soccer'}
        ]
      }
    }
  }
};

var HR = {
  GAS_URL: '', // Set to GAS web app URL when ready

  state: {
    grade: null,
    teacher: null,
    players: [],
    selections: {}
  },

  init: function() {
    var dateInput = document.getElementById('date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    this.showGradeStep();
    this.renderGrades();
  },

  // ---- NAVIGATION ----
  showGradeStep: function() {
    this.hideAll();
    document.getElementById('step-grade').style.display = '';
  },
  showTeacherStep: function() {
    this.hideAll();
    document.getElementById('step-teacher').style.display = '';
  },
  showPlayersStep: function() {
    this.hideAll();
    document.getElementById('step-players').style.display = '';
  },
  showSuccessStep: function() {
    this.hideAll();
    document.getElementById('step-success').style.display = '';
  },
  hideAll: function() {
    var steps = document.querySelectorAll('.step-section');
    for (var i = 0; i < steps.length; i++) {
      steps[i].style.display = 'none';
    }
  },

  backToGrade: function() { this.showGradeStep(); },
  backToTeacher: function() { this.showTeacherStep(); },

  // ---- RENDER GRADES ----
  renderGrades: function() {
    var grid = document.getElementById('grade-grid');
    grid.innerHTML = '';
    var grades = Object.keys(DEMO_DATA.grades);
    for (var i = 0; i < grades.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'grade-btn';
      btn.textContent = grades[i];
      btn.onclick = (function(g) { return function() { HR.selectGrade(g); }; })(grades[i]);
      grid.appendChild(btn);
    }
  },

  // ---- SELECT GRADE ----
  selectGrade: function(grade) {
    this.state.grade = grade;
    this.state.teacher = null;
    this.state.players = [];
    this.state.selections = {};

    document.getElementById('teacher-subtitle').textContent = grade + ' Teachers';
    this.renderTeachers(grade);
    this.showTeacherStep();
  },

  // ---- RENDER TEACHERS ----
  renderTeachers: function(grade) {
    var grid = document.getElementById('teacher-grid');
    grid.innerHTML = '';
    var teachers = Object.keys(DEMO_DATA.grades[grade].teachers);
    for (var i = 0; i < teachers.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'teacher-btn';
      btn.textContent = teachers[i];
      btn.onclick = (function(t) { return function() { HR.selectTeacher(t); }; })(teachers[i]);
      grid.appendChild(btn);
    }
  },

  // ---- SELECT TEACHER ----
  selectTeacher: function(teacher) {
    this.state.teacher = teacher;
    this.state.players = [];
    this.state.selections = {};

    var playersData = DEMO_DATA.grades[this.state.grade].teachers[teacher];
    for (var i = 0; i < playersData.length; i++) {
      var p = playersData[i];
      var player = {
        id: 'p_' + i,
        name: p.name,
        team: p.team,
        grade: this.state.grade,
        teacher: teacher
      };
      this.state.players.push(player);
      this.state.selections[player.id] = null;
    }

    document.getElementById('players-subtitle').textContent =
      teacher + ' — ' + this.state.grade + ' (' + this.state.players.length + ' players)';
    this.renderPlayers();
    this.showPlayersStep();
    this.updateSubmitButton();
  },

  // ---- RENDER PLAYERS ----
  renderPlayers: function() {
    var list = document.getElementById('player-list');
    list.innerHTML = '';
    for (var i = 0; i < this.state.players.length; i++) {
      var player = this.state.players[i];
      var row = document.createElement('div');
      row.className = 'player-row';

      var info = document.createElement('div');
      info.className = 'player-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'player-name';
      nameEl.textContent = player.name;

      var metaEl = document.createElement('div');
      metaEl.className = 'player-meta';
      metaEl.textContent = player.team + ' • ' + player.teacher;

      info.appendChild(nameEl);
      info.appendChild(metaEl);

      var btns = document.createElement('div');
      btns.className = 'player-buttons';

      var hrBtn = document.createElement('button');
      hrBtn.className = 'player-btn hr-btn';
      hrBtn.textContent = '✅ Home Run';

      var noHrBtn = document.createElement('button');
      noHrBtn.className = 'player-btn no-hr-btn';
      noHrBtn.textContent = '❌ No Home Run';

      (function(pid, hBtn, nBtn) {
        hBtn.onclick = function() { HR.togglePlayer(pid, 'homeRun', hBtn, nBtn); };
        nBtn.onclick = function() { HR.togglePlayer(pid, 'noHomeRun', hBtn, nBtn); };
      })(player.id, hrBtn, noHrBtn);

      btns.appendChild(hrBtn);
      btns.appendChild(noHrBtn);
      row.appendChild(info);
      row.appendChild(btns);
      list.appendChild(row);
    }
  },

  // ---- TOGGLE PLAYER ----
  togglePlayer: function(playerId, value, hrBtn, noHrBtn) {
    this.state.selections[playerId] = (this.state.selections[playerId] === value) ? null : value;
    var sel = this.state.selections[playerId];

    hrBtn.classList.toggle('selected', sel === 'homeRun');
    hrBtn.classList.toggle('unselected', sel !== null && sel !== 'homeRun');
    noHrBtn.classList.toggle('selected', sel === 'noHomeRun');
    noHrBtn.classList.toggle('unselected', sel !== null && sel !== 'noHomeRun');

    this.updateSubmitButton();
  },

  updateSubmitButton: function() {
    var btn = document.getElementById('submit-btn');
    var allDone = this.state.players.length > 0;
    for (var i = 0; i < this.state.players.length; i++) {
      if (this.state.selections[this.state.players[i].id] === null) {
        allDone = false;
        break;
      }
    }
    btn.disabled = !allDone;
  },

  // ---- SUBMIT ----
  submitAll: function() {
    var date = document.getElementById('date-input').value;
    var submissions = [];
    for (var i = 0; i < this.state.players.length; i++) {
      var p = this.state.players[i];
      submissions.push({
        playerId: p.id,
        playerName: p.name,
        team: p.team,
        grade: this.state.grade,
        teacher: this.state.teacher,
        date: date,
        status: this.state.selections[p.id]
      });
    }

    // Show success
    var hrCount = 0;
    for (var j = 0; j < submissions.length; j++) {
      if (submissions[j].status === 'homeRun') hrCount++;
    }

    document.getElementById('success-message').textContent =
      submissions.length + ' players submitted! ' +
      hrCount + ' ✅ Home Run, ' + (submissions.length - hrCount) + ' ❌ No Home Run.' +
      ' 📧 Coaches will be notified.';

    this.renderSuccessSummary(submissions);
    this.showSuccessStep();
  },

  renderSuccessSummary: function(submissions) {
    var container = document.getElementById('success-summary');
    container.innerHTML = '';
    for (var i = 0; i < submissions.length; i++) {
      var s = submissions[i];
      var row = document.createElement('div');
      row.className = 'summary-row';
      var icon = s.status === 'homeRun' ? '✅ Home Run' : '❌ No Home Run';
      var color = s.status === 'homeRun' ? '#27ae60' : '#e74c3c';
      row.innerHTML =
        '<span class="summary-name">' + s.playerName + '</span>' +
        '<span class="summary-team">' + s.team + '</span>' +
        '<span class="summary-status" style="color:' + color + '">' + icon + '</span>';
      container.appendChild(row);
    }
  },

  // ---- RESET ----
  reset: function() {
    this.state.grade = null;
    this.state.teacher = null;
    this.state.players = [];
    this.state.selections = {};
    this.showGradeStep();
  }
};

document.addEventListener('DOMContentLoaded', function() { HR.init(); });
