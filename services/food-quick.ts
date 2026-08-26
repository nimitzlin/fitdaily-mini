/**
 * food-quick.ts · T21
 *
 * food-search 空搜索时显示的"常用 10 大快捷入口"
 *
 * 解决:
 *  - 用户打开 food-search 看到 1751 条无从下手
 *  - 给他们一组高频食物一键选择
 *
 * 来源:
 *  - 中式三餐最常见（米/面/蛋/鸡/牛/鱼/豆/菜/果/茶）
 *  - builtin 100 条优先（已包含这些）
 *  - recentFoods 补足（用户最近用过的）
 */

import { Food } from './types';
import { BUILTIN_FOODS } from '../data/foods';
import { recentFoodsGet } from './storage';

/** 中式三餐最常见的 10 个食物名（用名字匹配避免 id 变动） */
const QUICK_NAMES = [
  '米饭',        // fb001
  '面条',        // fb004
  '鸡胸肉',      // fb023
  '鸡蛋',        // fb031
  '豆腐',        // fb046
  '纯牛奶',      // fb051
  '番茄',        // fb049
  '苹果',        // fb059
  '黄瓜',        // fb050
  '菠菜',        // fb048
];

/**
 * 获取空搜索时显示的快捷食物列表（最多 10 条）
 *  1. 先放 QUICK_NAMES 命中的 builtin (10 条常吃)
 *  2. 再补 recentFoods 中不在 quick 里的（最多 5 条）
 *  3. 去重，按最近使用排序
 */
export function quickFoods(): Food[] {
  const result: Food[] = [];
  const seen = new Set<string>();

  // 1. builtin 高频（名字包含匹配，例如"米饭" 命中"米饭（蒸）"）
  for (const name of QUICK_NAMES) {
    const f = BUILTIN_FOODS.find((x) => x.name.includes(name));
    if (f && !seen.has(f.id)) {
      result.push(f);
      seen.add(f.id);
    }
    if (result.length >= 10) break;
  }

  // 2. recent 补足（用户在用的）
  const recentIds = recentFoodsGet();
  for (const id of recentIds) {
    if (result.length >= 10) break;
    const f = BUILTIN_FOODS.find((x) => x.id === id);
    if (f && !seen.has(f.id)) {
      result.push(f);
      seen.add(f.id);
    }
  }

  return result;
}
