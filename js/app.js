/* app.js — منطق الصفحة الرئيسية: قائمة الامتحانات وإنشاء امتحان جديد */

document.addEventListener('DOMContentLoaded', () => {
  const examsGrid = document.getElementById('examsGrid');
  const emptyState = document.getElementById('emptyState');
  const newExamModal = document.getElementById('newExamModal');
  const newExamForm = document.getElementById('newExamForm');
  const newExamBtn = document.getElementById('newExamBtn');
  const newExamBtn2 = document.getElementById('newExamBtn2');
  const cancelNewExamBtn = document.getElementById('cancelNewExamBtn');

  function renderExams() {
    const exams = Storage.listExams();
    if (!exams.length) {
      examsGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    examsGrid.innerHTML = exams.map((exam) => {
      const stats = Storage.computeStats(exam);
      return `
      <a class="exam-card" href="exam.html?id=${encodeURIComponent(exam.id)}">
        <div class="exam-card-head">
          <h3>${Utils.escapeHtml(exam.name)}</h3>
          <button class="icon-btn danger delete-exam" data-id="${exam.id}" title="حذف الامتحان" type="button">🗑</button>
        </div>
        ${exam.subject ? `<div class="exam-card-subject">${Utils.escapeHtml(exam.subject)}</div>` : ''}
        <div class="exam-card-stats">
          <span>👥 ${stats.total} طالب</span>
          <span>✅ ${stats.graded} مصحّح</span>
          ${stats.average != null ? `<span>📊 متوسط ${stats.average.toFixed(1)}</span>` : ''}
        </div>
        <div class="exam-card-date">${Utils.formatDate(exam.createdAt)}</div>
      </a>`;
    }).join('');

    examsGrid.querySelectorAll('.delete-exam').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('هل تريد حذف هذا الامتحان وكل بيانات طلابه؟ لا يمكن التراجع عن هذا الإجراء.')) {
          Storage.deleteExam(id);
          renderExams();
          Utils.toast('تم حذف الامتحان.', 'success');
        }
      });
    });
  }

  function openNewExamModal() { newExamModal.classList.add('open'); }
  function closeNewExamModal() { newExamModal.classList.remove('open'); newExamForm.reset(); }

  newExamBtn && newExamBtn.addEventListener('click', openNewExamModal);
  newExamBtn2 && newExamBtn2.addEventListener('click', openNewExamModal);
  cancelNewExamBtn && cancelNewExamBtn.addEventListener('click', closeNewExamModal);
  newExamModal.addEventListener('click', (e) => { if (e.target === newExamModal) closeNewExamModal(); });

  newExamForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const settings = Storage.getSettings();
    if (!settings.apiKey) {
      Utils.toast('أدخل مفتاح Anthropic API من الإعدادات ⚙️ قبل إنشاء امتحان.', 'error');
      return;
    }
    const name = document.getElementById('examNameInput').value.trim();
    const subject = document.getElementById('examSubjectInput').value.trim();
    const maxScore = document.getElementById('examMaxScoreInput').value;
    const instructions = document.getElementById('examInstructionsInput').value.trim();
    const exam = Storage.createExam({ name, subject, maxScore, instructions });
    window.location.href = `exam.html?id=${encodeURIComponent(exam.id)}`;
  });

  renderExams();
  window.onSettingsSaved = renderExams;
});
