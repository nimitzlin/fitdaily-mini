/**
 * 营养计算服务 · T3
 * 核心：per100 按份量换算 + 日均 GI 可消化碳水加权（PRD 决策 D2 医学 GL 口径）
 * 日均GI = Σ(GI_i × 可消化碳水_i) ÷ Σ可消化碳水_i，无 GI 数据的食物不参与加权但热量照计
 */
import { GiLevel, MealLog, Nutrition } from './types';

export function giLevel(gi: number | null): GiLevel | null {
  if (gi == null) return null;
  if (gi <= 55) return 'low';
  if (gi <= 69) return 'mid';
  return 'high';
}

export const GI_LABEL: Record<string, string> = {
  low: '低GI',
  mid: '中GI',
  high: '高GI',
  none: '暂无数据',
};

const r1 = (x: number) => Math.round(x * 10) / 10;

/** 每100g营养 × 实际克数 → 该份营养 */
export function scale(per100: Nutrition, weight: number): Nutrition {
  const k = weight / 100;
  return {
    calories: r1(per100.calories * k),
    protein: r1(per100.protein * k),
    carbs: r1(per100.carbs * k),
    fat: r1(per100.fat * k),
    fiber: per100.fiber == null ? null : r1(per100.fiber * k),
  };
}

/** 可消化碳水 = 总碳水 − 膳食纤维（下限0） */
export function digestCarbs(carbs: number, fiber: number | null): number {
  return Math.max(0, carbs - (fiber ?? 0));
}

export interface DailyStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** 碳水加权日均 GI；当日无任何带 GI 记录时为 null */
  avgGi: number | null;
  /** 当日高GI(GI≥70)食物清单，用于看板警示 */
  highGiFoods: Array<{ name: string; gi: number }>;
  hasAnyLog: boolean;
}

export function dailyStats(logs: MealLog[]): DailyStats {
  const s: DailyStats = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    avgGi: null,
    highGiFoods: [],
    hasAnyLog: logs.length > 0,
  };
  let giWeightedSum = 0;
  let carbSum = 0;

  for (const l of logs) {
    s.calories += l.intake.calories || 0;
    s.protein += l.intake.protein || 0;
    s.carbs += l.intake.carbs || 0;
    s.fat += l.intake.fat || 0;
    s.fiber += l.intake.fiber || 0;

    if (l.gi != null) {
      const dc = digestCarbs(l.intake.carbs, l.intake.fiber);
      if (dc > 0) {
        giWeightedSum += l.gi * dc;
        carbSum += dc;
      }
      if (l.gi >= 70) s.highGiFoods.push({ name: l.nameSnapshot, gi: l.gi });
    }
  }

  if (carbSum > 0) s.avgGi = Math.round(giWeightedSum / carbSum);

  s.calories = r1(s.calories);
  s.protein = r1(s.protein);
  s.carbs = r1(s.carbs);
  s.fat = r1(s.fat);
  s.fiber = r1(s.fiber);
  return s;
}

/** 三大营养素折算热量与填写热量的偏差比（校验用，PRD 表单规则） */
export function macroCalorieGap(n: Nutrition): number {
  const macro = (n.protein * 4 + n.carbs * 4 + n.fat * 9);
  if (n.calories <= 0) return macro > 0 ? 1 : 0;
  return Math.abs(macro - n.calories) / n.calories;
}
