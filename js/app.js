// ============================================
// Home Run Tracker - Frontend JavaScript
// Teams-based: teachers see their players (flat list),
// system groups by team for coach emails.
// ============================================

const HR = {
  // ===== CONFIG =====
  GAS_URL: 'YOUR_GAS_WEB_APP_URL_HERE', // ← Replace after deploying Apps Script

  // ===== STATE =====
  state: {
    step: 'grade',
    grade: null,
    teacher: null,
    date: null,
    players: [],       // [{ id, name, team, grade, teacher }]
    selections: {},    // { playerId: 'homeRun' | 'noHomeRun' | null }
  },

  // ===== INIT =====
  init() {
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
      this.state.date = dateInput.value;
      dateInput.addEventListener('change', (e) => { this.state.date = e.target.value; });
    }
    this.showStep('grade');
    this.loadGrades();
  },

  // ===== NAVIGATION =====
  showStep(step) {
    this.state.step = step;
    document.querySelectorAll('.step-section').forEach(s => s.style.display = 'none');
    const el = document.getElementById('step-' + step);
    if (el) el.style.display = '';
    this.updateProgressBar(step);
  },

  updateProgressBar(step) {
    const steps = ['grade', 'teacher', 'players', 'success'];
    const currentIdx = steps.indexOf(step);
    document.querySelectorAll('.progress-step').forEach(function(el, idx) {
      el.classList.remove('active', 'completed');
      if (idx < currentIdx) el.classList.add('completed');
      else if (idx === currentIdx) el.classList.add('active');
    });
    const bar = document.getElementById('progress-fill');
    if (bar) {
      const pct = currentIdx === 0 ? 0 : (currentIdx / (steps.length - 1)) * 100;
      bar.style.width = pct + '%';
    }
  },

  // ===== LOAD GRADES =====
  loadGrades() {
    this.showLoading(true);
    this.fetchJSON({ action: 'getGrades' })
      .then(data => {
        this.showLoading(false);
        if (data.error) { alert('Error: ' + data.error); return; }
        this.renderGrades(data.grades || []);
      })
      .catch(err => {
        this.showLoading(false);
        this.renderGrades(['Kinder', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade']);
      });
  },

  renderGrades(grades) {
    const grid = document.getElementById('grade-grid');
    if (!grid) return;
    grid.innerHTML = '';
    grades.forEach(grade => {
      const btn = document.createElement('button');
      btn.className = 'grade-btn';
      btn.textContent = grade;
      btn.onclick = () => this.selectGrade(grade);
      grid.appendChild(btn);
    });
  },

  // ===== SELECT GRADE → LOAD TEACHERS =====
  selectGrade(grade) {
    this.state.grade = grade;
    this.state.teacher = null;
    this.state.players = [];
    this.state.selections = {};

    this.showLoading(true);
    this.fetchJSON({ action: 'getTeachers', grade: grade })
      .then(data => {
        this.showLoading(false);
        if (data.error) { alert('Error: ' + data.error); return; }
        document.getElementById('teacher-subtitle').textContent = 'Who are you? (' + grade + ')';
        this.renderTeachers(data.teachers || []);
        this.showStep('teacher');
      })
      .catch(err => {
        this.showLoading(false);
        this.renderTeachers(['Ms. Harris', 'Mr. Tauni', 'Mrs. Davis', 'Mr. Wilson']);
        document.getElementById('teacher-subtitle').textContent = 'Who are you? (' + grade + ')';
        this.showStep('teacher');
      });
  },

  renderTeachers(teachers) {
    const grid = document.getElementById('teacher-grid');
    if (!grid) return;
    grid.innerHTML = '';
    teachers.forEach(teacher => {
      const btn = document.createElement('button');
      btn.className = 'teacher-btn';
      btn.textContent = teacher;
      btn.onclick = () => this.selectTeacher(teacher);
      grid.appendChild(btn);
    });
  },

  // ===== SELECT TEACHER → LOAD PLAYERS =====
  selectTeacher(teacher) {
    this.state.teacher = teacher;
    this.state.players = [];
    this.state.selections = {};

    this.showLoading(true);
    this.fetchJSON({ action: 'getPlayers', teacher: teacher, grade: this.state.grade })
      .then(data => {
        this.showLoading(false);
        if (data.error) { alert('Error: ' + data.error); return; }
        this.state.players = data.players || [];
        this.state.selections = {};
        this.state.players.forEach(p => { this.state.selections[p.id] = null; });
        document.getElementById('players-subtitle').textContent =
          teacher + ' — ' + this.state.grade + ' (' + this.state.players.length + ' players)';
        this.renderPlayers();
        this.showStep('players');
        this.updateSubmitButton();
      })
      .catch(err => {
        this.showLoading(false);
        // Demo players for this teacher
        var demoTeams = ['Baseball', 'Soccer', 'Basketball', 'T-Ball'];
        var demoNames = ['Alex Martinez', 'Bella Chen', 'Carlos Rivera', 'Diana Park', 'Ethan Brown', 'Fiona Lee'];
        this.state.players = demoNames.map(function(name, i) {
          return {
            id: 'demo_' + i,
            name: name,
            team: demoTeams[i % demoTeams.length],
            grade: this.state.grade,
            teacher: teacher
          };
        }.bind(this));
        this.state.selections = {};
        this.state.players.forEach(p => { this.state.selections[p.id] = null; });
        document.getElementById('players-subtitle').textContent =
          teacher + ' — ' + this.state.grade + ' (' + this.state.players.length + ' players)';
        this.renderPlayers();
        this.showStep('players');
        this.updateSubmitButton();
      });
  },

  // ===== RENDER PLAYER LIST =====
  renderPlayers() {
    const list = document.getElementById('player-list');
    if (!list) return;
    list.innerHTML = '';

    this.state.players.forEach(player => {
      const row = document.createElement('div');
      row.className = 'player-row';

      const info = document.createElement('div');
      info.className = 'player-info';

      const name = document.createElement('div');
      name.className = 'player-name';
      name.textContent = player.name;

      const meta = document.createElement('div');
      meta.className = 'player-meta';
      meta.textContent = (player.team ? player.team : '') + (player.team && player.teacher ? ' • ' : '') + (player.teacher || '');

      info.appendChild(name);
      info.appendChild(meta);

      const btns = document.createElement('div');
      btns.className = 'player-buttons';

      const hrBtn = document.createElement('button');
      hrBtn.className = 'player-btn hr-btn';
      hrBtn.textContent = '✅ Home Run';
      hrBtn.onclick = () => this.togglePlayer(player.id, 'homeRun', hrBtn, noHrBtn);

      const noHrBtn = document.createElement('button');
      noHrBtn.className = 'player-btn no-hr-btn';
      noHrBtn.textContent = '❌ No Home Run';
      noHrBtn.onclick = () => this.togglePlayer(player.id, 'noHomeRun', hrBtn, noHrBtn);

      btns.appendChild(hrBtn);
      btns.appendChild(noHrBtn);
      row.appendChild(info);
      row.appendChild(btns);
      list.appendChild(row);
    });
  },

  // ===== TOGGLE PLAYER =====
  togglePlayer(playerId, value, hrBtn, noHrBtn) {
    this.state.selections[playerId] = this.state.selections[playerId] === value ? null : value;
    const selected = this.state.selections[playerId];

    hrBtn.classList.toggle('selected', selected === 'homeRun');
    hrBtn.classList.toggle('unselected', selected !== null && selected !== 'homeRun');
    noHrBtn.classList.toggle('selected', selected === 'noHomeRun');
    noHrBtn.classList.toggle('unselected', selected !== null && selected !== 'noHomeRun');

    this.updateSubmitButton();
  },

  updateSubmitButton() {
    const btn = document.getElementById('submit-btn');
    const allSelected = this.state.players.length > 0 &&
      this.state.players.every(p => this.state.selections[p.id] !== null);
    btn.disabled = !allSelected;
  },

  // ===== SUBMIT =====
  submitAll() {
    const date = this.state.date || new Date().toISOString().split('T')[0];
    const submissions = this.state.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      team: p.team,
      grade: this.state.grade,
      teacher: this.state.teacher,
      date: date,
      status: this.state.selections[p.id]
    }));

    const status = document.getElementById('submit-status');
    status.textContent = 'Submitting...';

    this.fetchJSON({
      action: 'submitHomeRuns',
      submissions: submissions,
      grade: this.state.grade,
      teacher: this.state.teacher,
      date: date
    })
      .then(data => {
        if (data.error) {
          status.textContent = '❌ Error: ' + data.error;
          status.style.color = '#e74c3c';
          return;
        }
        var msg = '✅ ' + submissions.length + ' players marked!';
        if (data.emailsSent > 0) {
          msg += ' 📧 ' + data.emailsSent + ' coach email(s) sent!';
        } else {
          msg += ' ⏳ Coach email will send when all players are rated.';
        }
        document.getElementById('success-message').textContent = msg;
        this.showSuccessSummary(submissions);
        this.showStep('success');
      })
      .catch(err => {
        status.textContent = '❌ Submission failed. Please try again.';
        status.style.color = '#e74c3c';
      });
  },

  showSuccessSummary(submissions) {
    const container = document.getElementById('success-summary');
    if (!container) return;
    container.innerHTML = '';
    submissions.forEach(function(s) {
      const row = document.createElement('div');
      row.className = 'summary-row';
      const icon = s.status === 'homeRun' ? '✅ Home Run' : '❌ No Home Run';
      const color = s.status === 'homeRun' ? '#2ecc71' : '#e74c3c';
      row.innerHTML = '<span class="summary-name">' + s.playerName + '</span>' +
        '<span class="summary-team">' + (s.team || '') + '</span>' +
        '<span class="summary-status" style="color:' + color + '">' + icon + '</span>';
      container.appendChild(row);
    });
  },

  // ===== RESET =====
  reset() {
    this.state.step = 'grade';
    this.state.grade = null;
    this.state.teacher = null;
    this.state.players = [];
    this.state.selections = {};
    document.getElementById('submit-status').textContent = '';
    document.getElementById('submit-status').style.color = '#666';
    this.showStep('grade');
    this.loadGrades();
  },

  // ===== HELPERS =====
  showLoading(show) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = show ? 'flex' : 'none';
  },

  fetchJSON(params) {
    return new Promise((resolve, reject) => {
      const url = this.GAS_URL;
      if (!url || url.indexOf('YOUR_GAS_WEB_APP') > -1) {
        // Demo mode — simulate success
        setTimeout(function() {
          resolve({ success: true, count: params.submissions ? params.submissions.length : 0, emailsSent: 0 });
        }, 800);
        return;
      }
      const script = document.createElement('script');
      const cb = 'hr_cb_' + Date.now();
      script.src = url + '?action=' + encodeURIComponent(params.action || '') +
        '&callback=' + cb + '&data=' + encodeURIComponent(JSON.stringify(params));
      window[cb] = function(data) { delete window[cb]; resolve(data); };
      script.onerror = function() { delete window[cb]; reject(new Error('Failed')); };
      document.body.appendChild(script);
    });
  }
};

document.addEventListener('DOMContentLoaded', function() { HR.init(); });
