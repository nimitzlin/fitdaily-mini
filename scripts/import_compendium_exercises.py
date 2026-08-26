#!/usr/bin/env python3
"""
import_compendium_exercises.py
从 Compendium of Physical Activities (2024) 提取精确 MET 健身动作数据，
与现有 EXERCISES_V0 (50 条) 合并，扩充到 exercises-v1.ts (~80-100 条)。

策略：
  1. 保留现有 EXERCISES_V0 (50 条, id 格式 ex_xxx)
  2. 从 Compendium 821 条中精选 40-50 条 "新增" 动作（细化强度/速度）
     - 跑步 4 mph / 5 mph / 6 mph / 7 mph / 8 mph (现仅 1 条 '跑步' met=8.3)
     - 跳绳 slow/moderate/fast (现仅 1 条 met=11.8)
     - 划船机 100w/150w/200w (现仅 1 条 met=7.0)
     - 骑车 10-12mph / 12-14mph / 14-16mph / 16-19mph
     - 椭圆机 moderate/vigorous
     - 战绳 / 楼梯机 / 划船机 / 跳箱
  3. id 格式: ex_comp_xxxx 避免与 builtin ex_xxx 冲突
  4. 动作部位映射: Compendium 类别 → fitdaily BodyPart
"""

import json
from pathlib import Path

SRC = "/tmp/compendium.json"
OUT = "/Users/jhlin/.openclaw/workspace/projects/fitdaily-mini/data/exercises-v1.ts"

# Compendium code → (中文名, fitdaily bodyPart, equipment, isCompound, met 覆盖)
# 精选: 用户常做 + 跟我们现有动作能互补 (不重复)
# met 覆盖时直接用 compendium 的精确值替换 builtin 的估值
OVERRIDE_MET = {
    # 力量训练细分
    "02050": ("重量训练（自由重量/器械，大重量）", "fullbody", "杠铃/哑铃/器械", True),  # 6.0
    "02052": ("深蹲（慢/爆发）", "legs", "杠铃", True),  # 5.0
    "02054": ("重量训练（多动作，8-15 次）", "fullbody", "哑铃/器械", True),  # 3.5
    "02020": ("徒手力量（俯卧撑/卷腹/引体，剧烈）", "fullbody", "徒手", True),  # 8.0
    "02022": ("徒手力量（俯卧撑/弓步，中等）", "fullbody", "徒手", True),  # 3.8
    "02024": ("徒手力量（卷腹/仰卧起坐，轻度）", "core", "徒手", False),  # 2.8
    # 跑步分速度（现仅 1 条 met=8.3）
    "12029": ("跑步 4 mph（13 min/mile）", "cardio", "户外/跑步机", False),  # 6.0
    "12030": ("跑步 5 mph（12 min/mile）", "cardio", "户外/跑步机", False),  # 8.3
    "12050": ("跑步 6 mph（10 min/mile）", "cardio", "户外/跑步机", False),  # 9.8
    "12070": ("跑步 7 mph（8.5 min/mile）", "cardio", "户外/跑步机", False),  # 11.0
    "12090": ("跑步 8 mph（7.5 min/mile）", "cardio", "户外/跑步机", False),  # 11.8
    # 跳绳分速度
    "15551": ("跳绳 中速（100-120 次/min）", "cardio", "跳绳", False),  # 11.8
    "15550": ("跳绳 快速（120-160 次/min）", "cardio", "跳绳", False),  # 12.3
    "15552": ("跳绳 慢速（<100 次/min）", "cardio", "跳绳", False),  # 8.8
    # 划船机分瓦数
    "02071": ("划船机（中等强度）", "cardio", "划船机", False),  # 4.8
    "02070": ("划船机（剧烈）", "cardio", "划船机", False),  # 6.0
    "02072": ("划船机 100W", "cardio", "划船机", False),  # 7.0
    "02073": ("划船机 150W", "cardio", "划船机", False),  # 8.5
    "02074": ("划船机 200W", "cardio", "划船机", False),  # 12.0
    # 骑车分速度
    "01015": ("骑车（一般速度）", "cardio", "自行车/动感单车", False),  # 7.5
    "01020": ("骑车 10-11.9 mph", "cardio", "自行车", False),  # 6.8
    "01030": ("骑车 12-13.9 mph（中等）", "cardio", "自行车", False),  # 8.0
    "01040": ("骑车 14-15.9 mph（快速）", "cardio", "自行车", False),  # 10.0
    "01050": ("骑车 16-19 mph（竞赛）", "cardio", "自行车", False),  # 12.0
    # 椭圆机
    "02048": ("椭圆机（中等）", "cardio", "椭圆机", False),  # 5.0
    # 楼梯机
    "02065": ("楼梯机", "cardio", "楼梯机", False),  # 9.0
    # 战绳
    "02055": ("HIIT 战绳", "fullbody", "战绳", True),  # 8.0
    # 步行分速度
    "17190": ("快走 2.8-3.2 mph", "cardio", "户外/跑步机", False),  # 3.5
    "17200": ("快走 3.5 mph（健身速度）", "cardio", "户外/跑步机", False),  # 4.3
    "17220": ("快走 4.0 mph", "cardio", "户外/跑步机", False),  # 5.0
    "17230": ("快走 4.5 mph（非常快）", "cardio", "户外/跑步机", False),  # 7.0
    # 游泳分泳姿
    "18240": ("游泳 自由泳（慢/中）", "cardio", "泳池", False),  # 5.8
    "18260": ("游泳 蛙泳（训练）", "cardio", "泳池", False),  # 10.3
    "18270": ("游泳 蝶泳", "cardio", "泳池", False),  # 13.8
    "18366": ("水上慢跑", "cardio", "泳池", False),  # 9.8
    # 瑜伽分类型
    "02150": ("瑜伽 哈他", "fullbody", "瑜伽垫", False),  # 2.5
    "02160": ("瑜伽 力量（Power Yoga）", "fullbody", "瑜伽垫", False),  # 4.0
    "02105": ("普拉提", "core", "瑜伽垫", False),  # 3.0
    # 俯卧撑/平板变种
    "02030": ("徒手训练（上下地面）", "fullbody", "徒手", False),  # 3.5
    # 武术
    "15430": ("武术（中速：柔道/空手道/泰拳）", "fullbody", "徒手", False),  # 10.3
    # 跳箱（用 calisthenics vigorous 代理）
    # 篮球
    "15040": ("篮球（比赛）", "fullbody", "篮球场", False),  # 8.0
    "15055": ("篮球（一般）", "fullbody", "篮球场", False),  # 6.5
    # 足球
    "15605": ("足球（比赛）", "fullbody", "足球场", False),  # 10.0
    # 网球
    "15690": ("网球 单打", "fullbody", "网球场", False),  # 8.0
    "15680": ("网球 双打", "fullbody", "网球场", False),  # 6.0
    # 羽毛球
    "15020": ("羽毛球（比赛）", "fullbody", "羽毛球场", False),  # 7.0
    # 乒乓球
    "15660": ("乒乓球", "fullbody", "乒乓球台", False),  # 4.0
    # 高尔夫（步行）
    "15265": ("高尔夫（步行，扛杆）", "fullbody", "高尔夫球场", False),  # 4.3
    # 爬山/徒步
    "17080": ("徒步（越野）", "cardio", "户外", False),  # 6.0
    "17033": ("爬山（无负重）", "cardio", "户外", False),  # 6.3
}


def main():
    data = json.load(open(SRC))
    activities = {a["code"]: a for a in data["activities"]}

    lines = []
    lines.append("/**")
    lines.append(" * 动作库 v1 - Compendium of Physical Activities (2024 版) 精确 MET")
    lines.append(" * 数据源: https://github.com/tfardella/compendium_of_physical_activiy_mysql_format")
    lines.append(" * 生成时间: " + __import__("datetime").datetime.now().isoformat(timespec="seconds"))
    lines.append(" * v0: 50 条自估值 | v1: +精选 50 条 Compendium 精确 MET")
    lines.append(" * 注: 跟 EXERCISES_V0 共存，EXERCISES_V0 不删，exercises.ts 重导出合并版")
    lines.append(" */")
    lines.append("import { Exercise } from '../services/types';")
    lines.append("")
    lines.append("export const EXERCISES_V1: Exercise[] = [")

    count = 0
    for idx, (code, (name, part, equip, compound)) in enumerate(OVERRIDE_MET.items(), 1):
        a = activities.get(code)
        if not a:
            print(f"⚠️  找不到 code: {code}")
            continue
        lines.append(
            f"  {{ id: 'ex_comp_{idx:03d}', name: '{name}', bodyPart: '{part}', "
            f"equipment: '{equip}', isCompound: {str(compound).lower()}, met: {a['met']:.1f} }},  // compendium {code}: {a['description'][:60]}"
        )
        count += 1

    lines.append("];")
    lines.append("")
    lines.append(f"/** 统计: {count} 条精选 + Compendium 821 总数 */")

    Path(OUT).parent.mkdir(parents=True, exist_ok=True)
    Path(OUT).write_text("\n".join(lines))
    print(f"\n✅ 写入: {OUT}")
    print(f"   {count} 条精选动作")

    # 按部位统计
    by_part = {}
    for code, (name, part, equip, compound) in OVERRIDE_MET.items():
        a = activities.get(code)
        if a:
            by_part[part] = by_part.get(part, 0) + 1
    print(f"\n按部位分布:")
    for p, n in sorted(by_part.items(), key=lambda x: -x[1]):
        print(f"   {p}: {n}")


if __name__ == "__main__":
    main()
