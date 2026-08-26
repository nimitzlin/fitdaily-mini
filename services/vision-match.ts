/**
 * vision-match.ts · T21
 *
 * OCR 识别结果 vs 食物数据库 智能匹配
 *
 * 解决问题:
 *  - OCR 识别出"鸡胸肉"用 LLM 估的营养 (133 kcal)，但 cfc 有"鸡胸脯肉"更精确数据 (118 kcal)
 *  - 用户每次都要手工改，太麻烦
 *
 * 策略:
 *  - 拿 OCR 识别的 name，去 ALL_FOODS (1751 条) 里 fuzzy match 找 top-3 候选
 *  - 候选按 "名称相似度" + "kcal 接近度" 综合排序
 *  - food-edit 页底部展示候选卡，用户一键采纳精确值
 */

import { ALL_FOODS } from '../data/foods';
import { Food } from './types';
import { smartSearch } from './food-search';
import { RecogItem } from './types-vision';

export interface MatchCandidate {
  food: Food;
  /** 名称相似度 0-1，越高越像 */
  nameScore: number;
  /** 营养相似度 0-1，越高 kcal/protein/fat/carbs 越接近 */
  nutritionScore: number;
  /** 综合得分 0-1 */
  totalScore: number;
}

/** 简单字符串相似度：编辑距离 / max(len) (Levenshtein 简化版) */
function strSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[\s（）()\[\]【】·,，.。]/g, '');
  const s2 = b.toLowerCase().replace(/[\s（）()\[\]【】·,，.。]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // 编辑距离
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

/** 营养相似度：kcal 差 < 20% 算高相似 */
function nutritionSimilarity(recog: RecogItem, food: Food): number {
  const recogKcal = recog.calories || 0;
  const dbKcal = food.per100.calories || 0;
  if (recogKcal === 0 && dbKcal === 0) return 0.5; // 都没数据，平手
  if (recogKcal === 0 || dbKcal === 0) return 0;

  const ratio = Math.min(recogKcal, dbKcal) / Math.max(recogKcal, dbKcal);
  // ratio 0-1，越接近 1 越相似
  // ratio < 0.5 视作不像 (kcal 差超过 100%)
  if (ratio < 0.5) return 0;
  return ratio;
}

/**
 * 对单条 OCR 识别结果找出 top-3 数据库候选
 */
export function matchCandidates(recog: RecogItem, limit: number = 3): MatchCandidate[] {
  // 1. 先用 smartSearch 缩小范围（用 OCR name 当关键词）
  const { items } = smartSearch(recog.name, '全部');
  // 2. 再用 ALL_FOODS 全量兜底（OCR name 可能 cfc 完全不含，smartSearch 0 命中）
  const pool = items.length > 0 ? items : ALL_FOODS.slice(0, 200); // 兜底前 200 条

  const candidates: MatchCandidate[] = pool.map((food) => {
    const nameScore = strSimilarity(recog.name, food.name);
    const nutritionScore = nutritionSimilarity(recog, food);
    // 综合得分：名称相似度占 70%，营养相似度占 30%
    const totalScore = nameScore * 0.7 + nutritionScore * 0.3;
    return { food, nameScore, nutritionScore, totalScore };
  });

  // 过滤太低的（名称相似度 < 0.3 视为不相关）
  const filtered = candidates.filter((c) => c.nameScore >= 0.3);

  filtered.sort((a, b) => {
    // 主排序: totalScore
    if (Math.abs(b.totalScore - a.totalScore) > 0.05) return b.totalScore - a.totalScore;
    // 并列时: cfc 优先（数据更权威）
    if (a.food.source !== b.food.source) {
      if (a.food.source === 'cfc') return -1;
      if (b.food.source === 'cfc') return 1;
    }
    return 0;
  });
  return filtered.slice(0, limit);
}

/** 批量匹配多条 OCR 识别结果 */
export function matchAllCandidates(recogItems: RecogItem[]): Array<{
  recog: RecogItem;
  candidates: MatchCandidate[];
}> {
  return recogItems.map((recog) => ({
    recog,
    candidates: matchCandidates(recog, 3),
  }));
}
