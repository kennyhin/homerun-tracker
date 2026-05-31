// ============================================
// Home Run Tracker - Frontend JavaScript
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
    students: [],       // [{ id, name, grade, teacher }]
    selections: {},     // { studentId: 'homeRun' | 'noHomeRun' | null }
  },

  // ===== INIT =====
  init() {
    // Set default date to today
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
      this.state.date = dateInput.value;
      dateInput.addEventListener('change', (e) => {
        this.state.date = e.target.value;
      });
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
  },

  // ===== LOAD GRADES =====
  loadGrades() {
    this.showLoading(true);
    this.fetchJSON({ action: 'getGrades' })
      .then(data => {
        this.showLoading(false);
        if (data.error) {
          alert('Error: ' + data.error);
          return;
        }
        this.renderGrades(data.grades || []);
      })
      .catch(err => {
        this.showLoading(false);
        console.error(err);
        // Demo data if GAS not connected yet
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
    this.state.students = [];
    this.state.selections = {};

    this.showLoading(true);
    this.fetchJSON({ action: 'getTeachers', grade: grade })
      .then(data => {
        this.showLoading(false);
        if (data.error) { alert('Error: ' + data.error); return; }
        document.getElementById('teacher-subtitle').textContent = grade + ' Teachers';
        this.renderTeachers(data.teachers || []);
        this.showStep('teacher');
      })
      .catch(err => {
        this.showLoading(false);
        console.error(err);
        // Demo teachers
        this.renderTeachers(['Ms. Smith', 'Mr. Johnson', 'Mrs. Davis', 'Mr. Wilson']);
        document.getElementById('teacher-subtitle').textContent = grade + ' Teachers';
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

  // ===== SELECT TEACHER → LOAD STUDENTS =====
  selectTeacher(teacher) {
    this.state.teacher = teacher;
    this.state.students = [];
    this.state.selections = {};

    this.showLoading(true);
    this.fetchJSON({ action: 'getStudents', teacher: teacher, grade: this.state.grade })
      .then(data => {
        this.showLoading(false);
        if (data.error) { alert('Error: ' + data.error); return; }
        this.state.students = data.students || [];
        this.state.selections = {};
        this.state.students.forEach(s => { this.state.selections[s.id] = null; });
        document.getElementById('student-subtitle').textContent =
          teacher + ' — ' + this.state.grade + ' (' + this.state.students.length + ' athletes)';
        this.renderStudents();
        this.showStep('students');
        this.updateSubmitButton();
      })
      .catch(err => {
        this.showLoading(false);
        console.error(err);
        // Demo students
        const demoNames = ['Alex Martinez', 'Bella Chen', 'Carlos Rivera', 'Diana Park', 'Ethan Brown', 'Fiona Lee', 'Gabriel Kim', 'Hannah Wilson'];
        this.state.students = demoNames.map((name, i) => ({
          id: 'demo_' + i,
          name: name,
          grade: this.state.grade,
          teacher: teacher
        }));
        this.state.selections = {};
        this.state.students.forEach(s => { this.state.selections[s.id] = null; });
        document.getElementById('student-subtitle').textContent =
          teacher + ' — ' + this.state.grade + ' (' + this.state.students.length + ' athletes)';
        this.renderStudents();
        this.showStep('students');
        this.updateSubmitButton();
      });
  },

  // ===== RENDER STUDENT LIST =====
  renderStudents() {
    const list = document.getElementById('student-list');
    if (!list) return;
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
          status.textContent = 'Error: ' + data.error;
          status.style.color = '#c0392b';
          return;
        }
        document.getElementById('success-message').textContent =
          data.emailSent
            ? `✅ ${submissions.length} home runs recorded. Coaches have been emailed!`
            : `✅ ${submissions.length} home runs recorded successfully!`;
        this.showStep('success');
      })
      .catch(err => {
        console.error(err);
        status.textContent = 'Submission failed. Please try again.';
        status.style.color = '#c0392b';
      });
  },

  // ===== RESET =====
  reset() {
    this.state.step = 'grade';
    this.state.grade = null;
    this.state.teacher = null;
    this.state.students = [];
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
      if (!url || url === 'YOUR_GAS_WEB_APP_URL_HERE') {
        reject(new Error('GAS web app URL not configured'));
        return;
      }
      // Use JSONP-style approach for cross-origin GAS
      const script = document.createElement('script');
      const callbackName = 'hr_cb_' + Date.now();
      const paramStr = Object.entries(params)
        .map(([k, v]) => k + '=' + encodeURIComponent(JSON.stringify(v || '')))
        .join('&');
      script.src = url + '?action=' + encodeURIComponent(params.action) +
        '&callback=' + callbackName + '&' + paramStr.substring(paramStr.indexOf('&') + 1);
      window[callbackName] = (data) => {
        delete window[callbackName];
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
