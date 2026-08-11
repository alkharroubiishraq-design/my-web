/* utils.js — أدوات عامة مشتركة: توليد معرفات، ضغط الصور، تنبيهات، مساعدات نصية */

const Utils = (() => {
  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })
      + ' ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  // يضغط صورة (من input[type=file]) ويعيد نسخة أصغر بصيغة JPEG بالإضافة لبيانات base64
  function compressImageFile(file, { maxDim = 1600, quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('الملف المختار ليس صورة صالحة.'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(url);
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1],
          mediaType: 'image/jpeg',
          width,
          height,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('تعذرت قراءة الصورة. جرّب ملفاً آخر (JPG أو PNG).'));
      };
      img.src = url;
    });
  }

  let toastContainer = null;
  function toast(message, type = 'info', duration = 4000) {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  function bytesToSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  return { genId, escapeHtml, formatDate, compressImageFile, toast, bytesToSize };
})();
