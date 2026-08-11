/* api.js — الاتصال المباشر بـ Claude API من المتصفح لتصحيح أوراق الطلاب */

const ClaudeAPI = (() => {
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const API_VERSION = '2023-06-01';

  const SYSTEM_PROMPT = `أنت مساعد تصحيح إلكتروني يعمل كمعلّم خبير دقيق ومنصف.
مهمتك مقارنة إجابة الطالب في الصورة المرفقة مع الإجابة النموذجية (وورقة الأسئلة إن وُجدت)، وتصحيحها سؤالاً سؤالاً بعدل ودقة.
اتّبع هذه القواعد:
- أعط علامة تناسبية للإجابات الصحيحة جزئياً، ولا تعطِ صفراً أو العلامة الكاملة إلا إذا كانت الإجابة خاطئة تماماً أو صحيحة تماماً فعلاً.
- اكتب ملاحظة قصيرة ومحددة لكل سؤال بالعربية الفصحى البسيطة، توضح ما هو صحيح وما هو ناقص أو خاطئ.
- إن لم تستطع قراءة جزء من خط الطالب بوضوح، اذكر ذلك صراحة في الملاحظة ولا تخترع إجابة لم يكتبها.
- لا تخترع أسئلة غير موجودة في الصور. اعتمد فقط على ما تراه في الصور المرفقة.
- اجعل مجموع أقصى علامة للأسئلة (max) يساوي العلامة الكاملة المطلوبة للامتحان قدر الإمكان.
- أعد النتيجة حصراً وفق مخطط JSON المطلوب دون أي نص إضافي خارجه.`;

  const RESULT_SCHEMA = {
    type: 'object',
    properties: {
      total_score: { type: 'number' },
      max_score: { type: 'number' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      overall_feedback: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: { type: 'string' },
            score: { type: 'number' },
            max: { type: 'number' },
            feedback: { type: 'string' },
          },
          required: ['number', 'score', 'max', 'feedback'],
          additionalProperties: false,
        },
      },
    },
    required: ['total_score', 'max_score', 'confidence', 'overall_feedback', 'questions'],
    additionalProperties: false,
  };

  function imageBlock(img) {
    return { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } };
  }

  function buildContentBlocks(exam, student) {
    const blocks = [];
    blocks.push({
      type: 'text',
      text: [
        'معلومات الامتحان:',
        `- اسم الامتحان: ${exam.name}`,
        exam.subject ? `- المادة: ${exam.subject}` : null,
        `- العلامة الكاملة المطلوبة: ${exam.maxScore}`,
        exam.instructions ? `- تعليمات إضافية من المعلم: ${exam.instructions}` : null,
      ].filter(Boolean).join('\n'),
    });
    if (exam.questionImage) {
      blocks.push({ type: 'text', text: 'صورة ورقة الأسئلة:' });
      blocks.push(imageBlock(exam.questionImage));
    }
    blocks.push({ type: 'text', text: 'صورة الإجابة النموذجية (المرجعية):' });
    blocks.push(imageBlock(exam.answerKeyImage));
    blocks.push({ type: 'text', text: `صورة ورقة إجابة الطالب (الاسم: ${student.name}):` });
    blocks.push(imageBlock(student.image));
    blocks.push({
      type: 'text',
      text: 'صحّح إجابة هذا الطالب مقارنة بالإجابة النموذجية وأعد النتيجة وفق مخطط JSON المطلوب فقط.',
    });
    return blocks;
  }

  function buildRequestBody(model, contentBlocks) {
    const body = {
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
      output_config: {
        format: { type: 'json_schema', schema: RESULT_SCHEMA },
      },
    };
    // التفكير الموسّع (thinking) ومعامل الجهد (effort) غير مدعومين بنفس الشكل على Haiku 4.5
    if (model === 'claude-opus-5' || model === 'claude-sonnet-5') {
      body.thinking = { type: 'disabled' };
      body.output_config.effort = 'medium';
    }
    return body;
  }

  function mapApiError(status, data) {
    const type = data && data.error && data.error.type;
    const msg = data && data.error && data.error.message;
    const map = {
      authentication_error: 'مفتاح API غير صحيح أو منتهي الصلاحية. تحقق منه في الإعدادات.',
      permission_error: 'هذا المفتاح لا يملك صلاحية استخدام هذا النموذج.',
      not_found_error: 'النموذج المحدد غير متاح حالياً.',
      rate_limit_error: 'تم تجاوز الحد المسموح من الطلبات. انتظر قليلاً ثم أعد المحاولة.',
      overloaded_error: 'خوادم Anthropic مزدحمة حالياً. حاول مرة أخرى بعد قليل.',
      invalid_request_error: `طلب غير صالح: ${msg || ''}`,
    };
    return map[type] || `حدث خطأ غير متوقع (${status}): ${msg || 'بدون تفاصيل'}`;
  }

  async function gradeStudent(exam, student, settings) {
    if (!settings.apiKey) {
      throw new Error('لم يتم إدخال مفتاح Anthropic API. افتح الإعدادات وأدخل المفتاح أولاً.');
    }
    if (!exam.answerKeyImage) {
      throw new Error('يجب رفع صورة الإجابة النموذجية قبل التصحيح.');
    }
    const content = buildContentBlocks(exam, student);
    const body = buildRequestBody(settings.model, content);

    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': settings.apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      throw new Error('تعذر الاتصال بخوادم Anthropic. تحقق من اتصالك بالإنترنت.');
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('استجابة غير مفهومة من الخادم.');
    }

    if (!res.ok) {
      throw new Error(mapApiError(res.status, data));
    }
    if (data.stop_reason === 'refusal') {
      throw new Error('رفض النظام الذكي معالجة هذا الطلب. جرّب صورة أوضح أو أعد صياغة التعليمات.');
    }
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    if (!textBlock) {
      throw new Error('لم يُرجع النموذج نتيجة نصية قابلة للقراءة.');
    }
    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (e) {
      throw new Error('تعذر تفسير نتيجة التصحيح (تنسيق غير صالح).');
    }
    return parsed;
  }

  return { gradeStudent };
})();
