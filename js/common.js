/* =========================================================
   منصّة الألعاب الصفية التفاعلية — common.js
   وظائف مشتركة: قاعدة بيانات الأسئلة، عناصر واجهة، أدوات مساعدة
   ========================================================= */

const EGL = (() => {
  const LS_BANKS = 'egl_banks_v1';
  const LS_KEY = 'egl_ai_key_v1';
  const LS_MODEL = 'egl_ai_model_v1';

  const uuid = () => 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const qs = (name) => new URLSearchParams(location.search).get(name);

  const pointsFor = (diff) => ({ easy: 10, medium: 20, hard: 30 }[diff] || 10);

  const diffLabel = (d) => ({ easy: 'سهل', medium: 'متوسط', hard: 'صعب' }[d] || d);
  const typeLabel = (t) => ({ mcq: 'اختيار من متعدد', tf: 'صح / خطأ', open: 'سؤال مفتوح' }[t] || t);

  /* ---------------- Storage ---------------- */
  function getBanks() {
    try {
      const raw = localStorage.getItem(LS_BANKS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) { return []; }
  }
  function saveBanks(banks) {
    localStorage.setItem(LS_BANKS, JSON.stringify(banks));
  }
  function getBank(id) {
    return getBanks().find(b => b.id === id) || null;
  }
  function addBank(bank) {
    const banks = getBanks();
    bank.id = bank.id || uuid();
    bank.questions = bank.questions || [];
    banks.push(bank);
    saveBanks(banks);
    return bank;
  }
  function updateBank(bank) {
    const banks = getBanks();
    const i = banks.findIndex(b => b.id === bank.id);
    if (i > -1) banks[i] = bank;
    saveBanks(banks);
  }
  function deleteBank(id) {
    saveBanks(getBanks().filter(b => b.id !== id));
  }
  function addQuestions(bankId, questions) {
    const banks = getBanks();
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    questions.forEach(q => {
      q.id = q.id || uuid();
      q.points = q.points || pointsFor(q.difficulty);
      bank.questions.push(q);
    });
    saveBanks(banks);
  }
  function deleteQuestion(bankId, qid) {
    const banks = getBanks();
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return;
    bank.questions = bank.questions.filter(q => q.id !== qid);
    saveBanks(banks);
  }

  function getApiKey() { return localStorage.getItem(LS_KEY) || ''; }
  function setApiKey(k) { localStorage.setItem(LS_KEY, k || ''); }
  function getModel() { return localStorage.getItem(LS_MODEL) || 'claude-sonnet-5'; }
  function setModel(m) { localStorage.setItem(LS_MODEL, m || 'claude-sonnet-5'); }

  /* ---------------- Seed default content (first run) ---------------- */
  function seedIfEmpty() {
    if (getBanks().length > 0) return;
    const gk = () => uuid();

    const trivia = {
      id: gk(), name: 'ثقافة عامة (جاهزة للتجربة)', subject: 'ثقافة عامة',
      ageGroup: 'الكل', icon: '🌍', createdAt: Date.now(), questions: [
        mkMcq('ما هي عاصمة الأردن؟', ['عمّان', 'إربد', 'الزرقاء', 'العقبة'], 0, 'easy', 'جغرافيا'),
        mkMcq('كم عدد أيام الأسبوع؟', ['5', '6', '7', '8'], 2, 'easy', 'عام'),
        mkMcq('ما هو أكبر كوكب في المجموعة الشمسية؟', ['الأرض', 'المشتري', 'زحل', 'المريخ'], 1, 'medium', 'علوم'),
        mkTf('الشمس تدور حول الأرض.', false, 'easy', 'علوم'),
        mkMcq('من مؤلف كتاب "كليلة ودمنة" (المترجم إلى العربية)؟', ['ابن المقفع', 'الجاحظ', 'المتنبي', 'ابن خلدون'], 0, 'hard', 'أدب'),
        mkMcq('كم عدد قارات العالم؟', ['5', '6', '7', '4'], 2, 'medium', 'جغرافيا'),
        mkTf('البحر الميت هو أخفض نقطة على سطح اليابسة في العالم.', true, 'medium', 'جغرافيا'),
        mkMcq('ما ناتج 8 × 7؟', ['54', '56', '64', '48'], 1, 'easy', 'رياضيات'),
        mkMcq('أي غاز يحتاجه الإنسان للتنفس؟', ['ثاني أكسيد الكربون', 'النيتروجين', 'الأكسجين', 'الهيدروجين'], 2, 'easy', 'علوم'),
        mkMcq('في أي قارة تقع مصر؟', ['آسيا', 'أفريقيا', 'أوروبا', 'أمريكا'], 1, 'easy', 'جغرافيا'),
        mkMcq('ما هي وحدة قياس القوة؟', ['واط', 'نيوتن', 'جول', 'أمبير'], 1, 'hard', 'علوم'),
        mkTf('اللغة العربية تُكتب من اليسار إلى اليمين.', false, 'easy', 'لغة'),
      ]
    };

    const icebreakers = {
      id: gk(), name: 'بطاقات كسر الجمود والتعارف', subject: 'أنشطة تفاعلية', ageGroup: 'الكل',
      icon: '🧊', createdAt: Date.now(), questions: [
        mkOpen('لو صار عندك يوم كامل بدون أي التزامات، كيف بتقضيه؟'),
        mkOpen('اذكر موهبة أو هواية غريبة عندك ما يعرفها زملاؤك.'),
        mkOpen('لو قدرت تاكل نفس الوجبة كل يوم لسنة كاملة، شو بتختار؟'),
        mkOpen('شو أكثر شي بيضحكك؟'),
        mkOpen('لو صار عندك قوة خارقة واحدة، شو بتختار ولماذا؟'),
        mkOpen('اذكر مكان بتحب تزوره ولسا ما زرته.'),
        mkOpen('شو أكثر كتاب أو فيلم أثّر فيك؟'),
        mkOpen('لو قدرت تتعلم مهارة جديدة بثانية واحدة، شو بتختار؟'),
        mkOpen('صف نفسك بثلاث كلمات فقط.'),
        mkOpen('شو أفضل نصيحة أعطاك إياها أحد؟'),
        mkOpen('لو عندك آلة زمن، وين بتروح: الماضي ولا المستقبل؟'),
        mkOpen('شو الشي إلي بيخليك فخور فيه بنفسك؟'),
        mkOpen('اذكر أغنية بتحمسك دايمًا.'),
        mkOpen('لو بتصير حيوان ليوم واحد، شو بتختار؟'),
        mkOpen('شو أكثر شي بتتمنى تتعلمه هالسنة؟'),
      ]
    };

    saveBanks([trivia, icebreakers]);
  }

  function mkMcq(text, options, correctIndex, difficulty, category) {
    return { id: uuid(), type: 'mcq', text, options, correctIndex, answerText: options[correctIndex], difficulty, category: category || 'عام', points: pointsFor(difficulty) };
  }
  function mkTf(text, correct, difficulty, category) {
    return { id: uuid(), type: 'tf', text, options: ['صح', 'خطأ'], correctIndex: correct ? 0 : 1, answerText: correct ? 'صح' : 'خطأ', difficulty, category: category || 'عام', points: pointsFor(difficulty) };
  }
  function mkOpen(text, answerText) {
    return { id: uuid(), type: 'open', text, options: [], correctIndex: -1, answerText: answerText || '', difficulty: 'easy', category: 'كسر جمود', points: 0 };
  }

  /* ---------------- Toast ---------------- */
  function toast(msg, ms = 2600) {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  /* ---------------- Sound (WebAudio, no assets) ---------------- */
  let actx;
  function beep(kind = 'tick') {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const map = {
        correct: [880, 1320], wrong: [220, 140], tick: [520, 520], win: [660, 990, 1320]
      };
      const freqs = map[kind] || map.tick;
      o.type = kind === 'wrong' ? 'sawtooth' : 'sine';
      g.gain.setValueAtTime(0.15, actx.currentTime);
      let t = actx.currentTime;
      freqs.forEach((f, i) => {
        o.frequency.setValueAtTime(f, t + i * 0.09);
      });
      g.gain.exponentialRampToValueAtTime(0.001, t + freqs.length * 0.09 + 0.15);
      o.start(t);
      o.stop(t + freqs.length * 0.09 + 0.2);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Confetti ---------------- */
  function confetti(count = 60) {
    const colors = ['#7c5cff', '#ff5c9e', '#21e6c1', '#ffd23f', '#2be08a'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[i % colors.length];
      el.style.transform = `rotate(${Math.random() * 360}deg)`;
      el.style.animation = `confettiFall ${1.6 + Math.random() * 1.4}s ease-in forwards`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }
  }
  if (!document.getElementById('egl-confetti-style')) {
    const st = document.createElement('style');
    st.id = 'egl-confetti-style';
    st.textContent = `@keyframes confettiFall{ to{ transform: translateY(105vh) rotate(600deg); opacity:.3; } }`;
    document.head.appendChild(st);
  }

  /* ---------------- Scoreboard ---------------- */
  class Scoreboard {
    constructor(container, players) {
      this.container = container;
      this.players = players.map((p, i) => ({ name: p.name, emoji: p.emoji || '🎓', score: 0, active: i === 0 }));
      this.render();
    }
    render() {
      this.container.innerHTML = this.players.map((p, i) => `
        <div class="player-chip ${p.active ? 'active' : ''}" data-i="${i}">
          <div style="font-size:1.4rem">${p.emoji}</div>
          <div class="pname">${escapeHtml(p.name)}</div>
          <div class="pscore">${p.score}</div>
        </div>`).join('');
    }
    addScore(i, pts) {
      this.players[i].score = Math.max(0, this.players[i].score + pts);
      this.render();
    }
    setActive(i) {
      this.players.forEach((p, idx) => p.active = idx === i);
      this.render();
    }
    nextTurn() {
      const cur = this.players.findIndex(p => p.active);
      const nxt = (cur + 1) % this.players.length;
      this.setActive(nxt);
      return nxt;
    }
    activeIndex() { return this.players.findIndex(p => p.active); }
    ranking() { return this.players.map((p, i) => ({ ...p, i })).sort((a, b) => b.score - a.score); }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------------- Setup Modal ---------------- */
  // options: { title, allowIndividual, allowTeams, defaultMode, needQuestions:true, minPlayers, maxPlayers, extraFieldsHtml, skipBank:false }
  function openSetupModal(options, onStart) {
    const banks = options.skipBank ? [] : getBanks().filter(b => !options.needQuestions || b.questions.some(q => !options.qType || q.type === options.qType || options.qType.includes(q.type)));
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const modeDefault = options.allowIndividual ? 'individual' : 'teams';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${options.title || 'إعداد اللعبة'} 🎮</h2>
        <p>اضبط الإعدادات ثم ابدأ اللعب مباشرة.</p>
        ${options.skipBank ? '' : `
        <label>بنك الأسئلة</label>
        <select id="egl-setup-bank">
          ${banks.length ? banks.map(b => `<option value="${b.id}">${escapeHtml(b.icon || '📚')} ${escapeHtml(b.name)} (${b.questions.length} سؤال)</option>`).join('') : `<option value="">لا يوجد بنك أسئلة — أنشئ واحدًا من صفحة "بنك الأسئلة"</option>`}
        </select>`}
        ${options.allowIndividual && options.allowTeams ? `
        <label>طريقة اللعب</label>
        <div class="chip-group" id="egl-setup-mode">
          <div class="chip ${modeDefault === 'individual' ? 'selected' : ''}" data-v="individual">👤 فردي</div>
          <div class="chip ${modeDefault === 'teams' ? 'selected' : ''}" data-v="teams">👥 فرق / مجموعات</div>
        </div>` : `<input type="hidden" id="egl-setup-mode-fixed" value="${modeDefault}">`}
        <div id="egl-setup-players"></div>
        ${options.extraFieldsHtml || ''}
        <div class="modal-actions">
          <button class="btn btn-outline" id="egl-setup-cancel">إلغاء</button>
          <button class="btn btn-primary" id="egl-setup-start">ابدأ اللعبة 🚀</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const playersWrap = overlay.querySelector('#egl-setup-players');
    let mode = modeDefault;

    function renderPlayers() {
      const isTeam = mode === 'teams';
      const min = isTeam ? (options.minPlayers || 2) : (options.minPlayers || 1);
      const max = isTeam ? (options.maxPlayers || 6) : (options.maxPlayers || 6);
      const defaultCount = isTeam ? 2 : (options.minPlayers === options.maxPlayers ? options.minPlayers : 1);
      playersWrap.innerHTML = `
        <label>${isTeam ? 'عدد الفرق' : (options.playersLabel || 'عدد اللاعبين')}</label>
        <input type="number" id="egl-setup-count" min="${min}" max="${max}" value="${defaultCount}">
        <div id="egl-setup-names"></div>`;
      const namesWrap = playersWrap.querySelector('#egl-setup-names');
      const countInput = playersWrap.querySelector('#egl-setup-count');
      function renderNames() {
        const n = Math.max(min, Math.min(max, parseInt(countInput.value) || min));
        const emojis = isTeam ? ['🔵','🔴','🟢','🟡','🟣','🟠'] : ['🦁','🐯','🐼','🦊','🐨','🐸'];
        namesWrap.innerHTML = Array.from({ length: n }).map((_, i) => `
          <input type="text" class="egl-player-name" placeholder="${isTeam ? 'اسم الفريق ' + (i+1) : 'اسم اللاعب ' + (i+1)}" value="${isTeam ? 'فريق ' + (i+1) : 'لاعب ' + (i+1)}" data-emoji="${emojis[i % emojis.length]}">
        `).join('');
      }
      countInput.addEventListener('input', renderNames);
      renderNames();
    }
    renderPlayers();

    if (options.allowIndividual && options.allowTeams) {
      overlay.querySelectorAll('#egl-setup-mode .chip').forEach(chip => {
        chip.addEventListener('click', () => {
          overlay.querySelectorAll('#egl-setup-mode .chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
          mode = chip.dataset.v;
          renderPlayers();
        });
      });
    }

    overlay.querySelector('#egl-setup-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#egl-setup-start').addEventListener('click', () => {
      let bankId = null;
      if (!options.skipBank) {
        bankId = overlay.querySelector('#egl-setup-bank').value;
        if (!bankId) { toast('أنشئ بنك أسئلة أولًا من صفحة "بنك الأسئلة" 📚'); return; }
      }
      const names = Array.from(overlay.querySelectorAll('.egl-player-name')).map(inp => ({ name: inp.value.trim() || inp.placeholder, emoji: inp.dataset.emoji }));
      const extra = {};
      overlay.querySelectorAll('[data-extra]').forEach(el => { extra[el.dataset.extra] = el.value; });
      overlay.remove();
      onStart({ bankId, mode, players: names, extra });
    });
  }

  /* ---------------- Math problem generator (for subject-specific math games) ---------------- */
  function genMathProblem(difficulty) {
    const ranges = { easy: [1, 10], medium: [2, 30], hard: [5, 100] };
    const opsFor = { easy: ['+', '-'], medium: ['+', '-', '×'], hard: ['+', '-', '×', '÷'] };
    const [lo, hi] = ranges[difficulty] || ranges.medium;
    const ops = opsFor[difficulty] || opsFor.medium;
    const op = pick(ops);
    let a, b, answer;
    if (op === '÷') {
      b = 2 + Math.floor(Math.random() * 11);
      answer = 1 + Math.floor(Math.random() * (difficulty === 'hard' ? 12 : 9));
      a = b * answer;
    } else if (op === '×') {
      const mhi = difficulty === 'hard' ? 12 : (difficulty === 'medium' ? 10 : 5);
      a = 1 + Math.floor(Math.random() * mhi);
      b = 1 + Math.floor(Math.random() * mhi);
      answer = a * b;
    } else {
      a = lo + Math.floor(Math.random() * (hi - lo + 1));
      b = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (op === '-' && b > a) { const t = a; a = b; b = t; }
      answer = op === '+' ? a + b : a - b;
    }
    return { a, b, op, answer, text: `${a} ${op} ${b}` };
  }

  function genMathStatement(difficulty) {
    // returns {text, isTrue} — a fully-formed "a op b = N" statement, true or false ~50/50
    const p = genMathProblem(difficulty);
    let shown = p.answer;
    let isTrue = true;
    if (Math.random() < 0.5) {
      isTrue = false;
      const delta = 1 + Math.floor(Math.random() * (difficulty === 'hard' ? 8 : 4));
      shown = p.answer + (Math.random() < 0.5 ? delta : -delta);
    }
    return { text: `${p.text} = ${shown}`, isTrue };
  }

  /* ---------------- Word helpers (for language games) ---------------- */
  function scrambleWord(word) {
    const letters = word.split('');
    if (letters.length <= 1) return letters;
    let attempt;
    let tries = 0;
    do {
      attempt = shuffle(letters);
      tries++;
    } while (attempt.join('') === letters.join('') && tries < 12);
    return attempt;
  }

  const AR_NEIGHBOR = { 'ا':'أ','ب':'ت','ت':'ب','ث':'ت','ج':'ح','ح':'خ','خ':'ح','د':'ذ','ذ':'د','ر':'ز','ز':'ر','س':'ش','ش':'س','ص':'ض','ض':'ص','ط':'ظ','ظ':'ط','ع':'غ','غ':'ع','ف':'ق','ق':'ف','ك':'ل','ل':'ك','م':'ن','ن':'م','ه':'ة','و':'ي','ي':'و' };
  function spellingDecoys(word, count = 3) {
    const w = word.trim();
    const decoys = new Set();
    const attempts = [
      () => { // swap two adjacent letters
        if (w.length < 2) return null;
        const i = Math.floor(Math.random() * (w.length - 1));
        const arr = w.split('');
        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
        return arr.join('');
      },
      () => { // remove a letter
        if (w.length < 3) return null;
        const i = Math.floor(Math.random() * w.length);
        return w.slice(0, i) + w.slice(i + 1);
      },
      () => { // duplicate a letter
        const i = Math.floor(Math.random() * w.length);
        return w.slice(0, i + 1) + w[i] + w.slice(i + 1);
      },
      () => { // substitute a letter with a visually/keyboard-near letter
        const i = Math.floor(Math.random() * w.length);
        const ch = w[i];
        const rep = AR_NEIGHBOR[ch] || (/[a-zA-Z]/.test(ch) ? String.fromCharCode(ch.charCodeAt(0) + (Math.random() < 0.5 ? 1 : -1)) : ch);
        return w.slice(0, i) + rep + w.slice(i + 1);
      },
    ];
    let guard = 0;
    while (decoys.size < count && guard < 40) {
      const fn = pick(attempts);
      const d = fn();
      guard++;
      if (d && d !== w && !decoys.has(d)) decoys.add(d);
    }
    return Array.from(decoys);
  }

  return {
    uuid, shuffle, pick, qs, pointsFor, diffLabel, typeLabel,
    getBanks, saveBanks, getBank, addBank, updateBank, deleteBank, addQuestions, deleteQuestion,
    getApiKey, setApiKey, getModel, setModel,
    seedIfEmpty, mkMcq, mkTf, mkOpen,
    toast, beep, confetti, Scoreboard, escapeHtml, openSetupModal,
    genMathProblem, genMathStatement, scrambleWord, spellingDecoys
  };
})();
