/* common.js — عناصر مشتركة بين الصفحات: نافذة الإعدادات والنسخ الاحتياطي */

const Common = (() => {
  function initSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    const openBtn = document.getElementById('openSettingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const form = document.getElementById('settingsForm');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const toggleKeyBtn = document.getElementById('toggleKeyBtn');
    const modelSelect = document.getElementById('modelSelect');
    const keepImagesInput = document.getElementById('keepImagesInput');
    const usageEl = document.getElementById('storageUsage');
    const exportBackupBtn = document.getElementById('exportBackupBtn');
    const importBackupInput = document.getElementById('importBackupInput');

    if (modelSelect) {
      modelSelect.innerHTML = Storage.MODELS.map((m) => `<option value="${m.id}">${Utils.escapeHtml(m.label)}</option>`).join('');
    }

    function fillForm() {
      const s = Storage.getSettings();
      apiKeyInput.value = s.apiKey || '';
      modelSelect.value = s.model || 'claude-opus-5';
      keepImagesInput.checked = !!s.keepImages;
      if (usageEl) usageEl.textContent = `المساحة المستخدمة تقريباً: ${Storage.estimateUsageKb()} KB`;
    }

    function open() {
      fillForm();
      modal.classList.add('open');
    }
    function close() {
      modal.classList.remove('open');
    }

    openBtn && openBtn.addEventListener('click', open);
    closeBtn && closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    toggleKeyBtn && toggleKeyBtn.addEventListener('click', () => {
      apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    });

    form && form.addEventListener('submit', (e) => {
      e.preventDefault();
      Storage.saveSettings({
        apiKey: apiKeyInput.value.trim(),
        model: modelSelect.value,
        keepImages: keepImagesInput.checked,
      });
      Utils.toast('تم حفظ الإعدادات.', 'success');
      close();
      if (window.onSettingsSaved) window.onSettingsSaved();
    });

    exportBackupBtn && exportBackupBtn.addEventListener('click', () => {
      const json = Storage.exportAllJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تصحيح-نسخة-احتياطية-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    importBackupInput && importBackupInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const ok = confirm('سيتم استبدال كل البيانات الحالية بالنسخة الاحتياطية المستوردة. متابعة؟');
      if (!ok) { importBackupInput.value = ''; return; }
      const res = Storage.importAllJson(text);
      if (res.ok) {
        Utils.toast('تم استيراد النسخة الاحتياطية بنجاح.', 'success');
        setTimeout(() => window.location.reload(), 800);
      } else {
        Utils.toast('ملف النسخة الاحتياطية غير صالح.', 'error');
      }
      importBackupInput.value = '';
    });

    return { open, close };
  }

  return { initSettingsModal };
})();

document.addEventListener('DOMContentLoaded', () => {
  Common.initSettingsModal();
});

let quotaWarned = false;
window.addEventListener('storage-quota-error', () => {
  if (quotaWarned) return;
  quotaWarned = true;
  Utils.toast('مساحة التخزين في المتصفح ممتلئة. صدّر نسخة احتياطية من الإعدادات ⚙️ ثم احذف بعض الصور أو الامتحانات القديمة.', 'error', 8000);
});
