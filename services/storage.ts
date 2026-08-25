/**
 * 本地存储服务 · T2
 * key 分片策略（PRD 5）：日志按月分 key 防 1MB 单 key 上限
 * ★ 红线：API Key 只存 'vk'，永不上传、不进日志、不参与云同步
 */
import { BodyProfile, Food, MealLog, TrainingDay, TrainingLog, UserProfile, VisionConfig, WeightLog } from './types';
import { BUILTIN_FOODS } from '../data/foods';

export const SK = {
  foodsUser: 'fd_foods_user',
  logsMonth: (ym: string) => `fd_logs_${ym}`, // ym = '2026-08'
  weights: 'fd_weights',
  water: (d: string) => `fd_waters_${d}`,
  profile: 'fd_profile',
  body: 'fd_body', // 身体档案原始输入（用于目标计算）
  trainingDone: (d: string) => `fd_training_done_${d}`, // 打卡标记
  trainingLogMonth: (ym: string) => `fd_training_${ym}`, // 训练记录按月分片
  visionCfg: 'fd_vision_cfg',
  visionKey: 'vk', // ★ 独立字段红线
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v == null ? fallback : (v as T);
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  try {
    wx.setStorageSync(key, value);
  } catch {
    wx.showToast({ title: '存储空间不足，建议导出旧数据', icon: 'none' });
  }
}

export const todayStr = (): string => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const ymOf = (date: string) => date.slice(0, 7);

// ---------- 用户自定义食物库 ----------
export const foodsUserAll = (): Food[] => get<Food[]>(SK.foodsUser, []);

export function foodUserUpsert(food: Food): void {
  const list = foodsUserAll();
  const i = list.findIndex((f) => f.id === food.id);
  if (i >= 0) list[i] = food;
  else list.unshift(food);
  set(SK.foodsUser, list);
}

export function foodUserRemove(id: string): void {
  set(
    SK.foodsUser,
    foodsUserAll().filter((f) => f.id !== id),
  );
}

/** 跨库查食物：我的食物库优先，其次内置库 */
export function findFoodById(id: string): Food | null {
  return (
    foodsUserAll().find((f) => f.id === id) ||
    BUILTIN_FOODS.find((f) => f.id === id) ||
    null
  );
}

// ---------- 饮食记录（按月分片） ----------
export function logsOfMonth(ym: string): MealLog[] {
  return get<MealLog[]>(SK.logsMonth(ym), []);
}

export const logsOfDay = (date: string): MealLog[] =>
  logsOfMonth(ymOf(date)).filter((l) => l.date === date);

export function logAdd(log: MealLog): void {
  const list = logsOfMonth(ymOf(log.date));
  list.push(log);
  set(SK.logsMonth(ymOf(log.date)), list);
}

export function logUpdate(log: MealLog): void {
  const list = logsOfMonth(ymOf(log.date));
  const i = list.findIndex((l) => l.id === log.id);
  if (i >= 0) {
    list[i] = log;
    set(SK.logsMonth(ymOf(log.date)), list);
  }
}

export function logRemove(date: string, id: string): void {
  const ym = ymOf(date);
  set(
    SK.logsMonth(ym),
    logsOfMonth(ym).filter((l) => l.id !== id),
  );
}

// ---------- 体重 ----------
export const weightsAll = (): WeightLog[] =>
  get<WeightLog[]>(SK.weights, []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));

export function weightUpsert(entry: WeightLog): void {
  const list = weightsAll().filter((w) => w.date !== entry.date);
  list.push(entry);
  set(SK.weights, list);
}

// ---------- 喝水 ----------
export const waterOf = (date: string): number => get<number>(SK.water(date), 0);

export function waterAdd(date: string, ml: number): number {
  const next = Math.max(0, waterOf(date) + ml);
  set(SK.water(date), next);
  return next;
}

/** 减掉指定 ml（不能减成负数） */
export function waterSub(date: string, ml: number): number {
  const next = Math.max(0, waterOf(date) - ml);
  set(SK.water(date), next);
  return next;
}

/** 直接设置为指定 ml（供手动输入用） */
export function waterSet(date: string, ml: number): number {
  const next = Math.max(0, Math.round(ml));
  set(SK.water(date), next);
  return next;
}

/** 清零今日喝水 */
export function waterReset(date: string): void {
  try {
    wx.removeStorageSync(SK.water(date));
  } catch {
    /* ignore */
  }
}

// ---------- 训练打卡与记录 ----------

/** 今日是否完成训练 */
export const trainingDoneGet = (date: string): TrainingDay | null =>
  get<TrainingDay | null>(SK.trainingDone(date), null);

export function trainingDoneSet(date: string, done: boolean, note?: string): void {
  if (!done) {
    try { wx.removeStorageSync(SK.trainingDone(date)); } catch { /* ignore */ }
    return;
  }
  set(SK.trainingDone(date), { date, done: true, note });
}

/** 取某月训练记录列表 */
export function trainingLogMonth(ym: string): TrainingLog[] {
  return get<TrainingLog[]>(SK.trainingLogMonth(ym), []);
}

/** 取某日训练记录 */
export function trainingLogDay(date: string): TrainingLog[] {
  return trainingLogMonth(ymOf(date)).filter((l) => l.date === date);
}

/** 加一条训练记录 */
export function trainingLogAdd(log: TrainingLog): void {
  const ym = ymOf(log.date);
  const list = trainingLogMonth(ym);
  list.push(log);
  set(SK.trainingLogMonth(ym), list);
}

/** 删一条训练记录 */
export function trainingLogRemove(date: string, logId: string): void {
  const ym = ymOf(date);
  const list = trainingLogMonth(ym).filter((l) => l.id !== logId);
  set(SK.trainingLogMonth(ym), list);
}

// ---------- 个人目标 ----------
export const DEFAULT_PROFILE: UserProfile = {
  calorieTarget: 1800,
  proteinTarget: 90,
  carbsTarget: 225,
  fatTarget: 60,
  fiberTarget: 25,
  waterTargetMl: 1500,
  giRemindOn: true,
};

export const profileGet = (): UserProfile =>
  ({ ...DEFAULT_PROFILE, ...get<Partial<UserProfile>>(SK.profile, {}) });

export const profileSet = (p: UserProfile): void => set(SK.profile, p);

// ---------- 身体档案（原始输入，用于目标计算） ----------
export const bodyGet = (): BodyProfile | null =>
  get<BodyProfile | null>(SK.body, null);

export const bodySet = (b: BodyProfile): void => set(SK.body, b);

// ---------- AI 识别配置（BYOK） ----------
export const visionCfgGet = (): VisionConfig | null =>
  get<VisionConfig | null>(SK.visionCfg, null);

export const visionCfgSet = (c: VisionConfig): void => set(SK.visionCfg, c);

/** ★ key 单独存取；任何日志/上报路径禁止调用此 getter 后输出 */
export const visionKeyGet = (): string => get<string>(SK.visionKey, '');
export const visionKeySet = (k: string): void => set(SK.visionKey, k);

let seq = 0;
export function genId(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

/** T19: 取用户当前体重（优先 bodyGet，否则 weightsAll 最后一条） */
export function currentWeightKg(): number {
  const b = bodyGet();
  if (b?.weightKg) return b.weightKg;
  const ws = weightsAll();
  if (ws.length) return ws[ws.length - 1].weightKg;
  return 0;
}
