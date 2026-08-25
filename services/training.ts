/**
 * 训练业务聚合 · 调用 storage + exercises 库
 */
import { EXERCISES_V0 } from '../data/exercises-v0';
import {
  trainingDoneGet,
  trainingDoneSet,
  trainingLogAdd,
  trainingLogDay,
  trainingLogMonth,
  trainingLogRemove,
} from './storage';
import { Exercise, TrainingLog } from './types';

export { EXERCISES_V0 };
export type { Exercise, TrainingLog };

/** 所有动作（v0 = 50 个内置；v1+ 可扩展 user 自定义） */
export function exercisesAll(): Exercise[] {
  return EXERCISES_V0;
}

/** 按 id 查动作 */
export function exerciseById(id: string): Exercise | null {
  return EXERCISES_V0.find((e) => e.id === id) || null;
}

/** 今日训练打卡状态 */
export const isTrainedToday = (date: string): boolean => trainingDoneGet(date)?.done === true;

/** 设置/取消打卡（幂等） */
export function setTrainingDone(date: string, done: boolean): void {
  trainingDoneSet(date, done);
}

/** 加一条训练记录 */
export function addTrainingLog(log: TrainingLog): void {
  trainingLogAdd(log);
}

/** 删一条训练记录 */
export function removeTrainingLog(date: string, logId: string): void {
  trainingLogRemove(date, logId);
}

/** 取本月所有训练记录（已展开为平铺，含日期） */
export function monthTrainingLogs(ym: string): TrainingLog[] {
  return trainingLogMonth(ym);
}

/** 取本日所有训练记录 */
export function dayTrainingLogs(date: string): TrainingLog[] {
  return trainingLogDay(date);
}

/** 取本月所有训练过的日期集合（用于月历绿点渲染） */
export function monthTrainedDays(ym: string): Set<string> {
  const logs = trainingLogMonth(ym);
  return new Set(logs.map((l) => l.date));
}

/** 历史某动作最大重量（PR） */
export function exercisePR(exerciseId: string): number {
  let max = 0;
  // 扫近 6 个月
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    for (const log of trainingLogMonth(ym)) {
      if (log.exerciseId !== exerciseId) continue;
      for (const s of log.sets) {
        if (s.weightKg > max) max = s.weightKg;
      }
    }
  }
  return max;
}

/** 历史某动作重量曲线（按时间升序） */
export function exerciseHistory(exerciseId: string): { date: string; topWeight: number }[] {
  const out: { date: string; topWeight: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let top = 0;
    let any = false;
    const seenDates = new Set<string>();
    for (const log of trainingLogMonth(ym)) {
      if (log.exerciseId !== exerciseId) continue;
      seenDates.add(log.date);
      for (const s of log.sets) {
        if (s.weightKg > top) top = s.weightKg;
        any = true;
      }
    }
    // 只输出实际训练过的日期
    for (const date of seenDates) {
      let topOnDate = 0;
      for (const log of trainingLogMonth(ym)) {
        if (log.exerciseId !== exerciseId || log.date !== date) continue;
        for (const s of log.sets) if (s.weightKg > topOnDate) topOnDate = s.weightKg;
      }
      out.push({ date, topWeight: topOnDate });
    }
    void any;
  }
  return out;
}
/* ---------- T19 训练消耗估算 ---------- */

/** 单条训练日志的卡路里消耗估算
 * 有氧：kcal = MET × 体重kg × 时间h
 * 力量：kcal = MET × 体重kg × 总组数 × 0.025h/组（每组平均 90s 含休息，90s = 0.025h）
 *
 * 实测参考：70kg 卧推 4 组 ≈ 35 kcal；70kg 跑步 30min ≈ 290 kcal
 */
export function kcalForLog(
  log: TrainingLog,
  ex: Exercise | null,
  bodyWeightKg: number,
): number {
  const met = ex?.met ?? 4.0;
  if (!bodyWeightKg || bodyWeightKg <= 0) return 0;
  if (ex?.bodyPart === 'cardio') {
    // 有氧：reps 字段当分钟用
    const totalMin = log.sets.reduce((s, x) => s + (x.reps || 0), 0);
    const hours = totalMin / 60;
    return Math.round(met * bodyWeightKg * hours);
  }
  // 力量：每组 ≈ 0.025h（90s 含组间休息）
  const hours = log.sets.length * 0.025;
  return Math.round(met * bodyWeightKg * hours);
}

/** 多条日志总消耗（同一天） */
export function kcalForDay(logs: TrainingLog[], bodyWeightKg: number): number {
  const exMap = new Map(EXERCISES_V0.map((e) => [e.id, e]));
  let total = 0;
  for (const log of logs) {
    total += kcalForLog(log, exMap.get(log.exerciseId) || null, bodyWeightKg);
  }
  return total;
}
