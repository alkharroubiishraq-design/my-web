import React, { useState, useRef, useEffect, useCallback } from "react";

const FONT_LINK_ID = "classroom-observer-fonts";

function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Changa:wght@500;700;800&family=Tajawal:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const MAX_PER_SOURCE = 5;

export default function ClassroomObserver() {
  useGoogleFonts();

  const [step, setStep] = useState("setup"); // setup | live | review | analyzing | report
  const [mode, setMode] = useState("live"); // live | upload
  const [shareScreen, setShareScreen] = useState(true);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [teacherName, setTeacherName] = useState("");

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [camFrames, setCamFrames] = useState([]);
  const [boardFrames, setBoardFrames] = useState([]);
  const [screenActive, setScreenActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");
  const [report, setReport] = useState(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const camVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const uploadVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const camStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const recordingRef = useRef(false);

  useEffect(() => {
    return () => stopEverything();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    function beforeUnload(e) {
      if (recordingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  function stopEverything() {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    document.title = "مراقب الحصة الذكي";
  }

  function grabFrame(videoEl, cap, setter) {
    if (!videoEl || !canvasRef.current || !videoEl.videoWidth) return;
    const canvas = canvasRef.current;
    canvas.width = 480;
    canvas.height = (480 * videoEl.videoHeight) / videoEl.videoWidth;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    const base64 = dataUrl.split(",")[1];
    setter((prev) => {
      const next = [...prev, { data: base64, t: elapsed }];
      if (next.length > cap) return next.slice(next.length - cap);
      return next;
    });
  }

  function captureAll() {
    grabFrame(camVideoRef.current, MAX_PER_SOURCE, setCamFrames);
    if (screenStreamRef.current) grabFrame(screenVideoRef.current, MAX_PER_SOURCE, setBoardFrames);
  }

  async function startLive() {
    setErrorMsg("");
    setWarnMsg("");
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      camStreamRef.current = camStream;
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = camStream;
        await camVideoRef.current.play();
      }
    } catch (err) {
      setErrorMsg("ما قدرنا نوصل للكاميرا أو المايكروفون. تأكدي من إعطاء الإذن للمتصفح.");
      return;
    }

    if (shareScreen) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        setScreenActive(true);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
          await screenVideoRef.current.play();
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenActive(false);
          screenStreamRef.current = null;
          setWarnMsg("توقفت مشاركة شاشة اللوح — التسجيل مستمر بالكاميرا فقط.");
        };
      } catch (err) {
        setWarnMsg("ما تمت مشاركة شاشة اللوح (تم الإلغاء) — التسجيل مستمر بالكاميرا فقط.");
      }
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.lang = "ar-SA";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscriptRef.current += text + " ";
          else interim += text;
        }
        setLiveTranscript(finalTranscriptRef.current + interim);
      };
      recognition.onerror = () => {};
      recognition.onend = () => {
        if (recognitionRef.current && recordingRef.current) {
          try { recognition.start(); } catch (e) {}
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
    }

    setStep("live");
    setRecording(true);
    recordingRef.current = true;
    setElapsed(0);
    setCamFrames([]);
    setBoardFrames([]);
    finalTranscriptRef.current = "";
    setLiveTranscript("");

    timerIntervalRef.current = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        document.title = `🔴 ${fmtTime(next)} — تسجيل الحصة`;
        return next;
      });
    }, 1000);
    frameIntervalRef.current = setInterval(captureAll, 20000);
    setTimeout(captureAll, 1500);
  }

  function stopLive() {
    setRecording(false);
    recordingRef.current = false;
    stopEverything();
    setManualTranscript(finalTranscriptRef.current.trim());
    setStep("review");
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadName(file.name);
    setErrorMsg("");
    const url = URL.createObjectURL(file);
    const video = uploadVideoRef.current;
    video.src = url;
    video.muted = true;

    await new Promise((resolve) => { video.onloadedmetadata = resolve; });

    const duration = video.duration;
    const count = Math.min(MAX_PER_SOURCE * 2, Math.max(3, Math.floor(duration / 30)));
    const timestamps = Array.from({ length: count }, (_, i) => (duration * (i + 0.5)) / count);
    const collected = [];

    for (let i = 0; i < timestamps.length; i++) {
      video.currentTime = timestamps[i];
      await new Promise((resolve) => { video.onseeked = resolve; });
      const canvas = canvasRef.current;
      canvas.width = 480;
      canvas.height = (480 * video.videoHeight) / video.videoWidth;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      collected.push({ data: dataUrl.split(",")[1], t: Math.round(timestamps[i]) });
      setUploadProgress(Math.round(((i + 1) / timestamps.length) * 100));
    }
    setCamFrames(collected);
    setBoardFrames([]);
    setStep("review");
  }

  const buildPrompt = useCallback(() => {
    const transcriptPart = manualTranscript.trim()
      ? `نص مفرّغ (كامل أو جزئي) من صوت الحصة:\n"""${manualTranscript.trim().slice(0, 3000)}"""`
      : "لا يوجد نص مفرغ متاح لهذه الحصة — اعتمدي في التحليل على الصور الملتقطة فقط، ونوّهي لهذا القصور بإيجاز.";

    const imageDesc = boardFrames.length > 0
      ? `أول ${camFrames.length} صورة هي لقطات من كاميرا الصف (المعلمة والطلاب)، وبعدها ${boardFrames.length} صورة هي لقطات من شاشة اللوح الإلكتروني (Smart Board) توضح ما كانت المعلمة تكتبه أو تعرضه.`
      : `الصور المرفقة (${camFrames.length}) هي لقطات من كاميرا الصف على فترات متفرقة من الحصة.`;

    return `أنتِ مشرفة تربوية خبيرة تراجعين حصة صفية بهدف مساعدة المعلم/ة على التطور المهني، وليس تقييمًا عقابيًا.
معلومات الحصة: المادة: ${subject || "غير محددة"} — الصف: ${grade || "غير محدد"} — المعلم/ة: ${teacherName || "غير محدد"}.
${imageDesc}
${transcriptPart}

اكتبي تقريرًا موجزًا وعمليًا بصيغة JSON فقط (بدون أي نص خارج الأقواس، بدون علامات كود)، بالمفاتيح التالية بالضبط:
{
 "overallScore": رقم من 0 إلى 10,
 "summary": "فقرة من 2-3 جمل تلخص الحصة",
 "strengths": ["نقطة قوة 1", "نقطة قوة 2", "..."],
 "weaknesses": ["نقطة تحتاج تحسين 1", "..."],
 "boardUsage": "ملاحظة من 2-3 جمل عن استخدام اللوح الإلكتروني ووضوح المحتوى المعروض عليه، أو 'لا تتوفر لقطات من اللوح' إن لم تتوفر",
 "engagementNotes": "ملاحظة من 2-3 جمل عن تفاعل الطلاب بناءً على صور الكاميرا",
 "recommendations": ["توصية عملية 1", "توصية عملية 2", "توصية عملية 3"]
}
اجعلي كل نقطة سطرًا واحدًا موجزًا (بحد أقصى 15 كلمة). اكتبي بالعربية الفصحى البسيطة. لا تتجاوزي 4 عناصر في كل قائمة.`;
  }, [subject, grade, teacherName, manualTranscript, camFrames, boardFrames]);

  async function analyzeLesson() {
    setStep("analyzing");
    setErrorMsg("");
    try {
      const content = [
        ...camFrames.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } })),
        ...boardFrames.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } })),
        { type: "text", text: buildPrompt() },
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("no-text");
      let clean = textBlock.text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(clean);
      setReport(parsed);
      setStep("report");
    } catch (err) {
      setErrorMsg("صار في مشكلة أثناء تحليل الحصة. جربي مرة ثانية.");
      setStep("review");
    }
  }

  function resetAll() {
    stopEverything();
    setStep("setup");
    setCamFrames([]);
    setBoardFrames([]);
    setScreenActive(false);
    setManualTranscript("");
    setLiveTranscript("");
    setReport(null);
    setErrorMsg("");
    setWarnMsg("");
    setUploadName("");
    setUploadProgress(0);
    setElapsed(0);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function buildReportText() {
    if (!report) return "";
    const lines = [];
    lines.push(`تقرير أداء الحصة — ${subject || "مادة غير محددة"} · صف ${grade || "—"} · ${teacherName || "المعلم/ة"}`);
    lines.push(`التقييم العام: ${report.overallScore}/10`);
    lines.push("");
    lines.push("ملخص الحصة:");
    lines.push(report.summary || "—");
    lines.push("");
    lines.push("نقاط القوة:");
    (report.strengths || []).forEach((s) => lines.push(`• ${s}`));
    lines.push("");
    lines.push("نقاط تحتاج تحسين:");
    (report.weaknesses || []).forEach((s) => lines.push(`• ${s}`));
    if (report.boardUsage) {
      lines.push("");
      lines.push("استخدام اللوح الإلكتروني:");
      lines.push(report.boardUsage);
    }
    lines.push("");
    lines.push("تفاعل الطلاب:");
    lines.push(report.engagementNotes || "—");
    lines.push("");
    lines.push("توصيات للتطوير:");
    (report.recommendations || []).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push("");
    lines.push("(تقرير مُولَّد بمساعدة الذكاء الاصطناعي — لأغراض التأمل الذاتي والتطوير المهني)");
    return lines.join("\n");
  }

  function sendByEmail() {
    const body = buildReportText();
    const subjectLine = `تقرير أداء الحصة — ${subject || ""} ${teacherName ? "— " + teacherName : ""}`;
    const url = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  function sendByWhatsapp() {
    const shortLines = [];
    shortLines.push(`تقرير أداء الحصة (${subject || "—"} · صف ${grade || "—"})`);
    shortLines.push(`التقييم العام: ${report.overallScore}/10`);
    shortLines.push("");
    shortLines.push("نقاط القوة:");
    (report.strengths || []).slice(0, 3).forEach((s) => shortLines.push(`• ${s}`));
    shortLines.push("");
    shortLines.push("نقاط تحتاج تحسين:");
    (report.weaknesses || []).slice(0, 3).forEach((s) => shortLines.push(`• ${s}`));
    shortLines.push("");
    shortLines.push("(التقرير الكامل مرفق/مطبوع من التطبيق)");
    const text = shortLines.join("\n");
    const phone = recipientPhone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  const allReviewFrames = [
    ...camFrames.map((f) => ({ ...f, source: "camera" })),
    ...boardFrames.map((f) => ({ ...f, source: "board" })),
  ];

  return (
    <div dir="rtl" className="co-root">
      <style>{css}</style>
      <video ref={camVideoRef} className="co-hidden-video" playsInline muted />
      <video ref={screenVideoRef} className="co-hidden-video" playsInline muted />
      <video ref={uploadVideoRef} className="co-hidden-video" playsInline muted />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {step === "setup" && (
        <div className="co-board">
          <div className="co-chalk-title">
            <h1>مراقب الحصة الذكي</h1>
            <svg className="co-underline" viewBox="0 0 300 14" preserveAspectRatio="none">
              <path d="M2 8 C 60 2, 120 12, 180 6 S 260 4, 298 9" />
            </svg>
            <p className="co-tagline">يسجّل الحصة (كاميرا الصف + شاشة اللوح الإلكتروني)، يحلّلها بالذكاء الاصطناعي، ويجهّز للمعلم/ة تقريرًا بنقاط القوة والضعف وتوصيات للتطوير</p>
          </div>

          <div className="co-card co-card--chalk">
            <div className="co-field-row">
              <label>المادة<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: لغة إنجليزية" /></label>
              <label>الصف<input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: الرابع" /></label>
              <label>اسم المعلم/ة<input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="اختياري" /></label>
            </div>

            <div className="co-mode-toggle">
              <button className={mode === "live" ? "active" : ""} onClick={() => setMode("live")}>تسجيل مباشر أثناء الحصة</button>
              <button className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>رفع فيديو حصة مسجّلة مسبقًا</button>
            </div>

            {mode === "live" && (
              <label className="co-checkbox-row">
                <input type="checkbox" checked={shareScreen} onChange={(e) => setShareScreen(e.target.checked)} />
                سجّلي أيضًا شاشة اللوح الإلكتروني (Smart Board) — راح يطلب المتصفح تحديد الشاشة/النافذة مرة وحدة بالبداية
              </label>
            )}

            {mode === "live" ? (
              <button className="co-cta" onClick={startLive}>ابدأ تسجيل الحصة ●</button>
            ) : (
              <label className="co-cta co-upload-btn">اختاري ملف الفيديو<input type="file" accept="video/*" hidden onChange={handleFileUpload} /></label>
            )}
            {errorMsg && <p className="co-error">{errorMsg}</p>}
          </div>

          <div className="co-note-box">
            <p><strong>كيف تشتغلها بالخلفية:</strong> بعد الضغط على "ابدأ"، وافقي على إذن الكاميرا/المايك، وإذا فعّلتِ خيار اللوح اختاري الشاشة أو التطبيق اللي فاتحاه المعلمة. بعدها تقدرين تصغّري نافذة المتصفح وتفتحي تطبيقات اللوح بحرية — التسجيل يستمر بالخلفية طول الحصة. المهم: ما تسكّري التبويب، وما تطفي الشاشة أو تنامها.</p>
            <p className="co-note-warn">ملاحظة تقنية: المتصفحات (لأسباب أمان وخصوصية) دايمًا تُظهر مؤشر/شريط صغير يبيّن إنه في تسجيل شاشة شغّال — هذا مو شي تقدر تطبيقات الويب تخفيه، وهو مفيد كمان كتذكير للموافقة.</p>
          </div>

          <p className="co-consent">⚠ تأكدي من الحصول على موافقة الإدارة وأولياء الأمور على تصوير الطلاب. اللقطات تُرسل لتحليل الذكاء الاصطناعي فقط ولا تُخزَّن على أي خادم من هذا التطبيق.</p>
        </div>
      )}

      {step === "live" && (
        <div className="co-board co-live-screen">
          <div className="co-rec-badge-standalone"><span className="co-dot" /> جارٍ تسجيل الحصة — {fmtTime(elapsed)}</div>
          <div className="co-live-sources">
            <span className="co-source-pill">📷 كاميرا الصف: {camFrames.length} لقطة</span>
            <span className={`co-source-pill ${screenActive ? "" : "co-source-pill--off"}`}>🖥️ شاشة اللوح: {screenActive ? `${boardFrames.length} لقطة` : "غير مفعّلة"}</span>
          </div>
          {warnMsg && <p className="co-warn">{warnMsg}</p>}
          <div className="co-transcript-box"><p>{liveTranscript || "بانتظار الصوت..."}</p></div>
          <p className="co-minimize-hint">صغّري النافذة الآن وتابعي شرحك — التسجيل مستمر. ارجعي لهذا التبويب لما تخلص الحصة.</p>
          <button className="co-cta co-cta--stop" onClick={stopLive}>إنهاء الحصة وإعداد التقرير ■</button>
        </div>
      )}

      {step === "review" && (
        <div className="co-board">
          <div className="co-chalk-title"><h1>مراجعة قبل التحليل</h1></div>
          <div className="co-card co-card--chalk">
            {uploadName && <p className="co-upload-name">الملف: {uploadName}</p>}
            <div className="co-thumbs co-thumbs--review">
              {allReviewFrames.map((f, i) => (
                <div key={i} className="co-thumb-wrap">
                  <img src={`data:image/jpeg;base64,${f.data}`} alt="" className="co-thumb" />
                  <span className="co-thumb-tag">{f.source === "board" ? "اللوح" : "الكاميرا"}</span>
                </div>
              ))}
            </div>
            <label className="co-transcript-label">
              نص الحصة (تم التقاطه تلقائيًا، عدّليه أو ألصقي نصًا أدق إذا توفر)
              <textarea value={manualTranscript} onChange={(e) => setManualTranscript(e.target.value)} rows={6} placeholder="الصقي هنا نص تفريغ الحصة إن وُجد..." />
            </label>
            {errorMsg && <p className="co-error">{errorMsg}</p>}
            <button className="co-cta" onClick={analyzeLesson} disabled={allReviewFrames.length === 0}>حلّلي الحصة وأنشئي التقرير</button>
            <button className="co-link-btn" onClick={resetAll}>البدء من جديد</button>
          </div>
        </div>
      )}

      {step === "analyzing" && (
        <div className="co-board co-center">
          <div className="co-spinner" />
          <p className="co-analyzing-text">جارٍ تحليل الحصة... يقرأ الذكاء الاصطناعي اللقطات والنص ويكتب تقريرك</p>
        </div>
      )}

      {step === "report" && report && (
        <div className="co-paper-wrap">
          <div className="co-paper">
            <div className="co-paper-head">
              <div>
                <h1>تقرير أداء الحصة</h1>
                <p className="co-meta">{subject || "مادة غير محددة"} · صف {grade || "—"} · {teacherName || "المعلم/ة"}</p>
              </div>
              <div className="co-stamp"><span className="co-stamp-num">{report.overallScore}</span><span className="co-stamp-sub">/ 10</span></div>
            </div>

            <hr className="co-rule" />
            <section><h2>ملخص الحصة</h2><p className="co-summary">{report.summary}</p></section>

            <hr className="co-rule" />
            <section>
              <h2 className="co-h-good">نقاط القوة</h2>
              <ul className="co-list co-list--good">{(report.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>

            <hr className="co-rule" />
            <section>
              <h2 className="co-h-bad">نقاط تحتاج تحسين</h2>
              <ul className="co-list co-list--bad">{(report.weaknesses || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </section>

            {report.boardUsage && (
              <>
                <hr className="co-rule" />
                <section><h2>استخدام اللوح الإلكتروني</h2><p className="co-summary">{report.boardUsage}</p></section>
              </>
            )}

            <hr className="co-rule" />
            <section><h2>تفاعل الطلاب (من لقطات الكاميرا)</h2><p className="co-summary">{report.engagementNotes}</p></section>

            <hr className="co-rule" />
            <section>
              <h2>توصيات للتطوير</h2>
              <ol className="co-list co-list--rec">{(report.recommendations || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
            </section>

            <p className="co-disclaimer">تقرير مُولَّد بمساعدة الذكاء الاصطناعي بناءً على لقطات محدودة من الحصة — يُقترح استخدامه كنقطة انطلاق للتأمل الذاتي والحوار مع المشرف التربوي، وليس كحكم نهائي على الأداء.</p>
          </div>

          <div className="co-send-card">
            <h3>إرسال التقرير</h3>
            <p className="co-send-hint">حددي لمين — المعلمة، الإدارة، أو أي شخص — وبيفتحلك تطبيق البريد أو واتساب جاهز بالرسالة، وتضغطي إرسال بنفسك من هناك.</p>
            <div className="co-field-row co-field-row--paper">
              <label>الاسم (اختياري)<input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="مثال: أ. سارة / إدارة المدرسة" /></label>
            </div>
            <div className="co-send-row">
              <input className="co-send-input" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="البريد الإلكتروني" type="email" />
              <button className="co-send-btn" onClick={sendByEmail} disabled={!recipientEmail}>إرسال بالبريد ✉</button>
            </div>
            <div className="co-send-row">
              <input className="co-send-input" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="رقم واتساب مع رمز الدولة، مثال 9627xxxxxxx" />
              <button className="co-send-btn co-send-btn--wa" onClick={sendByWhatsapp} disabled={!recipientPhone}>إرسال بواتساب 💬</button>
            </div>
            <p className="co-send-note">واتساب ما بيسمح بإرفاق ملف PDF تلقائيًا عبر الرابط — الرسالة بترسل نص التقرير المختصر، وإذا بدك ترفقي التقرير كامل كـPDF اضغطي "طباعة/حفظ كـPDF" وأرفقيه يدويًا بمحادثة واتساب.</p>
          </div>

          <div className="co-report-actions">
            <button className="co-cta" onClick={() => window.print()}>طباعة / حفظ كـ PDF</button>
            <button className="co-link-btn" onClick={resetAll}>تسجيل حصة جديدة</button>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
.co-root { min-height: 100%; width: 100%; font-family: 'Tajawal', sans-serif; box-sizing: border-box; }
.co-root * { box-sizing: border-box; }
.co-hidden-video { position: absolute; width: 2px; height: 2px; opacity: 0; pointer-events: none; }

.co-board { background: radial-gradient(ellipse at top left, #2f5240 0%, #24402f 70%); min-height: 640px; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; color: #f2efe0; }
.co-center { justify-content: center; align-items: center; text-align: center; }

.co-chalk-title { text-align: center; max-width: 560px; margin-bottom: 28px; }
.co-chalk-title h1 { font-family: 'Changa', sans-serif; font-weight: 800; font-size: 34px; margin: 0 0 6px; color: #fbf8ef; }
.co-underline { width: 260px; height: 12px; display: block; margin: 0 auto 14px; }
.co-underline path { fill: none; stroke: #f4d35e; stroke-width: 3; stroke-linecap: round; }
.co-tagline { font-size: 15px; line-height: 1.7; color: #cfe0d2; margin: 0; }

.co-card { width: 100%; max-width: 520px; }
.co-card--chalk { background: rgba(255,255,255,0.04); border: 1.5px dashed rgba(244,211,94,0.5); border-radius: 6px; padding: 28px; }

.co-field-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.co-field-row label { flex: 1 1 140px; display: flex; flex-direction: column; font-size: 13px; color: #cfe0d2; gap: 6px; }
.co-field-row input, .co-transcript-label textarea { background: rgba(255,255,255,0.9); border: none; border-radius: 4px; padding: 9px 10px; font-family: 'Tajawal', sans-serif; font-size: 14px; color: #22303a; }

.co-mode-toggle { display: flex; gap: 8px; margin-bottom: 14px; }
.co-mode-toggle button { flex: 1; background: transparent; border: 1.5px solid rgba(255,255,255,0.25); color: #e4ece2; padding: 10px 8px; border-radius: 4px; font-family: 'Tajawal', sans-serif; font-size: 13px; cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.co-mode-toggle button.active { background: rgba(244,211,94,0.16); border-color: #f4d35e; color: #fdf6de; }

.co-checkbox-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: #cfe0d2; line-height: 1.6; margin-bottom: 18px; cursor: pointer; }
.co-checkbox-row input { margin-top: 3px; }

.co-cta { display: block; width: 100%; text-align: center; background: #f4d35e; color: #2b3a1f; border: none; border-radius: 4px; padding: 14px; font-family: 'Changa', sans-serif; font-weight: 700; font-size: 16px; cursor: pointer; transition: transform 0.1s, background 0.15s; }
.co-cta:hover { background: #f7de84; }
.co-cta:active { transform: scale(0.98); }
.co-cta:disabled { opacity: 0.5; cursor: not-allowed; }
.co-cta--stop { background: #e0685a; color: #fff; }
.co-cta--stop:hover { background: #e87f73; }
.co-upload-btn { cursor: pointer; }

.co-link-btn { background: none; border: none; color: #cfe0d2; text-decoration: underline; font-family: 'Tajawal', sans-serif; font-size: 13px; margin-top: 12px; cursor: pointer; display: block; width: 100%; text-align: center; }

.co-error { color: #ffb4a8; font-size: 13px; margin-top: 12px; text-align: center; }
.co-warn { color: #f4d35e; font-size: 13px; text-align: center; margin: 4px 0 12px; }
.co-consent { max-width: 520px; font-size: 12.5px; color: #a9c2ac; margin-top: 22px; line-height: 1.7; text-align: center; }

.co-note-box { max-width: 520px; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 16px 18px; margin-top: 20px; }
.co-note-box p { font-size: 13px; line-height: 1.8; color: #d7e4d9; margin: 0 0 8px; }
.co-note-warn { color: #a9c2ac !important; font-size: 12px !important; margin-bottom: 0 !important; }

.co-live-screen { gap: 0; }
.co-rec-badge-standalone { background: rgba(0,0,0,0.3); color: #fff; padding: 8px 16px; border-radius: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.co-dot { width: 9px; height: 9px; border-radius: 50%; background: #e0453a; animation: pulse 1.2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.co-live-sources { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; justify-content: center; }
.co-source-pill { background: rgba(244,211,94,0.15); border: 1px solid rgba(244,211,94,0.4); color: #fdf6de; padding: 6px 14px; border-radius: 20px; font-size: 13px; }
.co-source-pill--off { opacity: 0.5; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }

.co-transcript-box { width: 100%; max-width: 520px; background: rgba(255,255,255,0.06); border-radius: 6px; padding: 14px; min-height: 70px; font-size: 14px; line-height: 1.8; color: #e4ece2; margin-bottom: 14px; }
.co-minimize-hint { font-size: 13px; color: #a9c2ac; max-width: 420px; text-align: center; line-height: 1.7; margin-bottom: 20px; }

.co-transcript-label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #cfe0d2; margin: 16px 0; }
.co-transcript-label textarea { resize: vertical; line-height: 1.7; }
.co-upload-name { font-size: 13px; color: #cfe0d2; margin-bottom: 12px; }

.co-thumbs { display: flex; gap: 10px; flex-wrap: wrap; margin: 6px 0 18px; }
.co-thumb-wrap { position: relative; }
.co-thumb { width: 72px; height: 46px; object-fit: cover; border-radius: 3px; border: 2px solid rgba(255,255,255,0.5); display: block; }
.co-thumb-tag { position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.65); color: #fdf6de; font-size: 9px; padding: 1px 5px; border-radius: 3px; }

.co-spinner { width: 44px; height: 44px; border: 4px solid rgba(244,211,94,0.25); border-top-color: #f4d35e; border-radius: 50%; animation: spin 0.9s linear infinite; margin-bottom: 18px; }
@keyframes spin { to { transform: rotate(360deg); } }
.co-analyzing-text { max-width: 360px; color: #cfe0d2; font-size: 14.5px; line-height: 1.7; }

.co-paper-wrap { background: #e9e4d6; min-height: 640px; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; }
.co-paper { background: #fffdf7; max-width: 620px; width: 100%; padding: 40px 36px; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.15), 0 12px 30px rgba(0,0,0,0.1); }
.co-paper-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.co-paper-head h1 { font-family: 'Changa', sans-serif; font-size: 26px; font-weight: 800; color: #22303a; margin: 0 0 4px; }
.co-meta { font-size: 13.5px; color: #6b7a72; margin: 0; }
.co-stamp { border: 3px solid #c1443d; color: #c1443d; border-radius: 50%; width: 66px; height: 66px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); flex-shrink: 0; font-family: 'Changa', sans-serif; }
.co-stamp-num { font-size: 20px; font-weight: 800; line-height: 1; }
.co-stamp-sub { font-size: 10px; }

.co-rule { border: none; border-top: 1px dashed #cfcabb; margin: 20px 0; }
.co-paper section h2 { font-family: 'Changa', sans-serif; font-size: 16px; font-weight: 700; color: #22303a; margin: 0 0 10px; }
.co-h-good { color: #2e7d4f; }
.co-h-bad { color: #b8453d; }
.co-summary { font-size: 14.5px; line-height: 1.9; color: #3a463f; margin: 0; }
.co-list { margin: 0; padding: 0 20px 0 0; font-size: 14px; line-height: 2; color: #333f38; }
.co-list--good li::marker { color: #2e7d4f; }
.co-list--bad li::marker { color: #b8453d; }
.co-list--rec { padding-right: 22px; }
.co-disclaimer { font-size: 11.5px; color: #94897a; margin-top: 26px; line-height: 1.7; border-top: 1px solid #e3ddcb; padding-top: 14px; }

.co-send-card { background: #fffdf7; max-width: 620px; width: 100%; padding: 26px 32px; border-radius: 2px; margin-top: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 3px dashed #cfcabb; }
.co-send-card h3 { font-family: 'Changa', sans-serif; font-size: 16px; color: #22303a; margin: 0 0 6px; }
.co-send-hint { font-size: 13px; color: #6b7a72; line-height: 1.7; margin: 0 0 16px; }
.co-field-row--paper label { color: #4a5850; }
.co-field-row--paper input { background: #f3f0e6; }
.co-send-row { display: flex; gap: 10px; margin-bottom: 10px; }
.co-send-input { flex: 1; background: #f3f0e6; border: none; border-radius: 4px; padding: 10px 12px; font-family: 'Tajawal', sans-serif; font-size: 14px; color: #22303a; }
.co-send-btn { background: #22303a; color: #fdf6de; border: none; border-radius: 4px; padding: 10px 16px; font-family: 'Tajawal', sans-serif; font-weight: 700; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.co-send-btn:hover { background: #35454f; }
.co-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.co-send-btn--wa { background: #2e7d4f; }
.co-send-btn--wa:hover { background: #379260; }
.co-send-note { font-size: 11.5px; color: #94897a; line-height: 1.7; margin: 8px 0 0; }

.co-report-actions { display: flex; gap: 12px; margin-top: 22px; max-width: 620px; width: 100%; }
.co-report-actions .co-cta { background: #22303a; color: #fdf6de; }
.co-report-actions .co-cta:hover { background: #35454f; }
.co-report-actions .co-link-btn { color: #4a5850; }

@media print {
  .co-report-actions, .co-send-card { display: none; }
  .co-paper-wrap { background: white; padding: 0; }
  .co-paper { box-shadow: none; }
}

@media (max-width: 480px) {
  .co-field-row { flex-direction: column; }
  .co-paper { padding: 26px 20px; }
}
`;
