/* =========================================================
   ساحة الصف — طبقة اللعب المباشر (عبر Firebase Firestore)
   يستخدمها games/live-host.html و games/live-join.html
   ========================================================= */

// إعدادات مشروع Firebase الخاص بالمنصة. هذه القيم عامة بتصميمها
// (الحماية الحقيقية تأتي من قواعد أمان Firestore، وليس من إخفاء هذه القيم).
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBBJuju25-5TDLTk1a93fGebLCiCc00YgQ",
  authDomain: "saha-alsaf-3134f.firebaseapp.com",
  projectId: "saha-alsaf-3134f",
  storageBucket: "saha-alsaf-3134f.firebasestorage.app",
  messagingSenderId: "536583434547",
  appId: "1:536583434547:web:9cc7479e26c62871aa8e46"
};

const EGLLive = (() => {
  const QUESTION_TIME = 20; // ثانية لكل سؤال (وقت الإجابة الفعلي) — قيمة مشتركة بين شاشة المعلم وشاشة الطالب
  const QUESTION_BUFFER = 4; // ثوانٍ "استعداد" قبل بدء عد الإجابة، تمتص فرق زمن وصول السؤال بين الأجهزة
  let dbInstance = null;
  let initError = null;

  function db() {
    if (dbInstance) return dbInstance;
    try {
      if (typeof firebase === 'undefined') throw new Error('لم يتم تحميل مكتبة Firebase (تحقق من اتصال الإنترنت)');
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      dbInstance = firebase.firestore();
      return dbInstance;
    } catch (e) {
      initError = e;
      throw e;
    }
  }

  // فحص اتصال بسيط: يحاول قراءة وثيقة وهمية. ينجح حتى لو كانت غير موجودة.
  async function checkConnection() {
    try {
      await db().collection('rooms').doc('connection-check').get();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  function genCode() {
    return String(Math.floor(1000 + Math.random() * 9000)); // كود من 4 أرقام
  }

  function roomRef(code) {
    return db().collection('rooms').doc(String(code));
  }

  async function createRoom(data) {
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const snap = await roomRef(code).get();
      if (!snap.exists) break;
      code = genCode();
    }
    await roomRef(code).set({ ...data, code, createdAt: Date.now() });
    return code;
  }

  function updateRoom(code, patch) {
    return roomRef(code).update(patch);
  }

  async function getRoom(code) {
    const snap = await roomRef(code).get();
    return snap.exists ? snap.data() : null;
  }

  function onRoom(code, onData, onError) {
    return roomRef(code).onSnapshot(
      snap => onData(snap.exists ? snap.data() : null),
      err => { console.error('egl-live sync error', err); if (onError) onError(err); }
    );
  }

  return { QUESTION_TIME, QUESTION_BUFFER, db, checkConnection, genCode, createRoom, updateRoom, getRoom, onRoom };
})();
