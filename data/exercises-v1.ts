/**
 * 动作库 v1 - Compendium of Physical Activities (2024 版) 精确 MET
 * 数据源: https://github.com/tfardella/compendium_of_physical_activiy_mysql_format
 * 生成时间: 2026-08-26T14:26:21
 * v0: 50 条自估值 | v1: +精选 50 条 Compendium 精确 MET
 * 注: 跟 EXERCISES_V0 共存，EXERCISES_V0 不删，exercises.ts 重导出合并版
 */
import { Exercise } from '../services/types';

export const EXERCISES_V1: Exercise[] = [
  { id: 'ex_comp_001', name: '重量训练（自由重量/器械，大重量）', bodyPart: 'fullbody', equipment: '杠铃/哑铃/器械', isCompound: true, met: 6.0 },  // compendium 02050: Resistance training (weight lifting, free weight, nautilus o
  { id: 'ex_comp_002', name: '深蹲（慢/爆发）', bodyPart: 'legs', equipment: '杠铃', isCompound: true, met: 5.0 },  // compendium 02052: Resistance (weight) training, squats , slow or explosive eff
  { id: 'ex_comp_003', name: '重量训练（多动作，8-15 次）', bodyPart: 'fullbody', equipment: '哑铃/器械', isCompound: true, met: 3.5 },  // compendium 02054: Resistance (weight) training, multiple exercises, 8-15 repet
  { id: 'ex_comp_004', name: '徒手力量（俯卧撑/卷腹/引体，剧烈）', bodyPart: 'fullbody', equipment: '徒手', isCompound: true, met: 8.0 },  // compendium 02020: Calisthenics (e.g., push ups, sit ups, pull-ups, jumping jac
  { id: 'ex_comp_005', name: '徒手力量（俯卧撑/弓步，中等）', bodyPart: 'fullbody', equipment: '徒手', isCompound: true, met: 3.8 },  // compendium 02022: Calisthenics (e.g., push ups, sit ups, pull-ups, lunges), mo
  { id: 'ex_comp_006', name: '徒手力量（卷腹/仰卧起坐，轻度）', bodyPart: 'core', equipment: '徒手', isCompound: false, met: 2.8 },  // compendium 02024: Calisthenics (e.g., situps, abdominal crunches), light effor
  { id: 'ex_comp_007', name: '跑步 4 mph（13 min/mile）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 6.0 },  // compendium 12029: Running, 4 mph (13 min/mile)
  { id: 'ex_comp_008', name: '跑步 5 mph（12 min/mile）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 8.3 },  // compendium 12030: Running, 5 mph (12 min/mile)
  { id: 'ex_comp_009', name: '跑步 6 mph（10 min/mile）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 9.8 },  // compendium 12050: Running, 6 mph (10 min/mile)
  { id: 'ex_comp_010', name: '跑步 7 mph（8.5 min/mile）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 11.0 },  // compendium 12070: Running, 7 mph (8.5 min/mile)
  { id: 'ex_comp_011', name: '跑步 8 mph（7.5 min/mile）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 11.8 },  // compendium 12090: Running, 8 mph (7.5 min/mile)
  { id: 'ex_comp_012', name: '跳绳 中速（100-120 次/min）', bodyPart: 'cardio', equipment: '跳绳', isCompound: false, met: 11.8 },  // compendium 15551: Rope jumping, moderate pace, 100-120 skips/min, general, 2 f
  { id: 'ex_comp_013', name: '跳绳 快速（120-160 次/min）', bodyPart: 'cardio', equipment: '跳绳', isCompound: false, met: 12.3 },  // compendium 15550: Rope jumping, fast pace, 120-160 skips/min
  { id: 'ex_comp_014', name: '跳绳 慢速（<100 次/min）', bodyPart: 'cardio', equipment: '跳绳', isCompound: false, met: 8.8 },  // compendium 15552: Rope jumping, slow pace, < 100 skips/min, 2 foot skip, rhyth
  { id: 'ex_comp_015', name: '划船机（中等强度）', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 4.8 },  // compendium 02071: Rowing, stationary, general, moderate effort
  { id: 'ex_comp_016', name: '划船机（剧烈）', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 6.0 },  // compendium 02070: Rowing, stationary ergometer, general, vigorous effort
  { id: 'ex_comp_017', name: '划船机 100W', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 7.0 },  // compendium 02072: Rowing, stationary, 100 watts, moderate effort
  { id: 'ex_comp_018', name: '划船机 150W', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 8.5 },  // compendium 02073: Rowing, stationary, 150 watts, vigorous effort
  { id: 'ex_comp_019', name: '划船机 200W', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 12.0 },  // compendium 02074: Rowing, stationary, 200 watts, very vigorous effort
  { id: 'ex_comp_020', name: '骑车（一般速度）', bodyPart: 'cardio', equipment: '自行车/动感单车', isCompound: false, met: 7.5 },  // compendium 01015: Bicycling, general
  { id: 'ex_comp_021', name: '骑车 10-11.9 mph', bodyPart: 'cardio', equipment: '自行车', isCompound: false, met: 6.8 },  // compendium 01020: Bicycling, 10-11.9 mph, leisure, slow, light effort
  { id: 'ex_comp_022', name: '骑车 12-13.9 mph（中等）', bodyPart: 'cardio', equipment: '自行车', isCompound: false, met: 8.0 },  // compendium 01030: Bicycling, 12-13.9 mph, leisure, moderate effort
  { id: 'ex_comp_023', name: '骑车 14-15.9 mph（快速）', bodyPart: 'cardio', equipment: '自行车', isCompound: false, met: 10.0 },  // compendium 01040: Bicycling, 14-15.9 mph, racing or leisure, fast, vigorous ef
  { id: 'ex_comp_024', name: '骑车 16-19 mph（竞赛）', bodyPart: 'cardio', equipment: '自行车', isCompound: false, met: 12.0 },  // compendium 01050: Bicycling, 16-19 mph, racing/not drafting or > 19 mph drafti
  { id: 'ex_comp_025', name: '椭圆机（中等）', bodyPart: 'cardio', equipment: '椭圆机', isCompound: false, met: 5.0 },  // compendium 02048: Elliptical trainer, moderate effort
  { id: 'ex_comp_026', name: '楼梯机', bodyPart: 'cardio', equipment: '楼梯机', isCompound: false, met: 9.0 },  // compendium 02065: Stair-treadmill ergometer, general
  { id: 'ex_comp_028', name: '快走 2.8-3.2 mph', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 3.5 },  // compendium 17190: Walking, 2.8 to 3.2 mph, level, moderate pace, firm surface
  { id: 'ex_comp_029', name: '快走 3.5 mph（健身速度）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 4.3 },  // compendium 17200: Walking, 3.5 mph, level, brisk, firm surface, walking for ex
  { id: 'ex_comp_030', name: '快走 4.0 mph', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 5.0 },  // compendium 17220: Walking, 4.0 mph, level, firm surface, very brisk pace
  { id: 'ex_comp_031', name: '快走 4.5 mph（非常快）', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 7.0 },  // compendium 17230: Walking, 4.5 mph, level, firm surface, very, very brisk
  { id: 'ex_comp_032', name: '游泳 自由泳（慢/中）', bodyPart: 'cardio', equipment: '泳池', isCompound: false, met: 5.8 },  // compendium 18240: Swimming laps, freestyle, front crawl, slow, light or modera
  { id: 'ex_comp_033', name: '游泳 蛙泳（训练）', bodyPart: 'cardio', equipment: '泳池', isCompound: false, met: 10.3 },  // compendium 18260: Swimming, breaststroke, general, training or competition
  { id: 'ex_comp_034', name: '游泳 蝶泳', bodyPart: 'cardio', equipment: '泳池', isCompound: false, met: 13.8 },  // compendium 18270: Swimming, butterfly, general
  { id: 'ex_comp_035', name: '水上慢跑', bodyPart: 'cardio', equipment: '泳池', isCompound: false, met: 9.8 },  // compendium 18366: Water jogging
  { id: 'ex_comp_036', name: '瑜伽 哈他', bodyPart: 'fullbody', equipment: '瑜伽垫', isCompound: false, met: 2.5 },  // compendium 02150: Yoga, Hatha
  { id: 'ex_comp_037', name: '瑜伽 力量（Power Yoga）', bodyPart: 'fullbody', equipment: '瑜伽垫', isCompound: false, met: 4.0 },  // compendium 02160: Yoga, Power
  { id: 'ex_comp_038', name: '普拉提', bodyPart: 'core', equipment: '瑜伽垫', isCompound: false, met: 3.0 },  // compendium 02105: Pilates, general
  { id: 'ex_comp_039', name: '徒手训练（上下地面）', bodyPart: 'fullbody', equipment: '徒手', isCompound: false, met: 3.5 },  // compendium 02030: Calisthenics, light or moderate effort, general (e.g., back 
  { id: 'ex_comp_040', name: '武术（中速：柔道/空手道/泰拳）', bodyPart: 'fullbody', equipment: '徒手', isCompound: false, met: 10.3 },  // compendium 15430: Martial arts, different types, moderate pace (e.g., judo, ju
  { id: 'ex_comp_041', name: '篮球（比赛）', bodyPart: 'fullbody', equipment: '篮球场', isCompound: false, met: 8.0 },  // compendium 15040: Basketball, game (Taylor Code 490)
  { id: 'ex_comp_042', name: '篮球（一般）', bodyPart: 'fullbody', equipment: '篮球场', isCompound: false, met: 6.5 },  // compendium 15055: Basketball, general
  { id: 'ex_comp_043', name: '足球（比赛）', bodyPart: 'fullbody', equipment: '足球场', isCompound: false, met: 10.0 },  // compendium 15605: Soccer, competitive
  { id: 'ex_comp_044', name: '网球 单打', bodyPart: 'fullbody', equipment: '网球场', isCompound: false, met: 8.0 },  // compendium 15690: Tennis, singles (Taylor Code 420)
  { id: 'ex_comp_045', name: '网球 双打', bodyPart: 'fullbody', equipment: '网球场', isCompound: false, met: 6.0 },  // compendium 15680: Tennis, doubles (Taylor Code 430)
  { id: 'ex_comp_046', name: '羽毛球（比赛）', bodyPart: 'fullbody', equipment: '羽毛球场', isCompound: false, met: 7.0 },  // compendium 15020: Badminton, competitive (Taylor Code 450)
  { id: 'ex_comp_047', name: '乒乓球', bodyPart: 'fullbody', equipment: '乒乓球台', isCompound: false, met: 4.0 },  // compendium 15660: Table tennis, ping pong (Taylor Code 410)
  { id: 'ex_comp_048', name: '高尔夫（步行，扛杆）', bodyPart: 'fullbody', equipment: '高尔夫球场', isCompound: false, met: 4.3 },  // compendium 15265: Golf, walking, carrying clubs
  { id: 'ex_comp_049', name: '徒步（越野）', bodyPart: 'cardio', equipment: '户外', isCompound: false, met: 6.0 },  // compendium 17080: Hiking, cross country (Taylor Code 040)
  { id: 'ex_comp_050', name: '爬山（无负重）', bodyPart: 'cardio', equipment: '户外', isCompound: false, met: 6.3 },  // compendium 17033: Climbing hills, no load
];

/** 统计: 49 条精选 + Compendium 821 总数 */