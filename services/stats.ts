/**
 * 历史统计计算 · 本周（周一-周日）汇总
 * 依赖：services/storage (日志/水) + services/nutrition (dailyStats)
 */
import { dailyStats, DailyStats } from './nutrition';
import {
  currentWeightKg,
  logsOfDay,
  logsOfMonth,
  waterOf,
} from './storage';
import { MealLog } from './types';
import {
  dayTrainingLogs,
  isTrainedToday,
  kcalForDay,
} from './training';
import { EXERCISES_V0 } from '../data/exercises-v0';

/** 本周每日摘要 */
export interface DaySummary {
  date: string; // 'YYYY-MM-DD'
  weekday: number; // 1=周一 ... 7=周日
  weekdayLabel: string; // '周一' ...
  stats: DailyStats | null;
  waterMl: number;
  hasLog: boolean; // 当日是否有任何饮食
}

/** 本周营养素均值 */
export interface WeekAverages {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  activeDays: number; // 有记录的天数
}

/** 获取本周一日期（YYYY-MM-DD） */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0=周日 ... 6=周六
  const offset = dow === 0 ? -6 : 1 - dow; // 周日映射到6天前
  x.setDate(x.getDate() + offset);
  return ymd(x);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(yyyy_mm_dd: string, n: number): string {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return ymd(dt);
}

const WK_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 本周每日摘要（按周一-周日顺序） */
export function weekDailySummaries(startDate: string = mondayOf()): DaySummary[] {
  const out: DaySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    const logs = logsOfDay(date);
    const stats = logs.length ? dailyStats(logs) : null;
    out.push({
      date,
      weekday: i + 1,
      weekdayLabel: WK_LABELS[i + 1],
      stats,
      waterMl: waterOf(date),
      hasLog: logs.length > 0,
    });
  }
  return out;
}

/** 本周营养素日均（基于本周所有日志） */
export function weekAverages(summaries: DaySummary[]): WeekAverages {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, waterMl: 0 };
  let activeDays = 0;
  for (const s of summaries) {
    if (!s.stats) continue;
    activeDays++;
    totals.calories += s.stats.calories;
    totals.protein += s.stats.protein;
    totals.carbs += s.stats.carbs;
    totals.fat += s.stats.fat;
    totals.fiber += s.stats.fiber ?? 0;
    totals.waterMl += s.waterMl;
  }
  const days = activeDays || 1; // 防止除零
  return {
    calories: Math.round(totals.calories / days),
    protein: Math.round(totals.protein / days),
    carbs: Math.round(totals.carbs / days),
    fat: Math.round(totals.fat / days),
    fiber: Math.round(totals.fiber / days),
    waterMl: Math.round(totals.waterMl / days),
    activeDays,
  };
}

/** 高 GI 食物（GI >= 70）汇总，本周所有 */
export function highGiFoodsThisWeek(summaries: DaySummary[]): { name: string; gi: number }[] {
  const seen = new Set<string>();
  const out: { name: string; gi: number }[] = [];
  for (const s of summaries) {
    if (!s.stats) continue;
    for (const log of logsOfDay(s.date)) {
      if (log.gi != null && log.gi >= 70) {
        if (!seen.has(log.nameSnapshot)) {
          seen.add(log.nameSnapshot);
          out.push({ name: log.nameSnapshot, gi: log.gi });
        }
      }
    }
  }
  return out;
}

/** 本周 GI 加权均值（基于可消化碳水加权） */
export function weekAvgGi(summaries: DaySummary[]): number | null {
  let sumGiCarbs = 0;
  let sumCarbs = 0;
  for (const s of summaries) {
    if (!s.stats) continue;
    if (s.stats.avgGi != null) {
      // 当日可消化碳水 = s.stats.carbs - (s.stats.fiber ?? 0)
      const dCarbs = Math.max(0, s.stats.carbs - (s.stats.fiber ?? 0));
      sumGiCarbs += s.stats.avgGi * dCarbs;
      sumCarbs += dCarbs;
    }
  }
  if (sumCarbs <= 0) return null;
  return Math.round(sumGiCarbs / sumCarbs);
}
/* ---------- T19.2 本周训练统计（缺口 A） ---------- */

export interface WeekTrainingSummary {
  /** 本周训练过的日期数（有训练日志或打卡的天数） */
  trainedDays: number;
  /** 本周总消耗 kcal（MET 估算） */
  totalBurn: number;
  /** 每天 { date, burn }（0 表示当天没练） */
  daily: Array<{ date: string; burn: number; weekdayLabel: string }>;
}

/** 本周训练摘要：N 次 + 总消耗 + 每日分布（供 stats 页柱状图） */
export function weekTrainingSummary(startDate: string = mondayOf()): WeekTrainingSummary {
  const exMap = new Map(EXERCISES_V0.map((e) => [e.id, e]));
  const daily: WeekTrainingSummary['daily'] = [];
  let totalBurn = 0;
  let trainedDays = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(startDate, i);
    const logs = dayTrainingLogs(date);
    // 打卡但没记日志也算「练过」（打卡天数口径）
    const marked = isTrainedToday(date);
    const burn = kcalForDay(logs, currentWeightKg());
    if (logs.length > 0 || marked) trainedDays += 1;
    totalBurn += burn;
    daily.push({ date, burn, weekdayLabel: WK_LABELS[i + 1] });
  }
  return { trainedDays, totalBurn, daily };
}
