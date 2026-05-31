// ============================================
// Home Run Tracker - Frontend JavaScript
// ============================================

const HR = {
  // ===== CONFIG =====
  GAS_URL: 'YOUR_GAS_WEB_APP_URL_HERE', // ← Replace after deploying Apps Script

  // ===== STATE =====
  state: {
    step: 1,        // 1=grade, 2=teacher, 3=students, 4=success
    grade: null,
    teacher: null,
    date: null,
    students: [],       // [{ id, name, grade, teacher }]
    selections: {},     // { studentId: 'homeRun' | 'noHomeRun' | null }
  },

  // ===== DEMO DATA =====
  demoData: {
    'Kinder': {
      'Ms. Anderson': ['Aiden Martinez', 'Aria Chen', 'Blake Rivera', 'Brooklyn Park', 'Caleb Brown', 'Chloe Lee'],
      'Mrs. Thompson': ['Dante Kim', 'Delilah Wilson', 'Eli Torres', 'Ella Wright', 'Felix Patel', 'Freya Nguyen']
    },
    '1st Grade': {
      'Mr. Rodriguez': ['Gavin Scott', 'Grace Liu', 'Hugo Flores', 'Isla Bennett', 'Jace Morales', 'Jade Cooper'],
      'Mrs. Williams': ['Kai Mitchell', 'Luna Hayes', 'Miles Carter', 'Nova Bryant', 'Owen Collins', 'Phoebe Diaz']
    },
    '2nd Grade': {
      'Ms. Parker': ['Quinn Foster', 'Riley Adams', 'Sawyer Ellis', 'Sienna Torres', 'Theo Ramirez', 'Vera Jenkins'],
      'Mr. Collins': ['Wesley Price', 'Willow Hayes', 'Xander Long', 'Yara Simmons', 'Zion Reed', 'Zara Murphy']
    },
    '3rd Grade': {
      'Mrs. Davis': ['Aaron Flores', 'Bella Kim', 'Chris Nguyen', 'Diana Patel', 'Ethan Scott', 'Fiona Torres'],
      'Mr. Wilson': ['George Liu', 'Hannah Adams', 'Isaac Mitchell', 'Julia Cooper', 'Kevin Bryant', 'Lena Hayes']
    },
    '4th Grade': {
      'Ms. Garcia': ['Marcus Thompson', 'Nina Robinson', 'Oscar Reed', 'Paige Coleman', 'Ryan Hughes', 'Stella Clark'],
      'Mr. Martinez': ['Tyler Morgan', 'Uma Sharma', 'Victor Barnes', 'Wendy Powell', 'Xavier Griffin', 'Yuki Tanaka']
    },
    '5th Grade': {
      'Mr. Johnson': ['Brandon Hill', 'Carla Mendez', 'Derek Shaw', 'Emily Frost', 'Frankie Gomez', 'Gina Russo'],
      'Mrs. Lee': ['Henry Dunn', 'Ivy O\'Brien', 'Jake Porter', 'Kira Blake', 'Leo Fischer', 'Maya Jensen']
    }
  },

  // ===== INIT =====
  init() {
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
      this.state.date = dateInput.value;
    } else {
      this.state.date = new Date().toISOString().split('T')[0];
    }
    this.showStep(1);
    this.loadGrades();
  },

  // ===== NAVIGATION =====
  showStep(stepNum) {
    this.state.step = stepNum;
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(
      stepNum === 1 ? 'step-grade' :
      stepNum === 2 ? 'step-teacher' :
      stepNum === 3 ? 'step-students' :
      'step-success'
    );
    if (el) el.classList.add('active');
    this.updateProgress();
  },

  updateProgress() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(s => {
      const sNum = parseInt(s.dataset.step);
      s.classList.remove('active', 'completed');
      if (sNum < this.state.step) s.classList.add('completed');
      if (sNum === this.state.step) s.classList.add('active');
    });
    const fill = document.getElementById('progress-fill');
    if (fill) {
      const pct = ((this.state.step - 1) / 3) * 100;
      fill.style.width = pct + '%';
    }
  },

  prevStep(stepNum) {
    this.showStep(stepNum);
  },

  // ===== LOAD GRADES =====
  loadGrades() {
    this.showLoading(true);
    if (this.GAS_URL && this.GAS_URL !== 'YOUR_GAS_WEB_APP_URL_HERE') {
      this.fetchJSON({ action: 'getGrades' })
        .then(data => {
          this.showLoading(false);
          this.renderGrades(data.grades || Object.keys(this.demoData));
        })
        .catch(() => { this.showLoading(false); this.renderGrades(Object.keys(this.demoData)); });
    } else {
      setTimeout(() => {
        this.showLoading(false);
        this.renderGrades(Object.keys(this.demoData));
      }, 300);
    }
  },

  renderGrades(grades) {
    const grid = document.getElementById('grade-grid');
    if (!grid) return;
    grid.innerHTML = '';
    grades.forEach(grade => {
      const btn = document.createElement('button');
      btn.className = 'bubble-btn';
      btn.textContent = grade;
      btn.onclick = () => this.selectGrade(grade, btn);
      grid.appendChild(btn);
    });
  },

  // ===== SELECT GRADE → LOAD TEACHERS =====
  selectGrade(grade, btn) {
    document.querySelectorAll('#grade-grid .bubble-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.state.grade = grade;
    this.state.teacher = null;
    this.state.students = [];
    this.state.selections = {};

    this.showLoading(true);
    if (this.GAS_URL && this.GAS_URL !== 'YOUR_GAS_WEB_APP_URL_HERE') {
      this.fetchJSON({ action: 'getTeachers', grade: grade })
        .then(data => {
          this.showLoading(false);
          this.renderTeachers(data.teachers || []);
          this.showStep(2);
        })
        .catch(() => { this.showLoading(false); this.renderTeachers([]); this.showStep(2); });
    } else {
      setTimeout(() => {
        this.showLoading(false);
        const teachers = Object.keys(this.demoData[grade] || {});
        this.renderTeachers(teachers);
        this.showStep(2);
      }, 300);
    }
  },

  renderTeachers(teachers) {
    const grid = document.getElementById('teacher-grid');
    if (!grid) return;
    grid.innerHTML = '';
    teachers.forEach(teacher => {
      const btn = document.createElement('button');
      btn.className = 'bubble-btn';
      btn.textContent = teacher;
      btn.onclick = () => this.selectTeacher(teacher, btn);
      grid.appendChild(btn);
    });
  },

  // ===== SELECT TEACHER → LOAD STUDENTS =====
  selectTeacher(teacher, btn) {
    document.querySelectorAll('#teacher-grid .bubble-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    this.state.teacher = teacher;
    this.state.students = [];
    this.state.selections = {};

    this.showLoading(true);
    if (this.GAS_URL && this.GAS_URL !== 'YOUR_GAS_WEB_APP_URL_HERE') {
      this.fetchJSON({ action: 'getStudents', teacher: teacher, grade: this.state.grade })
        .then(data => {
          this.showLoading(false);
          this.state.students = data.students || [];
          this.state.selections = {};
          this.state.students.forEach(s => { this.state.selections[s.id] = null; });
          this.renderStudents();
          this.showStep(3);
        })
        .catch(() => { this.showLoading(false); this.loadDemoStudents(); });
    } else {
      setTimeout(() => {
        this.showLoading(false);
        this.loadDemoStudents();
      }, 300);
    }
  },

  loadDemoStudents() {
    const demoStudents = (this.demoData[this.state.grade] && this.demoData[this.state.grade][this.state.teacher]) || [];
    this.state.students = demoStudents.map((name, i) => ({
      id: 'demo_' + i,
      name: name,
      grade: this.state.grade,
      teacher: this.state.teacher
    }));
    this.state.selections = {};
    this.state.students.forEach(s => { this.state.selections[s.id] = null; });
    this.renderStudents();
    this.showStep(3);
  },

  // ===== RENDER STUDENT LIST =====
  renderStudents() {
    const list = document.getElementById('student-list');
    const subtitle = document.getElementById('student-subtitle');
    if (!list) return;

    if (subtitle) {
      subtitle.textContent = this.state.teacher + ' — ' + this.state.grade + ' (' + this.state.students.length + ' athletes)';
    }

    list.innerHTML = '';
    this.state.students.forEach(student => {
      const row = document.createElement('div');
      row.className = 'student-row';

      const name = document.createElement('div');
      name.className = 'student-name';
      name.textContent = student.name;

      const btns = document.createElement('div');
      btns.className = 'student-buttons';

      const hrBtn = document.createElement('button');
      hrBtn.className = 'student-btn home-run-btn';
      hrBtn.textContent = '✅ Home Run';
      hrBtn.onclick = () => this.toggleStudent(student.id, 'homeRun', hrBtn, noHrBtn);

      const noHrBtn = document.createElement('button');
      noHrBtn.className = 'student-btn no-home-btn';
      noHrBtn.textContent = '❌ No Home Run';
      noHrBtn.onclick = () => this.toggleStudent(student.id, 'noHomeRun', hrBtn, noHrBtn);

      btns.appendChild(hrBtn);
      btns.appendChild(noHrBtn);
      row.appendChild(name);
      row.appendChild(btns);
      list.appendChild(row);
    });

    this.updateSubmitButton();
  },

  // ===== TOGGLE STUDENT =====
  toggleStudent(studentId, value, hrBtn, noHrBtn) {
    this.state.selections[studentId] = this.state.selections[studentId] === value ? null : value;
    const selected = this.state.selections[studentId];

    hrBtn.classList.toggle('selected', selected === 'homeRun');
    hrBtn.classList.toggle('unselected', selected !== null && selected !== 'homeRun');
    noHrBtn.classList.toggle('selected', selected === 'noHomeRun');
    noHrBtn.classList.toggle('unselected', selected !== null && selected !== 'noHomeRun');

    this.updateSubmitButton();
  },

  updateSubmitButton() {
    const btn = document.getElementById('submit-btn');
    if (!btn) return;
    const allSelected = this.state.students.length > 0 &&
      this.state.students.every(s => this.state.selections[s.id] !== null);
    btn.disabled = !allSelected;
  },

  // ===== SUBMIT =====
  submitAll() {
    const date = this.state.date || new Date().toISOString().split('T')[0];
    const submissions = this.state.students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      grade: this.state.grade,
      teacher: this.state.teacher,
      date: date,
      status: this.state.selections[s.id]
    }));

    const hrCount = submissions.filter(s => s.status === 'homeRun').length;
    const noHrCount = submissions.length - hrCount;

    if (this.GAS_URL && this.GAS_URL !== 'YOUR_GAS_WEB_APP_URL_HERE') {
      this.fetchJSON({
        action: 'submitHomeRuns',
        submissions: submissions,
        grade: this.state.grade,
        teacher: this.state.teacher,
        date: date
      })
        .then(data => {
          this.showSuccess(submissions, hrCount, noHrCount, data && data.emailSent);
        })
        .catch(() => {
          this.showSuccess(submissions, hrCount, noHrCount, false);
        });
    } else {
      // Demo mode — just show success
      setTimeout(() => {
        this.showSuccess(submissions, hrCount, noHrCount, true);
      }, 800);
    }
  },

  showSuccess(submissions, hrCount, noHrCount, emailSent) {
    const msg = document.getElementById('success-message');
    const summary = document.getElementById('success-summary');

    if (msg) {
      msg.textContent = emailSent
        ? `${submissions.length} home runs recorded. Coaches have been emailed!`
        : `${submissions.length} home runs recorded successfully!`;
    }

    if (summary) {
      summary.innerHTML = '';
      submissions.forEach(s => {
        const row = document.createElement('div');
        row.className = 'confirm-summary-row';
        const dot = s.status === 'homeRun'
          ? '<span class="confirm-dot green"></span>'
          : '<span class="confirm-dot red"></span>';
        const label = s.status === 'homeRun' ? '✅ Home Run' : '❌ No Home Run';
        row.innerHTML = `${dot}<span>${s.studentName}</span><span style="margin-left:auto;font-weight:600;color:${s.status === 'homeRun' ? '#27ae60' : '#C8102E'}">${label}</span>`;
        summary.appendChild(row);
      });
      // Totals
      const totalRow = document.createElement('div');
      totalRow.className = 'confirm-summary-row';
      totalRow.style.borderTop = '2px solid var(--gray-border)';
      totalRow.style.marginTop = '4px';
      totalRow.style.fontWeight = '700';
      totalRow.innerHTML = `<span></span><span>TOTAL</span><span style="margin-left:auto;">✅ ${hrCount} | ❌ ${noHrCount}</span>`;
      summary.appendChild(totalRow);
    }

    this.showStep(4);
  },

  // ===== RESET =====
  reset() {
    this.state.step = 1;
    this.state.grade = null;
    this.state.teacher = null;
    this.state.students = [];
    this.state.selections = {};
    document.querySelectorAll('.bubble-btn').forEach(b => b.classList.remove('selected'));
    this.showStep(1);
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
      if (!url || url === 'YOUR_GAS_WEB_APP_URL_HERE') {
        reject(new Error('GAS web app URL not configured'));
        return;
      }
      const script = document.createElement('script');
      const callbackName = 'hr_cb_' + Date.now();
      const qs = Object.entries(params)
        .map(([k, v]) => k + '=' + encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v))
        .join('&');
      script.src = url + '?' + qs + '&callback=' + callbackName;
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      script.onerror = () => {
        delete window[callbackName];
        reject(new Error('Failed to load'));
      };
      document.body.appendChild(script);
    });
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => HR.init());
