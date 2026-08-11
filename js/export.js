/* export.js — تصدير النتائج إلى Excel أو صفحة قابلة للطباعة/حفظ كـ PDF */

const ExportUtil = (() => {
  function statusLabel(s) {
    return {
      pending: 'لم يُصحح بعد',
      grading: 'جارٍ التصحيح',
      graded: 'تم التصحيح',
      error: 'حدث خطأ',
    }[s] || s;
  }

  function studentScore(student) {
    if (student.override && typeof student.override.score === 'number') return student.override.score;
    if (student.result) return student.result.total_score;
    return null;
  }

  function toExcel(exam) {
    if (typeof XLSX === 'undefined') {
      Utils.toast('تعذر تحميل مكتبة تصدير Excel. تحقق من الاتصال بالإنترنت.', 'error');
      return;
    }
    const rows = exam.students.map((s) => ({
      'اسم الطالب': s.name,
      الحالة: statusLabel(s.status),
      العلامة: studentScore(s) ?? '',
      من: s.result ? s.result.max_score : exam.maxScore,
      'ملاحظة المعلم': s.override && s.override.note ? s.override.note : '',
      'الملاحظة العامة (AI)': s.result ? s.result.overall_feedback : (s.error || ''),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 30 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'النتائج');
    XLSX.writeFile(wb, `${exam.name}-نتائج.xlsx`);
  }

  function questionsTableHtml(result) {
    if (!result || !result.questions || !result.questions.length) return '';
    const rows = result.questions.map((q) => `
      <tr>
        <td>${Utils.escapeHtml(q.number)}</td>
        <td>${Utils.escapeHtml(q.score)} / ${Utils.escapeHtml(q.max)}</td>
        <td>${Utils.escapeHtml(q.feedback)}</td>
      </tr>`).join('');
    return `<table class="print-subtable">
      <thead><tr><th>السؤال</th><th>العلامة</th><th>الملاحظة</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function toPrintableReport(exam) {
    const stats = Storage.computeStats(exam);
    const rows = exam.students.map((s) => {
      const score = studentScore(s);
      return `
      <div class="print-student">
        <div class="print-student-head">
          <h3>${Utils.escapeHtml(s.name)}</h3>
          <span class="print-score">${score ?? '—'} / ${s.result ? s.result.max_score : exam.maxScore}</span>
        </div>
        ${s.override && s.override.note ? `<p class="print-note"><strong>ملاحظة المعلم:</strong> ${Utils.escapeHtml(s.override.note)}</p>` : ''}
        ${s.result ? `<p class="print-note">${Utils.escapeHtml(s.result.overall_feedback)}</p>` : ''}
        ${s.result ? questionsTableHtml(s.result) : `<p class="print-note">${Utils.escapeHtml(s.error || statusLabel(s.status))}</p>`}
      </div>`;
    }).join('');

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>تقرير - ${Utils.escapeHtml(exam.name)}</title>
<style>
  body { font-family: 'Tajawal', Arial, sans-serif; color:#1f2937; padding: 24px; }
  h1 { margin-bottom: 4px; }
  .meta { color:#555; margin-bottom: 20px; }
  .summary { display:flex; gap:16px; margin-bottom: 24px; flex-wrap: wrap; }
  .summary div { background:#f4f4f2; border-radius:10px; padding:10px 16px; }
  .print-student { border:1px solid #ddd; border-radius:10px; padding:14px; margin-bottom:14px; page-break-inside: avoid; }
  .print-student-head { display:flex; justify-content:space-between; align-items:center; }
  .print-score { font-weight:bold; font-size: 1.1em; }
  .print-note { color:#444; margin: 6px 0; }
  table.print-subtable { width:100%; border-collapse: collapse; margin-top:8px; }
  table.print-subtable th, table.print-subtable td { border:1px solid #ddd; padding:6px 8px; text-align:right; font-size: 0.92em; }
  @media print { body { padding: 6px; } }
</style>
</head>
<body>
  <h1>${Utils.escapeHtml(exam.name)}</h1>
  <div class="meta">${exam.subject ? `المادة: ${Utils.escapeHtml(exam.subject)} — ` : ''}العلامة الكاملة: ${exam.maxScore}</div>
  <div class="summary">
    <div>عدد الطلاب: ${stats.total}</div>
    <div>تم تصحيحهم: ${stats.graded}</div>
    <div>المتوسط: ${stats.average != null ? stats.average.toFixed(1) : '—'}</div>
    <div>الأعلى: ${stats.highest ?? '—'}</div>
    <div>الأدنى: ${stats.lowest ?? '—'}</div>
  </div>
  ${rows || '<p>لا يوجد طلاب بعد.</p>'}
  <script>window.onload = () => setTimeout(() => window.print(), 300);<\/script>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) {
      Utils.toast('يرجى السماح بالنوافذ المنبثقة لهذا الموقع لعرض التقرير.', 'error');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return { toExcel, toPrintableReport };
})();
