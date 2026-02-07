export type GeminiEstimatedFood = {
  foodName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type GeminiDetectedFood = {
  foodName: string;
  defaultUnit: string;
  unitOptions: string[];
};

type JsonRecord = Record<string, unknown>;

const asRecord = (v: unknown): JsonRecord | null => {
  if (!v || typeof v !== 'object') return null;
  return v as JsonRecord;
};

const safeString = (v: unknown): string => (typeof v === 'string' ? v : String(v ?? ''));

const safeNumber = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const readGeminiApiKey = (): string | null => {
  const key = process.env.GEMINI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : null;
};

export const isGeminiEnabled = (): boolean => readGeminiApiKey() !== null;

let cachedModelId: string | null = null;
let cachedApiVersion: 'v1beta' | 'v1' | null = null;

const API_VERSIONS: Array<'v1beta' | 'v1'> = ['v1beta', 'v1'];

const listModelsForVersion = async (apiKey: string, apiVersion: 'v1beta' | 'v1'): Promise<string[]> => {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models?key=${apiKey}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    if (res.status === 403) {
      const text = await res.text();
      if (text.includes('reported as leaked')) {
        throw new Error(
          'API key ถูกระบบแจ้งว่ารั่วไหล (leaked) กรุณาสร้าง API key ใหม่ แล้วอัปเดตในไฟล์ .env.local จากนั้นรีสตาร์ทเซิร์ฟเวอร์',
        );
      }
      throw new Error(`Gemini error: 403 ${text}`);
    }
    return [];
  }
  const data: unknown = await res.json();
  const dataRec = asRecord(data);
  const modelsRaw = dataRec?.models;
  const models = Array.isArray(modelsRaw) ? modelsRaw : [];
  const supported = models
    .filter(
      (m: unknown) => {
        const mr = asRecord(m);
        const methods = mr?.supportedGenerationMethods;
        return Array.isArray(methods) && methods.map(String).includes('generateContent');
      },
    )
    .map((m: unknown) => safeString(asRecord(m)?.name))
    .filter((name: string) => name.startsWith('models/'))
    .map((name: string) => name.replace('models/', ''));

  return supported;
};

const listModels = async (apiKey: string): Promise<{ apiVersion: 'v1beta' | 'v1'; models: string[] }[]> => {
  const results: { apiVersion: 'v1beta' | 'v1'; models: string[] }[] = [];
  for (const v of API_VERSIONS) {
    const models = await listModelsForVersion(apiKey, v);
    if (models.length > 0) results.push({ apiVersion: v, models });
  }
  return results;
};

const prioritizeModels = (models: string[]): string[] => {
  const prefer = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  const geminiOnly = models.filter((m) => m.toLowerCase().includes('gemini'));
  const pool = geminiOnly.length > 0 ? geminiOnly : models;

  const preferred = prefer.filter((p) => pool.includes(p) || pool.some((m) => m.startsWith(p)));
  const rest = pool.filter((m) => !preferred.some((p) => m === p || m.startsWith(p)));
  return [...preferred, ...rest];
};

const pickModelCandidates = async (
  apiKey: string,
): Promise<{ apiVersion: 'v1beta' | 'v1'; modelIds: string[] }> => {
  if (cachedModelId && cachedApiVersion) {
    return { apiVersion: cachedApiVersion, modelIds: [cachedModelId] };
  }

  const discoveredByVersion = await listModels(apiKey);
  if (discoveredByVersion.length > 0) {
    const best = discoveredByVersion[0]!;
    const prioritized = prioritizeModels(best.models);
    return { apiVersion: best.apiVersion, modelIds: prioritized };
  }

  // Fallbacks for common availability.
  return {
    apiVersion: 'v1beta',
    modelIds: ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'],
  };
};

const callGenerateContent = async (
  apiKey: string,
  apiVersion: 'v1beta' | 'v1',
  modelId: string,
  parts: unknown[],
  options?: { maxOutputTokens?: number },
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, maxOutputTokens: options?.maxOutputTokens ?? 512 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403 && text.includes('reported as leaked')) {
      throw new Error(
        'API key ถูกระบบแจ้งว่ารั่วไหล (leaked) กรุณาสร้าง API key ใหม่ แล้วอัปเดตในไฟล์ .env.local จากนั้นรีสตาร์ทเซิร์ฟเวอร์',
      );
    }
    throw new Error(`Gemini error: ${res.status} ${text}`);
  }

  const data: unknown = await res.json();
  const dataRec = asRecord(data);
  const candidates = Array.isArray(dataRec?.candidates) ? dataRec?.candidates : [];
  const first = candidates[0];
  const firstRec = asRecord(first);
  const contentRec = asRecord(firstRec?.content);
  const partsRaw = contentRec?.parts;
  const partsArr = Array.isArray(partsRaw) ? partsRaw : [];
  return (
    partsArr
      .map((p: unknown) => safeString(asRecord(p)?.text))
      .filter((t) => t && t.trim().length > 0)
      .join('') ?? ''
  );
};

const extractJsonObject = (raw: string): string | null => {
  if (!raw) return null;
  let s = raw.trim();

  // Some models occasionally wrap the whole payload in a string literal.
  // Example: "json { ... }" (including quotes)
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }

  // Strip markdown code fences if present.
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\s*/m, '').replace(/```\s*$/m, '').trim();
  }

  // Strip leading language tags like: json\n{...} or json {...}
  s = s.replace(/^json\s*/i, '').trim();

  // Normalize common unicode variants.
  s = s.replace(/\u201C|\u201D/g, '"').replace(/\u2018|\u2019/g, "'");
  s = s.replace(/\uFF5B/g, '{').replace(/\uFF5D/g, '}');

  const jsonStart = s.indexOf('{');
  if (jsonStart < 0) return null;

  let depth = 0;
  for (let i = jsonStart; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      return s.slice(jsonStart, i + 1);
    }
  }

  // Tolerate truncated JSON (common when model output is cut mid-object):
  // If we saw an opening '{' but never reached depth 0, try to auto-close.
  if (depth > 0) {
    let candidate = s.slice(jsonStart);
    // Remove trailing commas which would make JSON invalid.
    candidate = candidate.replace(/,\s*$/m, '');
    // If ends with an unterminated string quote, don't guess.
    const trimmed = candidate.trimEnd();
    if (trimmed.endsWith('"') || trimmed.endsWith("'")) {
      // Still try to close braces; JSON.parse may fail and we'll fall back to retry/repair.
    }
    return `${candidate}}`;
  }

  // Fallback: if braces are unbalanced but we still have a closing brace somewhere,
  // return the widest slice from first '{' to last '}'.
  const jsonEnd = s.lastIndexOf('}');
  if (jsonEnd > jsonStart) return s.slice(jsonStart, jsonEnd + 1);

  return null;
};

const parseGeminiJsonFood = (raw: string, fallbackName: string): GeminiEstimatedFood => {
  const json = extractJsonObject(raw);
  if (!json) {
    const preview = String(raw ?? '').trim().slice(0, 300);
    throw new Error(preview ? `Gemini ตอบกลับไม่ใช่ JSON: ${preview}` : 'Gemini ตอบกลับว่าง');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    const preview = String(raw ?? '').trim().slice(0, 300);
    throw new Error(preview ? `Gemini ตอบกลับไม่ใช่ JSON: ${preview}` : 'Gemini ตอบกลับว่าง');
  }

  const rec = asRecord(parsed) ?? {};
  const protein = Math.max(0, safeNumber(rec.protein));
  const fat = Math.max(0, safeNumber(rec.fat));
  const carbs = Math.max(0, safeNumber(rec.carbs));
  let calories = Math.max(0, safeNumber(rec.calories));

  // If calories missing/0 but macros present, compute calories from macros.
  if (calories <= 0 && (protein > 0 || fat > 0 || carbs > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  }

  // If everything is zero, treat as invalid response (Gemini sometimes returns placeholders).
  if (calories <= 0 && protein <= 0 && fat <= 0 && carbs <= 0) {
    const preview = String(raw ?? '').trim().slice(0, 300);
    throw new Error(preview ? `Gemini ตอบกลับไม่สมบูรณ์: ${preview}` : 'Gemini ตอบกลับว่าง');
  }

  return {
    foodName: safeString(rec.foodName || fallbackName).slice(0, 80),
    calories,
    protein,
    fat,
    carbs,
  };
};

export const estimateFoodFromTextWithGemini = async (input: {
  text: string;
}): Promise<GeminiEstimatedFood> => {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
  }

  const prompt =
    'คุณเป็นนักโภชนาการ ช่วยประเมินอาหารจากข้อความผู้ใช้ และตอบกลับเป็น JSON object เท่านั้น “บรรทัดเดียว” โดยห้ามใส่ markdown/โค้ดบล็อก/``` และห้ามมีข้อความอื่น (ห้ามมีคำว่า json นำหน้า). ' +
    'schema: {"foodName":string,"calories":number,"protein":number,"fat":number,"carbs":number}. ' +
    'หน่วย: calories เป็น kcal, macros เป็นกรัม. ' +
    `ข้อความผู้ใช้: ${input.text}`;

  const picked = await pickModelCandidates(apiKey);
  const candidates = picked.modelIds
    .concat(['gemini-pro', 'gemini-1.0-pro', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'])
    .filter((v, i, arr) => arr.indexOf(v) === i);

  let raw = '';
  let lastErr: unknown = null;
  const versionsToTry: Array<'v1beta' | 'v1'> = picked.apiVersion === 'v1beta' ? ['v1beta', 'v1'] : ['v1', 'v1beta'];

  for (const apiVersion of versionsToTry) {
    for (const modelId of candidates) {
      try {
        raw = await callGenerateContent(apiKey, apiVersion, modelId, [{ text: prompt }], { maxOutputTokens: 2048 });
        try {
          const parsed = parseGeminiJsonFood(raw, input.text);
          cachedModelId = modelId;
          cachedApiVersion = apiVersion;
          return parsed;
        } catch {
          // Retry once with an even stricter instruction. This fixes occasional truncated/markdown outputs.
          const retryPrompt =
            'ตอบกลับใหม่เป็น JSON object บรรทัดเดียวเท่านั้น (ห้าม markdown/```/ห้ามมีคำอื่น). ' +
            'ห้ามตอบค่า 0 ทั้งหมด; ถ้าไม่แน่ใจให้ประมาณค่าที่สมเหตุสมผล. ' +
            'schema: {"foodName":string,"calories":number,"protein":number,"fat":number,"carbs":number}. ' +
            `ข้อความผู้ใช้: ${input.text}`;
          raw = await callGenerateContent(apiKey, apiVersion, modelId, [{ text: retryPrompt }], { maxOutputTokens: 1024 });

          try {
            const parsed2 = parseGeminiJsonFood(raw, input.text);
            cachedModelId = modelId;
            cachedApiVersion = apiVersion;
            return parsed2;
          } catch {
            // Final attempt: ask Gemini to repair/normalize into valid JSON.
            const snippet = String(raw ?? '').trim().slice(0, 1200);
            const repairPrompt =
              'แปลงข้อความต่อไปนี้ให้เป็น JSON object ที่ถูกต้อง 1 บรรทัดเท่านั้น โดยห้ามมี markdown/```/ข้อความอื่น. ' +
              'ต้องมี key: foodName, calories, protein, fat, carbs (ตัวเลขเป็น number). ห้ามตอบค่า 0 ทั้งหมด; ถ้าไม่แน่ใจให้ประมาณค่าที่สมเหตุสมผล. ' +
              `ข้อความ: ${snippet}`;
            raw = await callGenerateContent(apiKey, apiVersion, modelId, [{ text: repairPrompt }], { maxOutputTokens: 1024 });

            try {
              const parsed3 = parseGeminiJsonFood(raw, input.text);
              cachedModelId = modelId;
              cachedApiVersion = apiVersion;
              return parsed3;
            } catch {
              const snippet2 = String(raw ?? '').trim().slice(0, 1200);
              const repairPrompt2 =
                'ตอบกลับเป็น JSON object 1 บรรทัดเท่านั้น (ห้ามมี markdown/```/คำอื่น). ' +
                'ถ้าข้อมูลไม่พอให้ประมาณค่าแบบสมเหตุสมผล. ห้ามตอบไม่ครบ schema. ' +
                'schema: {"foodName":string,"calories":number,"protein":number,"fat":number,"carbs":number}. ' +
                `ข้อความ: ${snippet2}`;
              raw = await callGenerateContent(apiKey, apiVersion, modelId, [{ text: repairPrompt2 }], {
                maxOutputTokens: 1024,
              });
              const parsed4 = parseGeminiJsonFood(raw, input.text);
              cachedModelId = modelId;
              cachedApiVersion = apiVersion;
              return parsed4;
            }
          }
        }
      } catch (e: unknown) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e ?? '');
        if (msg.includes('404') || msg.includes('NOT_FOUND')) continue;
        throw e;
      }
    }
    if (raw) break;
  }

  if (!raw) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'ไม่ทราบสาเหตุ');
    throw new Error(
      `เรียก Gemini ไม่สำเร็จ: ${msg}. ` +
        'กรุณาตรวจสอบว่า API key ใช้งานได้ และเปิดใช้งาน Generative Language API/Google AI Studio สำหรับโปรเจกต์นี้แล้ว',
    );
  }

  // Should not normally reach here because we return after successful parsing.
  return parseGeminiJsonFood(raw, input.text);
};

export const estimateFoodFromImageWithGemini = async (input: {
  imageBase64: string;
  mimeType: string;
  text?: string;
  amount?: number;
  unit?: string;
}): Promise<GeminiEstimatedFood> => {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
  }

  const amountText =
    typeof input.amount === 'number' && Number.isFinite(input.amount) && input.amount > 0
      ? String(input.amount)
      : '';
  const unitText = input.unit ? String(input.unit) : '';

  const prompt =
    'คุณเป็นนักโภชนาการ ช่วยประเมินอาหารจากรูปภาพนี้ และตอบกลับเป็น JSON object เท่านั้น “บรรทัดเดียว” โดยห้ามใส่ markdown/โค้ดบล็อก/``` และห้ามมีข้อความอื่น. ' +
    'schema: {"foodName":string,"calories":number,"protein":number,"fat":number,"carbs":number}. ' +
    'หน่วย: calories เป็น kcal, macros เป็นกรัม. ' +
    (amountText && unitText
      ? `ปริมาณที่กิน: ${amountText} ${unitText}. ให้คำนวณตามปริมาณนี้.`
      : 'ถ้าไม่ทราบปริมาณ ให้ประเมินเป็น 1 ที่/1 จานตามภาพ.') +
    (input.text ? ` ข้อมูลเพิ่มเติม: ${input.text}` : '');

  const picked = await pickModelCandidates(apiKey);
  const candidates = picked.modelIds
    .concat([
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
    ])
    .filter((v, i, arr) => arr.indexOf(v) === i);

  let raw = '';
  let lastErr: unknown = null;
  const versionsToTry: Array<'v1beta' | 'v1'> =
    picked.apiVersion === 'v1beta' ? ['v1beta', 'v1'] : ['v1', 'v1beta'];

  const parts = [
    { inlineData: { data: input.imageBase64, mimeType: input.mimeType } },
    { text: prompt },
  ];

  const tryOnce = async (maxOutputTokens: number) => {
    raw = '';
    for (const apiVersion of versionsToTry) {
      for (const modelId of candidates) {
        try {
          raw = await callGenerateContent(apiKey, apiVersion, modelId, parts, { maxOutputTokens });
          cachedModelId = modelId;
          cachedApiVersion = apiVersion;
          return;
        } catch (e: unknown) {
          lastErr = e;
          const msg = e instanceof Error ? e.message : String(e ?? '');
          if (msg.includes('404') || msg.includes('NOT_FOUND')) continue;
          throw e;
        }
      }
    }
  };

  await tryOnce(1024);

  if (!raw) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'ไม่ทราบสาเหตุ');
    throw new Error(
      `เรียก Gemini ไม่สำเร็จ: ${msg}. ` +
        'กรุณาตรวจสอบว่า API key ใช้งานได้ และเปิดใช้งาน Generative Language API/Google AI Studio สำหรับโปรเจกต์นี้แล้ว',
    );
  }

  try {
    return parseGeminiJsonFood(raw, 'อาหารจากรูป');
  } catch (e: unknown) {
    // Likely truncated/non-JSON. Retry once with a larger token budget.
    await tryOnce(2048);
    if (!raw) throw e;
    return parseGeminiJsonFood(raw, 'อาหารจากรูป');
  }
};

export const detectFoodFromImageWithGemini = async (input: {
  imageBase64: string;
  mimeType: string;
}): Promise<GeminiDetectedFood> => {
  const apiKey = readGeminiApiKey();
  if (!apiKey) {
    throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY');
  }

  const prompt =
    'ดูรูปอาหารนี้ แล้วตอบกลับเป็น JSON object เท่านั้น “บรรทัดเดียว” โดยห้ามใส่ markdown/โค้ดบล็อก/``` และห้ามมีข้อความอื่น. ' +
    'schema: {"foodName":string,"defaultUnit":string,"unitOptions":string[]}. ' +
    'unitOptions ให้เลือกจากชุดนี้เท่านั้น: ["กรัม","มล.","ชิ้น","จาน","ถ้วย","ช้อนโต๊ะ","ช้อนชา"]. ' +
    'defaultUnit ต้องเป็นหนึ่งใน unitOptions. ' +
    'ถ้าไม่แน่ใจให้ defaultUnit = "กรัม".';

  const picked = await pickModelCandidates(apiKey);
  const candidates = picked.modelIds
    .concat(['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro'])
    .filter((v, i, arr) => arr.indexOf(v) === i);

  let raw = '';
  let lastErr: unknown = null;
  const versionsToTry: Array<'v1beta' | 'v1'> =
    picked.apiVersion === 'v1beta' ? ['v1beta', 'v1'] : ['v1', 'v1beta'];

  const parts = [
    { inlineData: { data: input.imageBase64, mimeType: input.mimeType } },
    { text: prompt },
  ];

  for (const apiVersion of versionsToTry) {
    for (const modelId of candidates) {
      try {
        raw = await callGenerateContent(apiKey, apiVersion, modelId, parts, { maxOutputTokens: 256 });
        cachedModelId = modelId;
        cachedApiVersion = apiVersion;
        break;
      } catch (e: unknown) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e ?? '');
        if (msg.includes('404') || msg.includes('NOT_FOUND')) continue;
        throw e;
      }
    }
    if (raw) break;
  }

  if (!raw) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'ไม่ทราบสาเหตุ');
    throw new Error(
      `เรียก Gemini ไม่สำเร็จ: ${msg}. ` +
        'กรุณาตรวจสอบว่า API key ใช้งานได้ และเปิดใช้งาน Generative Language API/Google AI Studio สำหรับโปรเจกต์นี้แล้ว',
    );
  }

  const json = extractJsonObject(raw);
  if (!json) {
    const preview = String(raw ?? '').trim().slice(0, 300);
    throw new Error(preview ? `Gemini ตอบกลับไม่ใช่ JSON: ${preview}` : 'Gemini ตอบกลับว่าง');
  }
  const parsedUnknown = JSON.parse(json) as unknown;
  const parsedRec = asRecord(parsedUnknown) ?? {};
  const unitOptionsRaw = parsedRec.unitOptions;
  const unitOptions = Array.isArray(unitOptionsRaw) ? unitOptionsRaw.map((u) => safeString(u)) : [];
  const defaultUnit = safeString(parsedRec.defaultUnit ?? 'กรัม');
  return {
    foodName: safeString(parsedRec.foodName ?? 'อาหารจากรูป').slice(0, 80),
    unitOptions: unitOptions.length > 0 ? unitOptions : ['กรัม', 'มล.', 'ชิ้น', 'จาน'],
    defaultUnit: unitOptions.includes(defaultUnit) ? defaultUnit : (unitOptions[0] ?? 'กรัม'),
  };
};
