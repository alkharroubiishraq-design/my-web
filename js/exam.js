/* exam.js — منطق صفحة الامتحان: الصور، الطلاب، التصحيح، التفاصيل والتصدير */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const examId = params.get('id');
  let exam = examId ? Storage.getExam(examId) : null;

  if (!exam) {
    document.body.innerHTML = '<div class="empty-state"><p>لم يتم العثور على هذا الامتحان.</p><a class="btn btn-primary" href="index.html">العودة للرئيسية</a></div>';
    return;
  }

  // ---------- عناصر DOM ----------
  const examTitle = document.getElementById('examTitle');
  const examMeta = document.getElementById('examMeta');
  const editExamBtn = document.getElementById('editExamBtn');
  const editExamModal = document.getElementById('editExamModal');
  const editExamForm = document.getElementById('editExamForm');
  const cancelEditExamBtn = document.getElementById('cancelEditExamBtn');

  const questionImageInput = document.getElementById('questionImageInput');
  const questionImagePreview = document.getElementById('questionImagePreview');
  const removeQuestionImageBtn = document.getElementById('removeQuestionImageBtn');
  const answerKeyImageInput = document.getElementById('answerKeyImageInput');
  const answerKeyImagePreview = document.getElementById('answerKeyImagePreview');
  const removeAnswerKeyImageBtn = document.getElementById('removeAnswerKeyImageBtn');

  const addStudentForm = document.getElementById('addStudentForm');
  const studentNameInput = document.getElementById('studentNameInput');
  const studentImageInput = document.getElementById('studentImageInput');

  const gradeAllBtn = document.getElementById('gradeAllBtn');
  const studentsTableBody = document.getElementById('studentsTableBody');
  const noStudents = document.getElementById('noStudents');
  const statsBar = document.getElementById('statsBar');

  const exportExcelBtn = document.getElementById('exportExcelBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  const studentDetailModal = document.getElementById('studentDetailModal');
  const studentDetailBody = document.getElementById('studentDetailBody');
  const closeStudentDetailBtn = document.getElementById('closeStudentDetailBtn');

  let currentDetailStudentId = null;

  // ---------- عرض ----------
  function refreshExam() {
    exam = Storage.getExam(examId);
  }

  function renderHeader() {
    examTitle.textContent = exam.name;
    const bits = [];
    if (exam.subject) bits.push(exam.subject);
    bits.push(`العلامة الكاملة: ${exam.maxScore}`);
    examMeta.textContent = bits.join(' — ');
  }

  function renderImages() {
    renderImageZone(exam.questionImage, questionImagePreview, removeQuestionImageBtn);
    renderImageZone(exam.answerKeyImage, answerKeyImagePreview, removeAnswerKeyImageBtn);
  }

  function renderImageZone(image, previewEl, removeBtn) {
    if (image) {
      previewEl.src = image.dataUrl;
      previewEl.style.display = 'block';
      removeBtn.style.display = 'inline-flex';
    } else {
      previewEl.style.display = 'none';
      previewEl.src = '';
      removeBtn.style.display = 'none';
    }
  }

  function statusBadge(s) {
    const map = {
      pending: ['badge-pending', 'بانتظار التصحيح'],
      grading: ['badge-grading', 'جارٍ التصحيح…'],
      graded: ['badge-graded', 'تم التصحيح ✓'],
      error: ['badge-error', 'حدث خطأ'],
    };
    const [cls, label] = map[s.status] || ['badge-pending', s.status];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function studentScore(s) {
    if (s.override && typeof s.override.score === 'number') return s.override.score;
    if (s.result) return s.result.total_score;
    return null;
  }

  function renderStudents() {
    const students = exam.students;
    if (!students.length) {
      studentsTableBody.innerHTML = '';
      noStudents.style.display = 'block';
    } else {
      noStudents.style.display = 'none';
      studentsTableBody.innerHTML = students.map((s) => {
        const score = studentScore(s);
        const scoreCell = score != null ? `${score} / ${s.result ? s.result.max_score : exam.maxScore}` : '—';
        let actions = `<button class="btn btn-ghost btn-sm view-detail" data-id="${s.id}">التفاصيل</button>`;
        if (s.image && (s.status === 'pending' || s.status === 'error')) {
          actions = `<button class="btn btn-primary btn-sm grade-one" data-id="${s.id}">${s.status === 'error' ? 'إعادة المحاولة' : 'تصحيح'}</button>` + actions;
        } else if (s.image && s.status === 'graded') {
          actions = `<button class="btn btn-ghost btn-sm grade-one" data-id="${s.id}">إعادة التصحيح</button>` + actions;
        }
        actions += `<button class="icon-btn danger delete-student" data-id="${s.id}" title="حذف">🗑</button>`;
        return `
        <tr>
          <td data-label="الاسم">${Utils.escapeHtml(s.name)}</td>
          <td data-label="الحالة">${statusBadge(s)}${s.status === 'error' && s.error ? `<div class="error-note">${Utils.escapeHtml(s.error)}</div>` : ''}</td>
          <td data-label="العلامة">${scoreCell}</td>
          <td data-label="الإجراءات" class="actions-cell">${actions}</td>
        </tr>`;
      }).join('');
    }

    studentsTableBody.querySelectorAll('.grade-one').forEach((btn) => {
      btn.addEventListener('click', () => gradeOne(btn.dataset.id));
    });
    studentsTableBody.querySelectorAll('.view-detail').forEach((btn) => {
      btn.addEventListener('click', () => openStudentDetail(btn.dataset.id));
    });
    studentsTableBody.querySelectorAll('.delete-student').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا الطالب من الامتحان؟')) {
          Storage.deleteStudent(examId, btn.dataset.id);
          refreshExam();
          renderAll();
        }
      });
    });

    renderStats();
  }

  function renderStats() {
    const stats = Storage.computeStats(exam);
    statsBar.innerHTML = `
      <span>👥 ${stats.total} طالب</span>
      <span>✅ ${stats.graded} تم تصحيحهم</span>
      <span>⏳ ${stats.pending} بانتظار التصحيح</span>
      ${stats.average != null ? `<span>📊 المتوسط: ${stats.average.toFixed(1)}</span>` : ''}
      ${stats.highest != null ? `<span>⬆️ الأعلى: ${stats.highest}</span>` : ''}
      ${stats.lowest != null ? `<span>⬇️ الأدنى: ${stats.lowest}</span>` : ''}
    `;
  }

  function renderAll() {
    renderHeader();
    renderImages();
    renderStudents();
  }

  // ---------- تعديل بيانات الامتحان ----------
  editExamBtn.addEventListener('click', () => {
    document.getElementById('editExamNameInput').value = exam.name;
    document.getElementById('editExamSubjectInput').value = exam.subject || '';
    document.getElementById('editExamMaxScoreInput').value = exam.maxScore;
    document.getElementById('editExamInstructionsInput').value = exam.instructions || '';
    editExamModal.classList.add('open');
  });
  cancelEditExamBtn.addEventListener('click', () => editExamModal.classList.remove('open'));
  editExamModal.addEventListener('click', (e) => { if (e.target === editExamModal) editExamModal.classList.remove('open'); });
  editExamForm.addEventListener('submit', (e) => {
    e.preventDefault();
    Storage.updateExam(examId, {
      name: document.getElementById('editExamNameInput').value.trim() || exam.name,
      subject: document.getElementById('editExamSubjectInput').value.trim(),
      maxScore: Number(document.getElementById('editExamMaxScoreInput').value) || exam.maxScore,
      instructions: document.getElementById('editExamInstructionsInput').value.trim(),
    });
    refreshExam();
    renderHeader();
    editExamModal.classList.remove('open');
    Utils.toast('تم تحديث بيانات الامتحان.', 'success');
  });

  // ---------- صور الامتحان ----------
  questionImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const image = await Utils.compressImageFile(file);
      Storage.updateExam(examId, { questionImage: image });
      refreshExam();
      renderImages();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
    questionImageInput.value = '';
  });
  removeQuestionImageBtn.addEventListener('click', () => {
    Storage.updateExam(examId, { questionImage: null });
    refreshExam();
    renderImages();
  });

  answerKeyImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const image = await Utils.compressImageFile(file);
      Storage.updateExam(examId, { answerKeyImage: image });
      refreshExam();
      renderImages();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
    answerKeyImageInput.value = '';
  });
  removeAnswerKeyImageBtn.addEventListener('click', () => {
    Storage.updateExam(examId, { answerKeyImage: null });
    refreshExam();
    renderImages();
  });

  // ---------- إضافة طالب ----------
  addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = studentNameInput.value.trim();
    const file = studentImageInput.files[0];
    if (!name || !file) {
      Utils.toast('أدخل اسم الطالب واختر صورة ورقته.', 'error');
      return;
    }
    try {
      const image = await Utils.compressImageFile(file);
      Storage.addStudent(examId, { name, image });
      refreshExam();
      renderStudents();
      addStudentForm.reset();
      Utils.toast(`تمت إضافة ${name}.`, 'success');
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  });

  // ---------- التصحيح ----------
  async function gradeOne(studentId, opts = {}) {
    refreshExam();
    if (!exam.answerKeyImage) {
      Utils.toast('ارفع صورة الإجابة النموذجية أولاً.', 'error');
      return;
    }
    const settings = Storage.getSettings();
    if (!settings.apiKey) {
      Utils.toast('أدخل مفتاح Anthropic API من الإعدادات ⚙️ أولاً.', 'error');
      return;
    }
    const student = exam.students.find((s) => s.id === studentId);
    if (!student || !student.image) {
      Utils.toast('لا توجد صورة محفوظة لهذا الطالب لإعادة التصحيح.', 'error');
      return;
    }
    Storage.updateStudent(examId, studentId, { status: 'grading', error: null });
    refreshExam();
    renderStudents();
    try {
      const result = await ClaudeAPI.gradeStudent(exam, student, settings);
      const patch = { status: 'graded', result, gradedAt: new Date().toISOString(), error: null, override: null };
      if (!settings.keepImages) patch.image = null;
      Storage.updateStudent(examId, studentId, patch);
      if (!opts.silent) Utils.toast(`تم تصحيح ورقة ${student.name}.`, 'success');
    } catch (err) {
      Storage.updateStudent(examId, studentId, { status: 'error', error: err.message });
      Utils.toast(`فشل تصحيح ${student.name}: ${err.message}`, 'error');
    }
    refreshExam();
    renderStudents();
  }

  gradeAllBtn.addEventListener('click', async () => {
    refreshExam();
    if (!exam.answerKeyImage) {
      Utils.toast('ارفع صورة الإجابة النموذجية أولاً.', 'error');
      return;
    }
    const settings = Storage.getSettings();
    if (!settings.apiKey) {
      Utils.toast('أدخل مفتاح Anthropic API من الإعدادات ⚙️ أولاً.', 'error');
      return;
    }
    const targets = exam.students.filter((s) => (s.status === 'pending' || s.status === 'error') && s.image);
    if (!targets.length) {
      Utils.toast('لا يوجد طلاب بحاجة إلى تصحيح.', 'info');
      return;
    }
    gradeAllBtn.disabled = true;
    const originalLabel = gradeAllBtn.textContent;
    for (let i = 0; i < targets.length; i += 1) {
      gradeAllBtn.textContent = `جارٍ التصحيح… (${i + 1}/${targets.length})`;
      // eslint-disable-next-line no-await-in-loop
      await gradeOne(targets[i].id, { silent: true });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 400));
    }
    gradeAllBtn.textContent = originalLabel;
    gradeAllBtn.disabled = false;
    Utils.toast('انتهى تصحيح جميع الطلاب.', 'success');
  });

  // ---------- تفاصيل الطالب ----------
  function openStudentDetail(studentId) {
    refreshExam();
    const student = exam.students.find((s) => s.id === studentId);
    if (!student) return;
    currentDetailStudentId = studentId;

    const confidenceLabel = { high: 'ثقة عالية', medium: 'ثقة متوسطة', low: 'ثقة منخفضة' };
    const score = studentScore(student);

    let body = `<h2>${Utils.escapeHtml(student.name)}</h2>`;
    if (student.status === 'error') {
      body += `<p class="error-note">${Utils.escapeHtml(student.error || 'حدث خطأ أثناء التصحيح.')}</p>`;
    } else if (!student.result) {
      body += '<p>لم يتم تصحيح هذه الورقة بعد.</p>';
    } else {
      const r = student.result;
      body += `
        <div class="detail-score">
          <span class="detail-score-num">${score}</span>
          <span class="detail-score-den">/ ${r.max_score}</span>
          ${r.confidence ? `<span class="badge badge-pending">${confidenceLabel[r.confidence] || r.confidence}</span>` : ''}
        </div>
        <p>${Utils.escapeHtml(r.overall_feedback)}</p>
        <table class="detail-table">
          <thead><tr><th>السؤال</th><th>العلامة</th><th>الملاحظة</th></tr></thead>
          <tbody>
            ${r.questions.map((q) => `<tr><td>${Utils.escapeHtml(q.number)}</td><td>${Utils.escapeHtml(q.score)} / ${Utils.escapeHtml(q.max)}</td><td>${Utils.escapeHtml(q.feedback)}</td></tr>`).join('')}
          </tbody>
        </table>
        <form id="overrideForm" class="override-form">
          <h4>تعديل يدوي (اختياري)</h4>
          <div class="form-row">
            <label>العلامة النهائية بعد التعديل
              <input type="number" id="overrideScoreInput" step="0.5" value="${student.override ? student.override.score : r.total_score}">
            </label>
          </div>
          <label>ملاحظة المعلم
            <textarea id="overrideNoteInput" rows="2">${Utils.escapeHtml(student.override ? student.override.note : '')}</textarea>
          </label>
          <button type="submit" class="btn btn-primary btn-sm">حفظ التعديل</button>
        </form>`;
    }
    studentDetailBody.innerHTML = body;

    const overrideForm = document.getElementById('overrideForm');
    if (overrideForm) {
      overrideForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawScore = Number(document.getElementById('overrideScoreInput').value);
        const scoreVal = Number.isFinite(rawScore) ? rawScore : studentScore(student) ?? 0;
        const note = document.getElementById('overrideNoteInput').value.trim();
        Storage.updateStudent(examId, currentDetailStudentId, { override: { score: scoreVal, note } });
        refreshExam();
        renderStudents();
        Utils.toast('تم حفظ التعديل.', 'success');
      });
    }

    studentDetailModal.classList.add('open');
  }
  closeStudentDetailBtn.addEventListener('click', () => studentDetailModal.classList.remove('open'));
  studentDetailModal.addEventListener('click', (e) => { if (e.target === studentDetailModal) studentDetailModal.classList.remove('open'); });

  // ---------- التصدير ----------
  exportExcelBtn.addEventListener('click', () => { refreshExam(); ExportUtil.toExcel(exam); });
  printReportBtn.addEventListener('click', () => { refreshExam(); ExportUtil.toPrintableReport(exam); });

  renderAll();
});
