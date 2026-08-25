/**
 * 每日目标计算 · Mifflin-St Jeor 公式
 * 输入：BodyProfile（性别/年龄/身高/体重/活动量/目标）
 * 输出：UserProfile 6 个目标字段（热量/蛋白/碳水/脂肪/纤维/水）
 *
 * 公式：
 *   BMR(男) = 10 × 体重kg + 6.25 × 身高cm - 5 × 年龄 + 5
 *   BMR(女) = 10 × 体重kg + 6.25 × 身高cm - 5 × 年龄 - 161
 *   TDEE = BMR × 活动系数（1.2/1.375/1.55/1.725/1.9）
 *   目标 = TDEE ± 调整（减脂-500/维持0/增肌+300）
 *   蛋白 = 体重kg × 系数（减脂1.8/维持1.4/增肌2.0）
 *   脂肪 = 目标kcal × 25% / 9
 *   碳水 = (目标kcal - 蛋白×4 - 脂肪×9) / 4
 *   纤维 = 25g（中国营养学会推荐）
 *   水 = 体重kg × 35ml
 */
import { ActivityLevel, BodyProfile, Goal, UserProfile } from './types';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const PROTEIN_PER_KG: Record<Goal, number> = {
  cut: 1.8, // 减脂：高蛋白保护肌肉
  maintain: 1.4, // 维持：标准量
  bulk: 2.0, // 增肌：更高
};

/** Mifflin-St Jeor BMR（kcal） */
function bmr(b: BodyProfile): number {
  const base = 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age;
  return b.sex === 'male' ? base + 5 : base - 161;
}

/** TDEE 调整（kcal） */
function goalDelta(g: Goal): number {
  switch (g) {
    case 'cut':
      return -500;
    case 'maintain':
      return 0;
    case 'bulk':
      return +300;
  }
}

/** 根据 BodyProfile 计算完整 UserProfile */
export function calcTargets(b: BodyProfile): UserProfile {
  const tdee = bmr(b) * ACTIVITY_FACTOR[b.activity];
  const calorieTarget = Math.round(tdee + goalDelta(b.goal));
  const proteinTarget = Math.round(b.weightKg * PROTEIN_PER_KG[b.goal]);
  const fatKcal = calorieTarget * 0.25;
  const fatTarget = Math.round(fatKcal / 9);
  const carbsKcal = calorieTarget - proteinTarget * 4 - fatTarget * 9;
  const carbsTarget = Math.max(0, Math.round(carbsKcal / 4));
  const fiberTarget = 25; // 中国营养学会
  const waterTargetMl = Math.round(b.weightKg * 35);

  return {
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
    fiberTarget,
    waterTargetMl,
    giRemindOn: true,
  };
}

/** 用于显示的计算明细 */
export function calcDetail(b: BodyProfile): {
  bmr: number;
  tdee: number;
  target: number;
} {
  const _bmr = bmr(b);
  const _tdee = _bmr * ACTIVITY_FACTOR[b.activity];
  return {
    bmr: Math.round(_bmr),
    tdee: Math.round(_tdee),
    target: Math.round(_tdee + goalDelta(b.goal)),
  };
}

/** T17 训练日 vs 休息日目标调整 */
export const TRAIN_DAY_KCAL = 300; // 训练日增加 300 kcal
export const TRAIN_DAY_PROTEIN = 20; // 训练日增加 20g 蛋白

/** 根据是否训练日返回调整后的 UserProfile */
export function adjustedTargets(base: UserProfile, trained: boolean): UserProfile {
  if (!trained) return base;
  return {
    ...base,
    calorieTarget: base.calorieTarget + TRAIN_DAY_KCAL,
    proteinTarget: base.proteinTarget + TRAIN_DAY_PROTEIN,
  };
}