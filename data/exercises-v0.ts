/**
 * 内置动作库 v0 · 50 个常用训练动作（无图，按部位分组）
 * 数据源：主流健身 App 公开数据 + 中国健美协会推荐动作
 * met 字段：MET 代谢当量（T19 用），参考 Compendium of Physical Activities
 */
import { Exercise } from '../services/types';

export const EXERCISES_V0: Exercise[] = [
  // 胸 chest (8)
  { id: 'ex_bench', name: '杠铃卧推', bodyPart: 'chest', equipment: '杠铃+卧推架', isCompound: true, met: 5.0 },
  { id: 'ex_dumbbell_press', name: '哑铃卧推', bodyPart: 'chest', equipment: '哑铃+卧推凳', isCompound: true, met: 5.0 },
  { id: 'ex_incline_db', name: '上斜哑铃推举', bodyPart: 'chest', equipment: '哑铃+斜凳', isCompound: true, met: 5.0 },
  { id: 'ex_incline_bb', name: '上斜杠铃卧推', bodyPart: 'chest', equipment: '杠铃+斜凳', isCompound: true, met: 5.0 },
  { id: 'ex_dips', name: '双杠臂屈伸', bodyPart: 'chest', equipment: '双杠', isCompound: true, met: 6.0 },
  { id: 'ex_pushup', name: '俯卧撑', bodyPart: 'chest', equipment: '徒手', isCompound: true, met: 5.0 },
  { id: 'ex_cable_fly', name: '绳索夹胸', bodyPart: 'chest', equipment: '龙门架', isCompound: false, met: 5.0 },
  { id: 'ex_dumbbell_fly', name: '哑铃飞鸟', bodyPart: 'chest', equipment: '哑铃+平凳', isCompound: false, met: 5.0 },

  // 背 back (8)
  { id: 'ex_pullup', name: '引体向上', bodyPart: 'back', equipment: '单杠', isCompound: true, met: 8.0 },
  { id: 'ex_chinup', name: '反握引体', bodyPart: 'back', equipment: '单杠', isCompound: true, met: 8.0 },
  { id: 'ex_barbell_row', name: '杠铃划船', bodyPart: 'back', equipment: '杠铃', isCompound: true, met: 5.0 },
  { id: 'ex_dumbbell_row', name: '单臂哑铃划船', bodyPart: 'back', equipment: '哑铃+平凳', isCompound: true, met: 5.0 },
  { id: 'ex_lat_pulldown', name: '高位下拉', bodyPart: 'back', equipment: '龙门架', isCompound: true, met: 5.0 },
  { id: 'ex_seated_row', name: '坐姿划船', bodyPart: 'back', equipment: '器械', isCompound: true, met: 5.0 },
  { id: 'ex_tbar_row', name: 'T 杆划船', bodyPart: 'back', equipment: 'T 杆', isCompound: true, met: 5.0 },
  { id: 'ex_face_pull', name: '面拉', bodyPart: 'back', equipment: '绳索', isCompound: false, met: 3.5 },

  // 腿 legs (10)
  { id: 'ex_squat', name: '杠铃深蹲', bodyPart: 'legs', equipment: '杠铃+深蹲架', isCompound: true, met: 6.0 },
  { id: 'ex_front_squat', name: '前蹲', bodyPart: 'legs', equipment: '杠铃', isCompound: true, met: 6.5 },
  { id: 'ex_deadlift', name: '硬拉', bodyPart: 'legs', equipment: '杠铃', isCompound: true, met: 7.0 },
  { id: 'ex_rdl', name: '罗马尼亚硬拉', bodyPart: 'legs', equipment: '杠铃', isCompound: true, met: 7.0 },
  { id: 'ex_leg_press', name: '腿举', bodyPart: 'legs', equipment: '腿举机', isCompound: true, met: 6.0 },
  { id: 'ex_lunge', name: '弓步蹲', bodyPart: 'legs', equipment: '哑铃', isCompound: true, met: 6.0 },
  { id: 'ex_leg_extension', name: '腿屈伸', bodyPart: 'legs', equipment: '器械', isCompound: false, met: 3.5 },
  { id: 'ex_leg_curl', name: '腿弯举', bodyPart: 'legs', equipment: '器械', isCompound: false, met: 3.5 },
  { id: 'ex_calf_raise', name: '站姿提踵', bodyPart: 'legs', equipment: '器械/徒手', isCompound: false, met: 3.5 },
  { id: 'ex_seated_calf', name: '坐姿提踵', bodyPart: 'legs', equipment: '器械', isCompound: false, met: 3.5 },

  // 肩 shoulders (6)
  { id: 'ex_ohp', name: '站姿肩上推举', bodyPart: 'shoulders', equipment: '杠铃', isCompound: true, met: 4.5 },
  { id: 'ex_seated_ohp', name: '坐姿肩上推举', bodyPart: 'shoulders', equipment: '哑铃', isCompound: true, met: 4.5 },
  { id: 'ex_lateral_raise', name: '哑铃侧平举', bodyPart: 'shoulders', equipment: '哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_rear_delt', name: '俯身后束飞鸟', bodyPart: 'shoulders', equipment: '哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_arnold', name: '阿诺德推举', bodyPart: 'shoulders', equipment: '哑铃', isCompound: true, met: 4.5 },
  { id: 'ex_upright_row', name: '直立划船', bodyPart: 'shoulders', equipment: '杠铃/哑铃', isCompound: true, met: 4.5 },

  // 臂 arms (8)
  { id: 'ex_barbell_curl', name: '杠铃弯举', bodyPart: 'arms', equipment: '杠铃', isCompound: false, met: 4.0 },
  { id: 'ex_dumbbell_curl', name: '哑铃弯举', bodyPart: 'arms', equipment: '哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_hammer_curl', name: '锤式弯举', bodyPart: 'arms', equipment: '哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_preacher', name: '牧师凳弯举', bodyPart: 'arms', equipment: '杠铃/哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_tri_pushdown', name: '三头下压', bodyPart: 'arms', equipment: '绳索', isCompound: false, met: 4.0 },
  { id: 'ex_overhead_tri', name: '过顶三头屈伸', bodyPart: 'arms', equipment: '哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_skull_crusher', name: '仰卧臂屈伸', bodyPart: 'arms', equipment: '杠铃/哑铃', isCompound: false, met: 4.0 },
  { id: 'ex_close_bench', name: '窄距卧推', bodyPart: 'arms', equipment: '杠铃', isCompound: true, met: 5.5 },

  // 核心 core (5)
  { id: 'ex_plank', name: '平板支撑', bodyPart: 'core', equipment: '徒手', isCompound: false, met: 2.8 },
  { id: 'ex_crunch', name: '卷腹', bodyPart: 'core', equipment: '徒手', isCompound: false, met: 2.8 },
  { id: 'ex_hanging_leg', name: '悬垂举腿', bodyPart: 'core', equipment: '单杠', isCompound: false, met: 2.8 },
  { id: 'ex_russian_twist', name: '俄罗斯转体', bodyPart: 'core', equipment: '徒手/药球', isCompound: false, met: 2.8 },
  { id: 'ex_ab_wheel', name: '健腹轮', bodyPart: 'core', equipment: '健腹轮', isCompound: false, met: 2.8 },

  // 有氧 cardio (3)
  { id: 'ex_running', name: '跑步', bodyPart: 'cardio', equipment: '户外/跑步机', isCompound: false, met: 8.3 },
  { id: 'ex_rowing', name: '划船机', bodyPart: 'cardio', equipment: '划船机', isCompound: false, met: 7.0 },
  { id: 'ex_jump_rope', name: '跳绳', bodyPart: 'cardio', equipment: '跳绳', isCompound: false, met: 11.8 },

  // 全身 fullbody (2)
  { id: 'ex_kbswing', name: '壶铃摇摆', bodyPart: 'fullbody', equipment: '壶铃', isCompound: true, met: 9.0 },
  { id: 'ex_burpee', name: '波比跳', bodyPart: 'fullbody', equipment: '徒手', isCompound: true, met: 8.5 },
];

export const EXERCISES_BY_PART: Record<string, Exercise[]> = EXERCISES_V0.reduce(
  (acc, ex) => {
    (acc[ex.bodyPart] = acc[ex.bodyPart] || []).push(ex);
    return acc;
  },
  {} as Record<string, Exercise[]>,
);

// ========== 合并：builtin v0 + Compendium v1 ==========
// Compendium v1 精选 49 条精确 MET 动作（跑步分速度/跳绳分速度/划船机分瓦数/瑜伽/球类）
// v0 保留为入门动作库，用户原记录不丢失

import { EXERCISES_V1 } from './exercises-v1';

/** 全部动作 = v0 (50) + v1 (49) = 99 条
 *  - pages/training 选动作用这个
 *  - storage / data 区分: v0 用 EXERCISES_V0，v1 用 EXERCISES_V1
 */
export const ALL_EXERCISES: Exercise[] = [...EXERCISES_V0, ...EXERCISES_V1];