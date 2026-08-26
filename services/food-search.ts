/**
 * food-search 智能搜索服务 · T20.2
 *
 * 解决问题：
 *  1. builtin 100 条数据在 cfc 1643 条中"被淹没" → 按用户最近使用 + cfc 权威性排序
 *  2. builtin "鸡胸肉" 和 cfc "鸡胸脯肉" 是同一物 → 同义词归一 + 去重
 *  3. 1751 条 ALL_FOODS 全部 search 太慢 → 在此做 alias + dedup 后再交给 page
 *
 * 核心思路：
 *  - 关键词预处理：把 builtin 的"鸡胸肉"扩展为 ["鸡胸肉","鸡胸脯肉"] 都去 cfc 搜
 *  - 同义词分组：builtin 和 cfc 命中同一概念 → 合并为一条（优先 cfc）
 *  - 排序权重：recent(50) > builtin 命中 > cfc 命中 > 字典序
 */

import { ALL_FOODS, BUILTIN_FOODS } from '../data/foods';
import { FOODS_CFC } from '../data/foods-cfc';
import { Food } from './types';
import { recentFoodsGet } from './storage';

/** T20.2 同义词表：
 *  key   = builtin/常用名（用户在 UI 看到的）
 *  value = cfc 中同概念的标准名数组（可能多个变种，如"糯米"和"糯米饭"）
 */
const SYNONYM_GROUPS: Array<{ builtin: string; cfcNames: string[] }> = [
  { builtin: '鸡胸肉', cfcNames: ['鸡胸脯肉', '鸡（肉鸡，肥）', '鸡（土鸡，家养）', '鸡（乌骨鸡）'] },
  { builtin: '鸡腿肉（去皮）', cfcNames: ['鸡腿（去皮）', '鸡腿'] },
  { builtin: '鸡腿', cfcNames: ['鸡腿（去皮）', '鸡腿'] },
  { builtin: '鸡蛋（全）', cfcNames: ['鸡蛋', '鸡蛋（白壳）', '鸡蛋（红壳）'] },
  { builtin: '鸡蛋白', cfcNames: ['鸡蛋白', '蛋清'] },
  { builtin: '猪里脊', cfcNames: ['猪肉（里脊）'] },
  { builtin: '猪瘦肉', cfcNames: ['猪肉（瘦）'] },
  { builtin: '牛里脊', cfcNames: ['牛肉（里脊）', '牛肉（瘦）'] },
  { builtin: '羊后腿肉', cfcNames: ['羊肉（后腿）'] },
  { builtin: '三文鱼', cfcNames: ['鲑鱼', '大马哈鱼'] },
  { builtin: '基围虾', cfcNames: ['对虾', '虾（对虾）'] },
  { builtin: '黄瓜', cfcNames: ['黄瓜（鲜）'] },
  { builtin: '西红柿', cfcNames: ['番茄', '番茄（鲜）'] },
  { builtin: '胡萝卜', cfcNames: ['胡萝卜（鲜）'] },
  { builtin: '面条（煮）', cfcNames: ['挂面', '面条', '通心面'] },
  { builtin: '白粥', cfcNames: ['大米粥', '粳米粥', '籼米粥'] },
  { builtin: '白面包', cfcNames: ['面包', '吐司面包'] },
  { builtin: '全麦面包', cfcNames: ['全麦面包'] },
  { builtin: '燕麦片', cfcNames: ['燕麦', '燕麦片'] },
  { builtin: '煮玉米', cfcNames: ['玉米（鲜）'] },
  { builtin: '红薯（煮）', cfcNames: ['甘薯（红心，蒸）', '甘薯（白心，蒸）', '甘薯'] },
  { builtin: '土豆（煮）', cfcNames: ['马铃薯（蒸）', '马铃薯'] },
  { builtin: '紫薯（煮）', cfcNames: ['紫薯（蒸）', '紫薯'] },
  { builtin: '糯米饭', cfcNames: ['糯米', '糯米（饭）', '糯米饭'] },
  { builtin: '小米粥', cfcNames: ['小米粥', '小米'] },
  { builtin: '黑巧克力（85%）', cfcNames: ['巧克力（黑）', '巧克力'] },
  { builtin: '混合坚果', cfcNames: ['坚果（混合）'] },
  { builtin: '可乐', cfcNames: ['可乐型汽水'] },
  { builtin: '拿铁咖啡（全脂）', cfcNames: ['咖啡（拿铁）'] },
  { builtin: '橙汁（100%）', cfcNames: ['橙汁'] },
  { builtin: '啤酒', cfcNames: ['啤酒（熟啤）', '啤酒（生啤）'] },
];

/** 反向索引：cfc 名称 → builtin id（用于去重合并时识别同概念） */
const CFC_TO_BUILTIN = new Map<string, string>();
for (const g of SYNONYM_GROUPS) {
  for (const cfcName of g.cfcNames) {
    CFC_TO_BUILTIN.set(cfcName, g.builtin);
  }
}

/** 把搜索关键词扩展为多组同义词 */
function expandKeywords(kw: string): string[] {
  const list = [kw];
  for (const g of SYNONYM_GROUPS) {
    if (g.builtin === kw) list.push(...g.cfcNames);
    else if (g.cfcNames.includes(kw)) list.push(g.builtin);
  }
  return Array.from(new Set(list));
}

/** 单个食物是否命中关键词（中文 substring） */
function matchKw(food: Food, kw: string): boolean {
  return food.name.toLowerCase().includes(kw.toLowerCase());
}

/**
 * 智能搜索：
 *  - kw 为空：返回全部 ALL_FOODS（按页面分页）
 *  - kw 非空：扩展同义词 → 匹配 → 按优先级 dedup → 排序
 *
 * 返回: { total: 总命中, items: 已去重+排序的 Food[] }
 */
export function smartSearch(
  kw: string,
  cat: string,
): { total: number; items: Food[] } {
  const trimmed = kw.trim();
  const pool = cat === '全部'
    ? ALL_FOODS
    : ALL_FOODS.filter((f) => f.category === cat);

  let matched: Food[];
  if (!trimmed) {
    matched = pool;
  } else {
    const kws = expandKeywords(trimmed);
    const seen = new Set<string>();
    matched = [];
    for (const f of pool) {
      if (kws.some((k) => matchKw(f, k)) && !seen.has(f.id)) {
        seen.add(f.id);
        matched.push(f);
      }
    }
  }

  // 排序：recent(50) > builtin 命中 > cfc 命中 > 字典序
  const recent = recentFoodsGet();
  const recentIdx = new Map(recent.map((id, i) => [id, i]));

  matched.sort((a, b) => {
    const ra = recentIdx.has(a.id) ? recentIdx.get(a.id)! : 999;
    const rb = recentIdx.has(b.id) ? recentIdx.get(b.id)! : 999;
    if (ra !== rb) return ra - rb;
    // recent 没命中：builtin 优先
    if (a.source !== b.source) {
      if (a.source === 'builtin') return -1;
      if (b.source === 'builtin') return 1;
    }
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  // 去重：同义词合并（cfc "鸡胸脯肉" 和 builtin "鸡胸肉" 是同一物，只保留 cfc 更权威）
  if (trimmed) {
    matched = dedupSynonyms(matched);
  }

  return { total: matched.length, items: matched };
}

/** 同义词去重：保留 cfc 版本（更权威） */
function dedupSynonyms(items: Food[]): Food[] {
  const seenBuiltin = new Set<string>();
  const result: Food[] = [];
  for (const f of items) {
    if (f.source === 'cfc') {
      const builtinName = CFC_TO_BUILTIN.get(f.name);
      if (builtinName) seenBuiltin.add(builtinName);
      result.push(f);
    } else if (f.source === 'builtin') {
      // 检查是否有 cfc 已覆盖此 builtin 名
      if (seenBuiltin.has(f.name)) continue;
      result.push(f);
    } else {
      result.push(f);
    }
  }
  return result;
}

/** 取最近用过的食物对象（Food[]），按时间倒序 */
export function recentFoodsAll(): Food[] {
  const ids = recentFoodsGet();
  const map = new Map(ALL_FOODS.map((f) => [f.id, f]));
  const result: Food[] = [];
  for (const id of ids) {
    const f = map.get(id) || BUILTIN_FOODS.find((x) => x.id === id);
    if (f) result.push(f);
  }
  return result;
}
