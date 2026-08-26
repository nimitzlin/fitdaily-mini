#!/usr/bin/env python3
"""
import_cfc_foods.py
将 Sanotsu/china-food-composition-data（1677 条）合并到 fitdaily foods 库。

数据源: /tmp/cfc_work/china-food-composition-data/json_data_v3_20260825_qwen38max_kimi_k3_fixed/
来源:《中国食物成分表标准版(第 6 版)》PDF 截图 → qwen3.8-max + kimi-k3 双模型识别 + 人工复核
字段: 35 个 (kcal/protein/fat/CHO/fiber + 13 种维生素 + 11 种微量元素)
备注: value="—" 或 "Tr" 或空串 表示缺失

策略:
  1. 把 1677 条全部 import 到 data/foods-cfc.ts
  2. 保留现有 builtin 100 条 (保持稳定性,老用户数据不丢)
  3. foods-cfc.ts + builtin 合并导出 allFoods() 供上层使用
  4. 写入 fitdaily Food 类型: id=name 的拼音/数字 hash (稳定)
  5. category 映射: cfc 类别 → fitdaily 7 大类 (主食/肉蛋/蔬果/奶豆/零食/饮品/其他)
  6. fiber 处理: cfc 是 dietaryFiber (g/100g 可食部分)
  7. gi 处理: cfc 没 GI 数据,用独立 glycemic_index_of_foods.json (11 类 100+ 条)
"""

import json
import glob
import os
import re
from pathlib import Path
from collections import defaultdict

# -------- 配置 --------
CFC_FIXED_DIR = "/tmp/cfc_work/china-food-composition-data/json_data_v3_20260825_qwen38max_kimi_k3_fixed"
GI_FILE = "/tmp/cfc_work/china-food-composition-data/json_gi_of_foods/glycemic_index_of_foods.json"
OUT_FILE = "/Users/jhlin/.openclaw/workspace/projects/fitdaily-mini/data/foods-cfc.ts"

# cfc 61 个细分类别 → fitdaily 7 大类
CATEGORY_MAP = {
    # 主食
    "谷类及其制品-稻米": "主食",
    "谷类及其制品-小麦": "主食",
    "谷类及其制品-玉米": "主食",
    "谷类及其制品-小米黄米": "主食",
    "谷类及其制品-大麦": "主食",
    "谷类及其制品-其他": "主食",
    "薯类淀粉及其制品-薯类": "主食",
    "薯类淀粉及其制品-淀粉类": "主食",
    # 肉蛋
    "畜肉类及其制品-猪": "肉蛋",
    "畜肉类及其制品-牛": "肉蛋",
    "畜肉类及其制品-羊": "肉蛋",
    "畜肉类及其制品-马": "肉蛋",
    "畜肉类及其制品-驴": "肉蛋",
    "畜肉类及其制品-其他": "肉蛋",
    "禽肉类及其制品-鸡": "肉蛋",
    "禽肉类及其制品-鸭": "肉蛋",
    "禽肉类及其制品-鹅": "肉蛋",
    "禽肉类及其制品-火鸡": "肉蛋",
    "禽肉类及其制品-其他": "肉蛋",
    "蛋类及其制品-鸡蛋": "肉蛋",
    "蛋类及其制品-鸭蛋": "肉蛋",
    "蛋类及其制品-鹅蛋": "肉蛋",
    "蛋类及其制品-鹌鹑蛋": "肉蛋",
    "鱼虾蟹贝类-鱼": "肉蛋",
    "鱼虾蟹贝类-虾": "肉蛋",
    "鱼虾蟹贝类-蟹": "肉蛋",
    "鱼虾蟹贝类-贝": "肉蛋",
    "鱼虾蟹贝类-其他": "肉蛋",
    # 蔬果
    "蔬菜类及其制品-嫩茎叶花菜类": "蔬果",
    "蔬菜类及其制品-根菜类": "蔬果",
    "蔬菜类及其制品-水生蔬菜类": "蔬果",
    "蔬菜类及其制品-茄果瓜菜类": "蔬果",
    "蔬菜类及其制品-葱蒜类": "蔬果",
    "蔬菜类及其制品-薯芋类": "蔬果",
    "蔬菜类及其制品-野生蔬菜类": "蔬果",
    "蔬菜类及其制品-鲜豆类": "蔬果",
    "菌藻类-菌类": "蔬果",
    "菌藻类-藻类": "蔬果",
    "水果类及其制品-仁果类": "蔬果",
    "水果类及其制品-柑橘类": "蔬果",
    "水果类及其制品-核果类": "蔬果",
    "水果类及其制品-浆果类": "蔬果",
    "水果类及其制品-热带亚热带水果": "蔬果",
    "水果类及其制品-瓜果类": "蔬果",
    # 奶豆
    "乳类及其制品-液态乳": "奶豆",
    "乳类及其制品-酸奶": "奶豆",
    "乳类及其制品-奶粉": "奶豆",
    "乳类及其制品-奶酪": "奶豆",
    "乳类及其制品-奶油": "奶豆",
    "乳类及其制品-其他": "奶豆",
    "干豆类及其制品-大豆": "奶豆",
    "干豆类及其制品-绿豆": "奶豆",
    "干豆类及其制品-赤豆": "奶豆",
    "干豆类及其制品-芸豆": "奶豆",
    "干豆类及其制品-蚕豆": "奶豆",
    "干豆类及其制品-其他": "奶豆",
    # 零食（坚果种子）
    "坚果种子类-树坚果": "零食",
    "坚果种子类-种子": "零食",
    # 其他（含油脂、糖、调味）
    "植物油-植物油": "其他",
    "动物油脂类-动物油脂": "其他",
    "其他类-其他": "其他",
}

# cfc 61 个细分类别中"奶类及其制品-奶油"全部是高脂肪乳脂（黄油/酥油/奶油/酥油茶），
# 热量 400-900 kcal/100g，本质是油脂而非奶制品。归到"其他"更准确。
CATEGORY_OVERRIDES = {
    "乳类及其制品-奶油": "其他",
}

# -------- 工具函数 --------

def parse_num(s, default=0):
    """cfc value 是字符串; '—'/'Tr'/'' 视为 0 或 None"""
    if s is None or s == "" or s == "—" or s == "Tr" or s == "...":
        return None if default is None else 0
    try:
        return float(s)
    except (ValueError, TypeError):
        return None if default is None else 0


def stable_id(name, idx):
    """生成稳定的 id: fc + 6 位序号。保持 builtin 的 fb 前缀不同避免冲突"""
    return f"fc{idx:04d}"


def parse_cfc_category(filename):
    """'merged_谷类及其制品-稻米.json' → '谷类及其制品-稻米'"""
    return filename.replace("merged_", "").replace(".json", "")


def load_gi_map():
    """载入 GI 数据 → {食物名: gi}"""
    gi_data = json.load(open(GI_FILE))
    gi_map = {}
    for group in gi_data:
        for item in group.get("list", []):
            name = item.get("foodName", "").strip()
            gi = item.get("GI")
            if name and gi:
                gi_map[name] = gi
                # 也存关键词版本（去括号内容）
                short = re.sub(r"（.*?）", "", name).strip()
                if short and short not in gi_map:
                    gi_map[short] = gi
    return gi_map


def match_gi(name, gi_map):
    """3 步匹配: 直接 → 去括号 → 双向包含(主词长度够才匹配，避免“脂匹配脂肪”)"""
    if name in gi_map:
        return gi_map[name]
    short = re.sub(r"（.*?）", "", name).strip()
    if short in gi_map:
        return gi_map[short]
    # 第3步: 双向包含，但要求 gi_name / short 长度差不超过 2 个字，避免误匹配
    for gi_name, gi in gi_map.items():
        if not (2 <= len(gi_name) <= 4):
            continue
        if gi_name in short and abs(len(short) - len(gi_name)) <= 2:
            return gi
        if short in gi_name and abs(len(short) - len(gi_name)) <= 2:
            return gi
    return None


def make_food_item(item, category, idx, gi_map):
    """cfc item → fitdaily Food"""
    name = item.get("foodName", "").strip()
    if not name:
        return None
    # 去掉"代表值"标签（更友好）
    name = name.replace("（代表值）", "").replace("（代表值，全脂）", "").strip()
    name = name.replace("（代表值, fat30g）", "").strip()

    kcal = parse_num(item.get("energyKCal"))
    if kcal is None or kcal == 0:
        # 跳过没有 kcal 的（如"婴幼儿食品"被 ignore）
        return None

    protein = parse_num(item.get("protein"))
    fat = parse_num(item.get("fat"))
    cho = parse_num(item.get("CHO"))
    fiber = parse_num(item.get("dietaryFiber"))
    gi = match_gi(name, gi_map)

    return {
        "id": stable_id(name, idx),
        "name": name,
        "source": "cfc",
        "category": category,
        "unit": "g",
        "per100": {
            "calories": round(kcal, 1),
            "protein": round(protein or 0, 1),
            "carbs": round(cho or 0, 1),
            "fat": round(fat or 0, 1),
            "fiber": round(fiber, 1) if fiber is not None else None,
        },
        "gi": gi,
        "_cfcCode": item.get("foodCode", ""),
    }


# -------- 主流程 --------

def main():
    if not os.path.isdir(CFC_FIXED_DIR):
        print(f"❌ 找不到 {CFC_FIXED_DIR}")
        print("请先 git clone https://github.com/Sanotsu/china-food-composition-data.git")
        return

    gi_map = load_gi_map()
    print(f"📦 GI 数据: {len(gi_map)} 条")

    files = sorted(glob.glob(f"{CFC_FIXED_DIR}/merged_*.json"))
    print(f"📂 cfc 文件: {len(files)} 个")

    all_foods = []
    skipped = []
    by_category = defaultdict(int)
    gi_matched = 0

    idx = 0
    for fp in files:
        cat_cfc = parse_cfc_category(os.path.basename(fp))
        cat_fitdaily = CATEGORY_OVERRIDES.get(cat_cfc) or CATEGORY_MAP.get(cat_cfc)
        if not cat_fitdaily:
            print(f"⚠️  未映射: {cat_cfc}")
            continue

        items = json.load(open(fp))
        for it in items:
            idx += 1
            f = make_food_item(it, cat_fitdaily, idx, gi_map)
            if f is None:
                skipped.append((cat_cfc, it.get("foodName"), "no kcal"))
                continue
            all_foods.append(f)
            by_category[cat_fitdaily] += 1
            if f["gi"] is not None:
                gi_matched += 1

    # 输出 TypeScript 文件
    write_ts(all_foods, by_category, gi_matched, skipped)

    print(f"\n✅ 完成:")
    print(f"  - 总食物: {len(all_foods)} 条")
    print(f"  - 跳过: {len(skipped)} 条")
    print(f"  - GI 命中: {gi_matched} 条")
    print(f"  - 类别分布:")
    for cat, cnt in sorted(by_category.items(), key=lambda x: -x[1]):
        print(f"      {cat}: {cnt}")


def write_ts(foods, by_cat, gi_matched, skipped):
    """生成 TypeScript 文件"""

    lines = []
    lines.append("/**")
    lines.append(" * 自动生成 - 中国食物成分表第 6 版 · 1677 条食物数据")
    lines.append(" * 数据源: https://github.com/Sanotsu/china-food-composition-data")
    lines.append(" * 生成时间: " + __import__("datetime").datetime.now().isoformat(timespec="seconds"))
    lines.append(" * 字段: kcal / protein / fat / carbs / fiber / gi")
    lines.append(" * id 格式: fc0001-fc1677")
    lines.append(" * 警告: 数据为《中国食物成分表标准版(第 6 版)》原书数据，请勿手动编辑！")
    lines.append(" */")
    lines.append("import { Food } from '../services/types';")
    lines.append("")
    lines.append(f"export const FOODS_CFC: Food[] = [")

    for f in foods:
        # 用 ensure_ascii=False 让中文直接输出（不转 \uXXXX），TS 编译更清晰
        gi_str = "null" if f['gi'] is None else str(f['gi'])
        fiber_str = "null" if f['per100']['fiber'] is None else str(f['per100']['fiber'])
        lines.append(
            f"  {{ id: '{f['id']}', name: '{f['name']}', source: 'cfc', category: '{f['category']}', unit: 'g', "
            f"per100: {{ calories: {f['per100']['calories']}, protein: {f['per100']['protein']}, "
            f"carbs: {f['per100']['carbs']}, fat: {f['per100']['fat']}, fiber: {fiber_str} }}, "
            f"gi: {gi_str} }},  // cfc:{f['_cfcCode']}"
        )

    lines.append("];")
    lines.append("")
    lines.append(f"/** 统计: 总 {len(foods)} 条 / GI 命中 {gi_matched} 条 */")

    Path(OUT_FILE).parent.mkdir(parents=True, exist_ok=True)
    Path(OUT_FILE).write_text("\n".join(lines))
    print(f"\n📝 写入: {OUT_FILE}")
    print(f"   大小: {Path(OUT_FILE).stat().st_size} bytes")


if __name__ == "__main__":
    main()
