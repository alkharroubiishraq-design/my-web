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
  const typeLabel = (t) => ({ mcq: 'اختيار من متعدد', tf: 'صح / خطأ', open: 'سؤال مفتوح', sequence: 'ترتيب تسلسلي' }[t] || t);

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
        mkMcq('كتاب: هل هو معدود أم غير معدود؟', ['معدود', 'غير معدود'], 0, 'easy', 'فرز'),
        mkMcq('ماء: هل هو معدود أم غير معدود؟', ['معدود', 'غير معدود'], 1, 'easy', 'فرز'),
        mkMcq('قلم: هل هو معدود أم غير معدود؟', ['معدود', 'غير معدود'], 0, 'easy', 'فرز'),
        mkMcq('رمل: هل هو معدود أم غير معدود؟', ['معدود', 'غير معدود'], 1, 'easy', 'فرز'),
        mkMcq('كرسي: هل هو معدود أم غير معدود؟', ['معدود', 'غير معدود'], 0, 'easy', 'فرز'),
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

    const storyText = 'في قديم الزمان، عاشت قرية صغيرة على ضفاف نهر واسع. كان أهل القرية يعتمدون على الزراعة وصيد السمك لكسب رزقهم. في يوم من الأيام، لاحظ الصياد الشاب سالم أن منسوب المياه في النهر بدأ ينخفض بشكل غريب. أخبر سالم شيخ القرية بما رآه، فجمع الشيخ أهل القرية وقرروا معًا بناء سد صغير لحماية القرية من الجفاف القادم. عمل الجميع يدًا بيد لمدة أسبوعين حتى اكتمل السد. وعندما جاء موسم الجفاف، بقيت القرية آمنة بفضل تعاون أهلها.';
    const reading = {
      id: gk(), name: 'قصص واستيعاب القراءة (تجريبي)', subject: 'لغة عربية', ageGroup: 'الكل',
      icon: '📖', createdAt: Date.now(), questions: [
        mkTf('كانت القرية تعتمد على الزراعة وصيد السمك.', true, 'easy', 'استيعاب', storyText),
        mkTf('سالم هو شيخ القرية.', false, 'easy', 'استيعاب', storyText),
        mkTf('استغرق بناء السد شهرًا كاملًا.', false, 'medium', 'استيعاب', storyText),
        mkTf('بقيت القرية آمنة من الجفاف بفضل تعاون أهلها.', true, 'easy', 'استيعاب', storyText),
        mkMcq('ماذا لاحظ سالم في النهر؟', ['ارتفاع منسوب المياه', 'انخفاض منسوب المياه', 'تلوث المياه', 'جفاف النهر بالكامل'], 1, 'medium', 'استيعاب', storyText),
        mkMcq('ما الذي يكمّل الفراغ التالي بشكل منطقي: "أخبر سالم شيخ القرية بما رآه، ___"', ['فتجاهله الشيخ تمامًا', 'فجمع الشيخ أهل القرية وقرروا معًا بناء سد', 'فغادر سالم القرية فورًا', 'فبدأ الشيخ بالبكاء'], 1, 'medium', 'الفقرة المفقودة', storyText),
        mkMcq('لماذا جمع الشيخ أهل القرية؟', ['للاحتفال بموسم الحصاد', 'لمناقشة انخفاض منسوب المياه وإيجاد حل', 'لتوزيع الطعام على الفقراء', 'لتنظيم رحلة صيد جماعية'], 1, 'medium', 'استيعاب', storyText),
        mkMcq('ما الذي بنته القرية لمواجهة خطر الجفاف؟', ['بئرًا عميقًا جدًا', 'سدًا صغيرًا', 'قناة ري طويلة', 'خزانًا لتجميع مياه المطر'], 1, 'easy', 'استيعاب', storyText),
        mkSequence('رتّب أحداث القصة بالترتيب الصحيح', ['أهل القرية يعتمدون على الزراعة وصيد السمك', 'سالم يلاحظ انخفاض منسوب المياه', 'الشيخ يجمع أهل القرية', 'القرية تبني سدًا صغيرًا', 'القرية تبقى آمنة في موسم الجفاف'], 'medium', 'ترتيب', storyText),
      ]
    };

    const grammarText = 'يذهب الطالب إلى المدرسة كل صباح. يقرأ دروسه بعناية ويلعب مع أصدقائه في الاستراحة. يعود إلى بيته بعد الظهر ويساعد والدته في المنزل.';
    const grammar = {
      id: gk(), name: 'قواعد وبناء الجملة (تجريبي)', subject: 'لغة عربية', ageGroup: 'الكل',
      icon: '📐', createdAt: Date.now(), questions: [
        mkOpen('انقر جميع الأفعال المضارعة في النص', 'يذهب,يقرأ,يلعب,يعود,يساعد', grammarText),
        mkOpen('حوّل الفقرة التالية من المضارع إلى الماضي', 'ذهب الطالب إلى المدرسة كل صباح. قرأ دروسه بعناية ولعب مع أصدقائه في الاستراحة. عاد إلى بيته بعد الظهر وساعد والدته في المنزل.', grammarText),
        mkMcq('الطالبات ذهب إلى المدرسة.', ['الطالبات ذهبن إلى المدرسة', 'الطالبات ذهبوا إلى المدرسة', 'الطالبات يذهب إلى المدرسة', 'لا حاجة للتصحيح'], 0, 'medium', 'تصحيح نحوي'),
        mkMcq('أنا يلعب كرة القدم.', ['أنا ألعب كرة القدم', 'أنا تلعب كرة القدم', 'أنا يلعبون كرة القدم', 'لا حاجة للتصحيح'], 0, 'easy', 'تصحيح نحوي'),
        mkMcq('الأولاد ذهبت إلى الحديقة.', ['الأولاد ذهبوا إلى الحديقة', 'الأولاد ذهبن إلى الحديقة', 'الأولاد ذهبت إلى الحديقة', 'لا حاجة للتصحيح'], 0, 'medium', 'تصحيح نحوي'),
        mkMcq('ذاكرت كثيرًا ___ نجحت في الامتحان.', ['لأنني', 'لكن', 'أو', 'بينما'], 0, 'medium', 'أدوات ربط'),
        mkMcq('أحب القراءة ___ أحب الرياضة أيضًا.', ['و', 'لكن', 'لأن', 'إذا'], 0, 'easy', 'أدوات ربط'),
        mkMcq('اجتهد في دراسته ___ حصل على نتيجة ممتازة.', ['لذلك', 'أو', 'مع أن', 'قبل'], 0, 'medium', 'أدوات ربط'),
        mkMcq('الجو حار جدًا ___ سنذهب للسباحة.', ['لذلك', 'مع أن', 'أو', 'قبل أن'], 0, 'easy', 'أدوات ربط'),
        mkMcq('اشتريت من السوق تفاحًا ___ برتقالًا ___ عنبًا.', ['،', '.', '؟', '!'], 0, 'easy', 'ترقيم'),
        mkMcq('هل أنجزت واجباتك ___', ['؟', '.', '،', '!'], 0, 'easy', 'ترقيم'),
        mkOpen('انقروا على الخطأ النحوي في هذه الفقرة', 'ذهبت', 'ذهبت الطالب إلى المدرسة باكرًا ليحضر الدرس الأول.'),
        mkMcq('يلعب', ['فعل', 'اسم', 'حرف'], 0, 'easy', 'فعل'),
        mkMcq('كتاب', ['اسم', 'فعل', 'حرف'], 0, 'easy', 'اسم'),
        mkMcq('جميل', ['صفة', 'اسم', 'فعل'], 0, 'easy', 'صفة'),
        mkMcq('يقرأ', ['فعل', 'اسم', 'حرف'], 0, 'easy', 'فعل'),
        mkMcq('مدرسة', ['اسم', 'فعل', 'حرف'], 0, 'easy', 'اسم'),
        mkMcq('سريع', ['صفة', 'اسم', 'فعل'], 0, 'easy', 'صفة'),
      ]
    };

    saveBanks([trivia, icebreakers, reading, grammar]);
  }

  function mkMcq(text, options, correctIndex, difficulty, category, context) {
    return { id: uuid(), type: 'mcq', text, options, correctIndex, answerText: options[correctIndex], difficulty, category: category || 'عام', points: pointsFor(difficulty), context: context || '' };
  }
  function mkTf(text, correct, difficulty, category, context) {
    return { id: uuid(), type: 'tf', text, options: ['صح', 'خطأ'], correctIndex: correct ? 0 : 1, answerText: correct ? 'صح' : 'خطأ', difficulty, category: category || 'عام', points: pointsFor(difficulty), context: context || '' };
  }
  function mkOpen(text, answerText, context) {
    return { id: uuid(), type: 'open', text, options: [], correctIndex: -1, answerText: answerText || '', difficulty: 'easy', category: 'كسر جمود', points: 0, context: context || '' };
  }
  function mkSequence(text, steps, difficulty, category, context) {
    return { id: uuid(), type: 'sequence', text, options: steps, correctIndex: -1, answerText: steps.join(' ← '), difficulty: difficulty || 'medium', category: category || 'عام', points: pointsFor(difficulty || 'medium'), context: context || '' };
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

  function splitSentences(text) {
    return String(text || '').split(/(?<=[.!؟?؛])\s+/).map(s => s.trim()).filter(Boolean);
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

  /* ---------------- Analytics: local session history (اللعب المباشر) ---------------- */
  const LIVE_SESSIONS_KEY = 'egl_live_sessions_v1';
  const MAX_SESSIONS = 200;

  function recordLiveSession(session) {
    let list = getLiveSessions();
    list.push({ id: uuid(), recordedAt: Date.now(), ...session });
    if (list.length > MAX_SESSIONS) list = list.slice(list.length - MAX_SESSIONS);
    try { localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(list)); } catch (e) { /* storage full — silently skip */ }
  }
  function getLiveSessions() {
    try { return JSON.parse(localStorage.getItem(LIVE_SESSIONS_KEY)) || []; } catch (e) { return []; }
  }
  function deleteLiveSession(id) {
    const list = getLiveSessions().filter(s => s.id !== id);
    try { localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function clearLiveSessions() {
    try { localStorage.removeItem(LIVE_SESSIONS_KEY); } catch (e) {}
  }

  return {
    uuid, shuffle, pick, qs, pointsFor, diffLabel, typeLabel,
    getBanks, saveBanks, getBank, addBank, updateBank, deleteBank, addQuestions, deleteQuestion,
    getApiKey, setApiKey, getModel, setModel,
    seedIfEmpty, mkMcq, mkTf, mkOpen, mkSequence,
    toast, beep, confetti, Scoreboard, escapeHtml, openSetupModal,
    genMathProblem, genMathStatement, scrambleWord, spellingDecoys, splitSentences,
    recordLiveSession, getLiveSessions, deleteLiveSession, clearLiveSessions
  };
})();

/* =========================================================
   أدوات إدارة الصف العائمة — زر التجميد وزر المفاجأة
   تُضاف تلقائيًا لأي صفحة لعبة تحتوي على .game-shell
   ========================================================= */
(function mountTeacherControls() {
  function init() {
    if (!document.querySelector('.game-shell')) return;
    if (document.getElementById('egl-teacher-controls')) return;

    const style = document.createElement('style');
    style.textContent = `
      #egl-teacher-controls{ position:fixed; bottom:18px; left:18px; z-index:180; display:flex; flex-direction:column; gap:10px; }
      .egl-tc-btn{ width:56px; height:56px; border-radius:50%; border:none; cursor:pointer; font-size:1.4rem;
        display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px rgba(0,0,0,.35); }
      .egl-tc-freeze{ background: var(--grad-4, linear-gradient(135deg,#3f8ef0,#21e6c1)); }
      .egl-tc-surprise{ background: var(--grad-3, linear-gradient(135deg,#ffd23f,#ff5c9e)); }
      .egl-freeze-overlay{ position:fixed; inset:0; background: rgba(5,6,20,.85); backdrop-filter: blur(6px);
        z-index:400; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; }
      .egl-freeze-overlay .ico{ font-size:5rem; }
      .egl-freeze-overlay h2{ color:#fff; font-size:1.8rem; }
      .egl-surprise-overlay{ position:fixed; inset:0; background: rgba(5,6,20,.88); z-index:400;
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; padding:20px; cursor:pointer; }
      .egl-surprise-overlay .ico{ font-size:5.5rem; animation: eglPop .6s ease; }
      .egl-surprise-overlay h2{ color:#ffd23f; font-size:2.2rem; margin:0; }
      .egl-surprise-overlay p{ color:#fff; font-size:1.3rem; max-width:600px; }
      @keyframes eglPop{ from{ transform:scale(.3); opacity:0; } to{ transform:scale(1); opacity:1; } }
      .egl-modal-mini{ background:var(--surface,#1e2354); border-radius:20px; padding:24px; max-width:420px; width:calc(100% - 40px);
        box-shadow:0 20px 50px rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.1); }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'egl-teacher-controls';
    wrap.innerHTML = `
      <button class="egl-tc-btn egl-tc-freeze" id="egl-tc-freeze" title="تجميد الشاشة">⏸</button>
      <button class="egl-tc-btn egl-tc-surprise" id="egl-tc-surprise" title="رسالة مفاجئة">🎉</button>
    `;
    document.body.appendChild(wrap);

    document.getElementById('egl-tc-freeze').addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'egl-freeze-overlay';
      overlay.innerHTML = `
        <div class="ico">⏸</div>
        <h2>الحصة متوقفة مؤقتًا</h2>
        <button class="btn btn-primary" id="egl-unfreeze">▶ متابعة اللعب</button>`;
      document.body.appendChild(overlay);
      const unfreeze = () => overlay.remove();
      overlay.querySelector('#egl-unfreeze').addEventListener('click', unfreeze);
      const escHandler = (e) => { if (e.key === 'Escape') { unfreeze(); document.removeEventListener('keydown', escHandler); } };
      document.addEventListener('keydown', escHandler);
    });

    document.getElementById('egl-tc-surprise').addEventListener('click', () => {
      const promptOverlay = document.createElement('div');
      promptOverlay.className = 'modal-overlay';
      promptOverlay.innerHTML = `
        <div class="egl-modal-mini">
          <h2 style="margin-bottom:6px;">🎉 رسالة مفاجئة</h2>
          <p style="color:var(--text-dim,#b8bce6); margin-bottom:14px;">فاجئ طالبًا مميزًا برسالة شكر تظهر كبيرة على الشاشة!</p>
          <label>اسم الطالب (اختياري)</label>
          <input type="text" id="egl-sp-name" placeholder="مثال: سارة">
          <label>الرسالة</label>
          <input type="text" id="egl-sp-msg" value="أحسنت! أنت مميز 👏">
          <div class="modal-actions">
            <button class="btn btn-outline" id="egl-sp-cancel">إلغاء</button>
            <button class="btn btn-primary" id="egl-sp-show">أظهر المفاجأة 🎉</button>
          </div>
        </div>`;
      document.body.appendChild(promptOverlay);
      promptOverlay.querySelector('#egl-sp-cancel').addEventListener('click', () => promptOverlay.remove());
      promptOverlay.querySelector('#egl-sp-show').addEventListener('click', () => {
        const name = promptOverlay.querySelector('#egl-sp-name').value.trim();
        const msg = promptOverlay.querySelector('#egl-sp-msg').value.trim() || 'أحسنت! أنت مميز 👏';
        promptOverlay.remove();
        const surprise = document.createElement('div');
        surprise.className = 'egl-surprise-overlay';
        surprise.innerHTML = `
          <div class="ico">🎉</div>
          <h2>${name ? EGL.escapeHtml(name) : 'مفاجأة!'}</h2>
          <p>${EGL.escapeHtml(msg)}</p>
          <p style="color:var(--text-dim,#b8bce6); font-size:.9rem;">(اضغط في أي مكان للإغلاق)</p>`;
        document.body.appendChild(surprise);
        if (window.EGL && EGL.confetti) EGL.confetti(120);
        if (window.EGL && EGL.beep) EGL.beep('win');
        surprise.addEventListener('click', () => surprise.remove());
        setTimeout(() => { if (document.body.contains(surprise)) surprise.remove(); }, 6000);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
