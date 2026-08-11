/* storage.js — طبقة تخزين البيانات في المتصفح (localStorage) */

const Storage = (() => {
  const KEY = 'tashih:data:v1';

  const MODELS = [
    { id: 'claude-opus-5', label: 'Claude Opus 5 — الأدق (موصى به)' },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — متوازن' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — الأسرع والأرخص' },
  ];

  function defaultData() {
    return {
      settings: { apiKey: '', model: 'claude-opus-5', keepImages: false },
      exams: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultData();
      const parsed = JSON.parse(raw);
      const data = defaultData();
      data.settings = Object.assign(data.settings, parsed.settings || {});
      data.exams = Array.isArray(parsed.exams) ? parsed.exams : [];
      return data;
    } catch (e) {
      console.error('تعذرت قراءة البيانات المحفوظة', e);
      return defaultData();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      console.error('تعذر حفظ البيانات (قد تكون المساحة المخصصة للمتصفح ممتلئة)', e);
      window.dispatchEvent(new CustomEvent('storage-quota-error', { detail: e }));
      return { ok: false, error: e };
    }
  }

  function getSettings() {
    return load().settings;
  }

  function saveSettings(patch) {
    const data = load();
    data.settings = Object.assign(data.settings, patch);
    return save(data);
  }

  function listExams() {
    return load().exams.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function getExam(id) {
    return load().exams.find((e) => e.id === id) || null;
  }

  function createExam({ name, subject, maxScore, instructions }) {
    const data = load();
    const exam = {
      id: Utils.genId('exam'),
      name: name || 'امتحان بدون اسم',
      subject: subject || '',
      maxScore: Number(maxScore) || 100,
      instructions: instructions || '',
      createdAt: new Date().toISOString(),
      questionImage: null,
      answerKeyImage: null,
      students: [],
    };
    data.exams.push(exam);
    save(data);
    return exam;
  }

  function updateExam(id, patch) {
    const data = load();
    const exam = data.exams.find((e) => e.id === id);
    if (!exam) return { ok: false };
    Object.assign(exam, patch);
    return save(data);
  }

  function deleteExam(id) {
    const data = load();
    data.exams = data.exams.filter((e) => e.id !== id);
    return save(data);
  }

  function addStudent(examId, { name, image }) {
    const data = load();
    const exam = data.exams.find((e) => e.id === examId);
    if (!exam) return null;
    const student = {
      id: Utils.genId('stu'),
      name: name || 'طالب بدون اسم',
      image,
      status: 'pending', // pending | grading | graded | error
      result: null,
      error: null,
      override: null, // { score, note }
      gradedAt: null,
      addedAt: new Date().toISOString(),
    };
    exam.students.push(student);
    save(data);
    return student;
  }

  function updateStudent(examId, studentId, patch) {
    const data = load();
    const exam = data.exams.find((e) => e.id === examId);
    if (!exam) return { ok: false };
    const student = exam.students.find((s) => s.id === studentId);
    if (!student) return { ok: false };
    Object.assign(student, patch);
    const result = save(data);
    return Object.assign(result, { student });
  }

  function deleteStudent(examId, studentId) {
    const data = load();
    const exam = data.exams.find((e) => e.id === examId);
    if (!exam) return { ok: false };
    exam.students = exam.students.filter((s) => s.id !== studentId);
    return save(data);
  }

  function computeStats(exam) {
    const total = exam.students.length;
    const graded = exam.students.filter((s) => s.status === 'graded');
    const scores = graded.map((s) => (s.override ? s.override.score : (s.result ? s.result.total_score : 0)));
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const highest = scores.length ? Math.max(...scores) : null;
    const lowest = scores.length ? Math.min(...scores) : null;
    return {
      total,
      graded: graded.length,
      pending: exam.students.filter((s) => s.status === 'pending').length,
      errors: exam.students.filter((s) => s.status === 'error').length,
      average,
      highest,
      lowest,
    };
  }

  function exportAllJson() {
    return JSON.stringify(load(), null, 2);
  }

  function importAllJson(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.exams)) {
        throw new Error('bad shape');
      }
      return save(parsed);
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  function estimateUsageKb() {
    try {
      const raw = localStorage.getItem(KEY) || '';
      return Math.round((raw.length * 2) / 1024); // تقدير تقريبي (UTF-16)
    } catch (e) {
      return 0;
    }
  }

  return {
    MODELS,
    load,
    save,
    getSettings,
    saveSettings,
    listExams,
    getExam,
    createExam,
    updateExam,
    deleteExam,
    addStudent,
    updateStudent,
    deleteStudent,
    computeStats,
    exportAllJson,
    importAllJson,
    estimateUsageKb,
  };
})();
