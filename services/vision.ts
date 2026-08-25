/**
 * AI 拍照识别服务（BYOK）· 第一版仅 MiniMax · T11 调用链路
 * 协议：OpenAI 兼容 POST {baseUrl}/chat/completions，image_url = base64 data URI
 * 官方确认：MiniMax-M3 原生多模态支持图片/视频输入
 */
import { RecogItem, RecogResult } from './types-vision';

export type { RecogItem, RecogResult };

export interface VisionPreset {
  id: 'minimax-intl' | 'minimax-cn' | 'deepseek';
  label: string;
  baseUrl: string;
  defaultModel: string;
}

export const PRESETS: VisionPreset[] = [
  {
    id: 'minimax-cn',
    label: 'MiniMax 国内站',
    baseUrl: 'https://api.minimaxi.com/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
  },
  {
    id: 'minimax-intl',
    label: 'MiniMax 国际站',
    baseUrl: 'https://api.minimax.io/v1/chat/completions',
    defaultModel: 'MiniMax-M3',
  },
  {
    // DeepSeek 唯一支持图片输入的模型：deepseek-v4-flash-vision-exp（官方 Vision 指南 2026-08）
    // OpenAI 兼容格式：base64 data URI + image_url，与现有调用链完全一致
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-v4-flash-vision-exp',
  },
];



/** 识别 Prompt v2（加强 JSON 强制 + 容错说明） */
export const FOOD_RECOG_PROMPT = [
  '你是营养分析助手。识别图片中的所有食物，并对每种食物进行估算。',
  '重要：你的回复必须是一个合法 JSON 对象，不要写任何其他文字、解释、思考或 Markdown 代码块。',
  '输出格式：',
  '{"items":[{"name":"食物名(中文)","weight_g":100,"calories":100,"protein":0,"carbs":0,"fat":0,"fiber":null,"gi_guess":null}],"confidence":0.8}',
  '要求：混合菜拆分为主要食材分别列出；GI 无法判断时用 null；不确定时宁可保守估计。',
  '即使图片识别困难也要返回 items=[] 与 confidence=0.0，不要返回错误信息文本。',
].join('\n');

/** 鲁棒提取 JSON 对象：处理 ```json 围栏、首尾说明文字、首尾空格 */
export function parseRecogJson(content: string): RecogResult | null {
  if (!content || typeof content !== 'string') return null;
  let raw = content;

  // 1. 去掉 Markdown 代码块围栏
  raw = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '').trim();

  // 2. 抓取首尾 { } 作为 JSON 边界（应对模型加前缀说明）
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  raw = raw.slice(firstBrace, lastBrace + 1);

  // 3. 尝试解析
  try {
    const obj = JSON.parse(raw);
    if (!obj || !Array.isArray(obj.items)) return null;
    return obj as RecogResult;
  } catch {
    return null;
  }
}

export interface VisionCallCfg {
  baseUrl: string;
  model: string;
}

/**
 * 调用多模态识别。★ apiKey 由调用方传入，本函数绝不打印/存储。
 * 超时 15s；HTTP 非 200 或 JSON 解析失败都会 reject（错误 message 面向用户可读）。
 */
export function recognizeMeal(cfg: VisionCallCfg, apiKey: string, imageBase64: string): Promise<RecogResult> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: cfg.baseUrl,
      method: 'POST',
      timeout: 30000, // vision 模型（如 deepseek-vision-exp）大图推理可能超 15s
      header: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
      data: {
        model: cfg.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: FOOD_RECOG_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: '识别这餐食物' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      },
      success(res) {
        if (res.statusCode === 401) {
          reject(new Error('Key 无效或未授权，请检查 API Key'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`服务返回 ${res.statusCode}，请稍后重试`));
          return;
        }
        const content =
          ((res.data as Record<string, any>)?.choices?.[0]?.message?.content as string) ?? '';
        const parsed = parseRecogJson(content);
        if (parsed && parsed.items.length) resolve(parsed);
        else reject(new Error('AI 返回内容无法解析，请重试或手动录入'));
      },
      fail() {
        reject(new Error('网络请求失败，请检查网络后重试'));
      },
    });
  });
}

/** 测试连接结果（含错误详情） */
export interface TestResult {
  ok: boolean;
  status?: number;
  errMsg?: string;
}

/** 测试连接：发一条最小文本请求验证 key 与网络，返回含错误详情的结果 */
export function testConnection(cfg: VisionCallCfg, apiKey: string): Promise<TestResult> {
  return new Promise((resolve) => {
    wx.request({
      url: cfg.baseUrl,
      method: 'POST',
      timeout: 10000,
      header: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
      data: {
        model: cfg.model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      },
      success(res) {
        resolve({ ok: res.statusCode === 200, status: res.statusCode });
      },
      fail(e: WechatMiniprogram.RequestFailCallbackErr) {
        // 透传具体错误（域名/超时/网络/SSL等）
        const msg = (e && (e as { errMsg?: string }).errMsg) || '未知错误';
        resolve({ ok: false, errMsg: msg });
      },
    });
  });
}

/** 图片文件转 base64（FileSystemManager） */
export function fileToBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fsm = wx.getFileSystemManager();
    fsm.readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data as string),
      fail: () => reject(new Error('读取图片失败')),
    });
  });
}

/** 压缩图片到可上传尺寸；失败则返回原图路径 */
export function compressImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    wx.compressImage({
      src,
      quality: 40,
      compressedWidth: 1280,
      success: (r) => resolve(r.tempFilePath),
      fail: () => resolve(src),
    });
  });
}

// ---------- 识别结果草稿（多菜品逐条确认） ----------

interface RecogDraft {
  items: RecogItem[];
  confidence: number;
  createdAt: number;
}

const DRAFT_KEY = 'fd_recog_draft';

function draftGet(): RecogDraft | null {
  try {
    return (wx.getStorageSync(DRAFT_KEY) as RecogDraft) || null;
  } catch {
    return null;
  }
}

function draftSet(d: RecogDraft): void {
  try {
    wx.setStorageSync(DRAFT_KEY, d);
  } catch {
    /* ignore */
  }
}

export function setRecogDraft(items: RecogItem[], confidence: number): void {
  draftSet({ items, confidence, createdAt: Date.now() });
}

export function getRecogDraft(): RecogDraft | null {
  const d = draftGet();
  if (!d) return null;
  // 草稿有效期 2 小时，过期作废
  if (Date.now() - d.createdAt > 2 * 3600 * 1000) {
    try {
      wx.removeStorageSync(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return d;
}

/** 消费掉第 idx 条；返回剩余条数（0 = 全部完成，草稿清除） */
export function consumeDraftItem(idx: number): number {
  const d = draftGet();
  if (!d) return 0;
  d.items.splice(idx, 1);
  if (!d.items.length) {
    try {
      wx.removeStorageSync(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    return 0;
  }
  draftSet(d);
  return d.items.length;
}
