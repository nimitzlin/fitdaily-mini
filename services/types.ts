/** FitDaily 领域类型 · 与 PRD 第 5 章一致 */
export type FoodCategory =
  | '主食'
  | '肉蛋'
  | '蔬果'
  | '奶豆'
  | '零食'
  | '饮品'
  | '其他';

export type GiLevel = 'low' | 'mid' | 'high';

export interface Nutrition {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number | null; // g
}

export interface Food {
  id: string;
  name: string;
  source: 'builtin' | 'user';
  category: FoodCategory;
  unit: 'g' | 'ml';
  per100: Nutrition; // ★ 统一每100g口径
  gi: number | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
};

export interface MealLog {
  id: string;
  date: string; // '2026-08-24'
  meal: MealType;
  foodId?: string;
  nameSnapshot: string; // 快照防历史失真
  weight: number;
  intake: Nutrition; // 换算后的实际摄入
  gi: number | null;
  source: 'photo' | 'search' | 'custom';
  createdAt: number;
}

export interface WeightLog {
  date: string;
  weightKg: number;
}

export interface UserProfile {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  waterTargetMl: number;
  giRemindOn: boolean;
}

/** 身体档案原始输入 · 用于 Mifflin-St Jeor 计算 */
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type Goal = 'cut' | 'maintain' | 'bulk';

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: '久坐（几乎不运动）',
  light: '轻度（每周运动 1-3 次）',
  moderate: '中度（每周运动 3-5 次）',
  active: '高度（每周运动 6-7 次）',
  veryActive: '极高（运动员/体力劳动）',
};

export const GOAL_LABEL: Record<Goal, string> = {
  cut: '减脂（TDEE - 500）',
  maintain: '维持（TDEE + 0）',
  bulk: '增肌（TDEE + 300）',
};

export interface BodyProfile {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

export interface VisionConfig {
  preset: 'minimax-intl' | 'minimax-cn' | 'deepseek';
  baseUrl: string;
  model: string;
  lastTestOk: boolean | null;
}

/* ---------- T17-T18 运动模块 ---------- */

export type BodyPart = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'fullbody';

export const BODY_PART_LABEL: Record<BodyPart, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  arms: '臂',
  core: '核心',
  cardio: '有氧',
  fullbody: '全身',
};

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  equipment: string;
  isCompound: boolean;
  /** T19: MET 代谢当量，用于估算卡路里消耗 */
  met: number;
}

export interface ExerciseSet {
  reps: number;
  weightKg: number;
  restSec: number;
}

export interface TrainingLog {
  id: string;
  date: string;
  exerciseId: string;
  sets: ExerciseSet[];
  note?: string;
  createdAt: number;
}

export interface TrainingDay {
  date: string;
  done: boolean;
  note?: string;
}
