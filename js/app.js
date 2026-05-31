// ============================================
// Home Run Tracker - Frontend JavaScript
// Works in DEMO mode (no backend) or LIVE mode (GAS backend)
// ============================================

const HR = {
  // ===== CONFIG =====
  GAS_URL: '', // ← Set to your GAS Web App URL to enable live mode. Leave empty for demo.

  // ===== DEMO DATA =====
  DEMO_DATA: {
    'Kinder': {
      'Ms. Anderson': ['Emma Johnson', 'Liam Smith', 'Olivia Brown', 'Noah Davis', 'Ava Wilson', 'Ethan Moore'],
      'Mr. Bradley': ['Sophia Taylor', 'Mason Clark', 'Isabella White', 'Lucas Harris', 'Mia Martin', 'Logan Garcia']
    },
    '1st Grade': {
      'Ms. Carter': ['Aiden Martinez', 'Charlotte Robinson', 'Elijah Lewis', 'Amelia Walker', 'James Hall', 'Harper Allen'],
      'Mr. Donovan': ['Benjamin Young', 'Evelyn King', 'Sebastian Wright', 'Abigail Scott', 'Jack Green', 'Emily Adams']
    },
    '2nd Grade': {
      'Ms. Evans': ['Henry Baker', 'Elizabeth Gonzalez', 'Alexander Nelson', 'Sofia Carter', 'Daniel Mitchell', 'Avery Perez'],
      'Mr. Foster': ['Matthew Roberts', 'Ella Turner', 'Samuel Phillips', 'Scarlett Campbell', 'David Parker', 'Grace Edwards']
    },
    '3rd Grade': {
      'Ms. Green': ['Joseph Collins', 'Chloe Stewart', 'Carter Sanchez', 'Victoria Morris', 'Owen Rogers', 'Aria Reed'],
      'Mr. Hayes': ['Wyatt Cook', 'Madison Morgan', 'John Bell', 'Layla Murphy', 'Luke Bailey', 'Penelope Rivera']
    },
    '4th Grade': {
      'Ms. Ingram': ['Gabriel Cooper', 'Riley Richardson', 'Julian Cox', 'Zoey Ward', 'Levi Peterson', 'Nora Gray'],
      'Mr. Jenkins': ['Isaac Ramirez', 'Lily James', 'Lincoln Watson', 'Aubrey Brooks', 'Mateo Kelly', 'Hannah Sanders']
    },
    '5th Grade': {
      'Ms. Kelly': ['Jaxon Price', 'Addison Bennett', 'Christopher Wood', 'Ellie Barnes', 'Theodore Ross', 'Stella Henderson'],
      'Mr. Lawrence': ['Ezra Coleman', 'Natalie Jenkins', 'Hudson Perry', 'Leah Powell', 'Andrew Patterson', 'Audrey Hughes']
    }
  },

  // ===== STATE =====
  state: {
    step: 'grade',
    grade: null,
    teacher: null,
    date: null,
    students: [],
    selections: {},
    isLive: false
  },

  // ===== INIT =====
  init() {
    this.state.isLive = this.GAS_URL && this.GAS_URL.indexOf('YOUR_GAS') === -1;

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
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('step-' + step);
    if (el) {
      el.style.display = '';
      el.classList.add('active');
    }
  },

  // ===== LOAD GRADES =====
  loadGrades() {
    if (this.state.isLive) {
      this.showLoading(true);
      this.fetchJSON({ action: 'getGrades' })
        .then(data => {
          this.showLoading(false);
          if (data.error) { alert('Error: ' + data.error); return; }
          this.renderGrades(data.grades || []);
        })
        .catch(err => {
          this.showLoading(false);
          console.error(err);
          this.useDemoGrades();
        });
    } else {
      this.useDemoGrades();
    }
  },

  useDemoGrades() {
    const grades = Object.keys(this.DEMO_DATA).sort(this.sortGrade);
    this.renderGrades(grades);
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

    if (this.state.isLive) {
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
          this.useDemoTeachers(grade);
        });
    } else {
      this.useDemoTeachers(grade);
    }
  },

  useDemoTeachers(grade) {
    const teachers = Object.keys(this.DEMO_DATA[grade] || {});
    document.getElementById('teacher-subtitle').textContent = grade + ' Teachers';
    this.renderTeachers(teachers);
    this.showStep('teacher');
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

    if (this.state.isLive) {
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
          this.useDemoStudents(teacher);
        });
    } else {
      this.useDemoStudents(teacher);
    }
  },

  useDemoStudents(teacher) {
    const names = this.DEMO_DATA[this.state.grade][teacher] || [];
    this.state.students = names.map((name, i) => ({
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

    if (this.state.isLive) {
      // Live mode: save to GAS backend + email coaches
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
          this.showSuccess(submissions, !!data.emailSent);
        })
        .catch(err => {
          console.error(err);
          status.textContent = 'Live submission failed. Please try again.';
          status.style.color = '#c0392b';
        });
    } else {
      // Demo mode: simulate success
      setTimeout(() => {
        this.showSuccess(submissions, false);
        console.log('DEMO SUBMISSION:', JSON.stringify(submissions, null, 2));
      }, 800);
    }
  },

  showSuccess(submissions, emailSent) {
    const hrCount = submissions.filter(s => s.status === 'homeRun').length;
    const noHrCount = submissions.length - hrCount;
    let msg = '✅ ' + submissions.length + ' home runs recorded!\n';
    msg += '✅ ' + hrCount + ' Home Run | ❌ ' + noHrCount + ' No Home Run\n';
    if (emailSent) msg += '\n📧 Coaches have been emailed!';
    else msg += '\n📧 (Demo mode — email not sent)';

    document.getElementById('success-message').textContent =
      submissions.length + ' home runs recorded!' +
      (emailSent ? ' Coaches have been emailed.' : '');

    document.getElementById('success-detail').innerHTML =
      '<hr style="margin:12px 0;border:1px solid #eee"/>' +
      '<p>' + hrCount + ' ✅ Home Run | ' + noHrCount + ' ❌ No Home Run</p>' +
      '<p style="font-size:0.85rem;color:#999;margin-top:8px;">' +
      (emailSent ? '📧 Coaches notified' : '📧 Demo mode — connect Google Apps Script backend to enable email') +
      '</p>';

    this.showStep('success');
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
      if (!url || url.indexOf('YOUR_GAS') !== -1) {
        reject(new Error('GAS web app URL not configured'));
        return;
      }
      const script = document.createElement('script');
      const callbackName = 'hr_cb_' + Date.now();
      const paramStr = Object.entries(params)
        .map(([k, v]) => {
          const val = typeof v === 'object' ? JSON.stringify(v) : (v || '');
          return k + '=' + encodeURIComponent(val);
        })
        .join('&');
      script.src = url + '?action=' + encodeURIComponent(params.action) +
        '&callback=' + callbackName + '&' + paramStr;
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
  },

  sortGrade(a, b) {
    var order = { 'kinder': 0, 'kindergarten': 0, 'pre-k': -1, 'pk': -1 };
    var aKey = String(a).toLowerCase();
    var bKey = String(b).toLowerCase();
    if (order[aKey] !== undefined && order[bKey] !== undefined) return order[aKey] - order[bKey];
    if (order[aKey] !== undefined) return -1;
    if (order[bKey] !== undefined) return 1;
    var aNum = parseInt(aKey);
    var bNum = parseInt(bKey);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return aKey.localeCompare(bKey);
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => HR.init());
