/**
 * 训练记录 · 选动作 + 加组 + 休息计时器
 */
import { genId, todayStr, currentWeightKg } from '../../services/storage';
import {
  addTrainingLog,
  dayTrainingLogs,
  exercisesAll,
  formatSetSummary,
  kcalForLog,
  removeTrainingLog,
  updateTrainingLog,
} from '../../services/training';
import { BODY_PART_LABEL, BodyPart, Exercise, TrainingLog } from '../../services/types';

interface DraftSet {
  reps: number;
  weightKg: number;
  restSec: number;
}

Page({
  data: {
    today: '',
    exercises: [] as Exercise[],
    partLabels: [] as { key: string; label: string }[],
    currentPart: '' as string,
    selectedExercise: null as Exercise | null,
    sets: [] as DraftSet[],
    restSec: 90,
    timerRunning: false,
    restLeft: 0,
    todayLogs: [] as Array<TrainingLog & { exName: string; summary: string }>,
    timer: null as number | null,
    /** 编辑模式：editingLogId 非空 = 正在编辑一条已有记录 */
    editingLogId: '',
  },

  onShow() {
    this.syncDateFromQuery();
    const all = exercisesAll();
    const parts = Array.from(new Set(all.map((e) => e.bodyPart)));
    const partLabels = parts.map((p) => ({ key: p, label: BODY_PART_LABEL[p as BodyPart] }));
    this.setData({
      exercises: all,
      partLabels,
      currentPart: parts[0] || '',
    });
    this.refreshLogs();
  },

  /** 从页面 query 同步日期（从 data 页跳转过来时传 ?date=YYYY-MM-DD） */
  syncDateFromQuery() {
    const pages = getCurrentPages();
    const cur = pages[pages.length - 1];
    const q = (cur && cur.options) || {};
    const date = q.date || todayStr();
    this.setData({ today: date });
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
  },

  refreshLogs() {
    const today = this.data.today;
    const logs = dayTrainingLogs(today).map((l) => ({
      ...l,
      exName: this.data.exercises.find((e) => e.id === l.exerciseId)?.name || l.exerciseId,
      summary: formatSetSummary(l),
    }));
    this.setData({ todayLogs: logs });
  },

  selectPart(e: WechatMiniprogram.BaseEvent) {
    this.setData({ currentPart: e.currentTarget.dataset.part });
  },

  selectExercise(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string;
    const ex = this.data.exercises.find((e2) => e2.id === id) || null;
    this.setData({
      selectedExercise: ex,
      sets: ex ? [this.defaultSetFor(ex)] : [],
    });
  },

  addSet() {
    const ex = this.data.selectedExercise;
    if (!ex) return;
    const last = this.data.sets[this.data.sets.length - 1];
    const def = this.defaultSetFor(ex);
    this.setData({
      sets: [...this.data.sets, last ? { ...last } : def],
    });
  },

  /** 根据动作类型生成默认组：有氧 → 时间（分钟） + 距离 0；力量 → 次数 + 重量 */
  defaultSetFor(ex: Exercise): DraftSet {
    if (ex.bodyPart === 'cardio') {
      return { reps: 30, weightKg: 0, restSec: 0 }; // reps = 分钟
    }
    return { reps: 12, weightKg: 20, restSec: 90 };
  },

  removeSet(e: WechatMiniprogram.BaseEvent) {
    const idx = e.currentTarget.dataset.idx as number;
    const sets = this.data.sets.filter((_, i) => i !== idx);
    this.setData({ sets });
  },

  onSetReps(e: WechatMiniprogram.Input) {
    const idx = e.currentTarget.dataset.idx as number;
    const v = parseInt(e.detail.value, 10);
    const sets = this.data.sets.slice();
    if (sets[idx]) sets[idx] = { ...sets[idx], reps: v };
    this.setData({ sets });
  },

  onSetWeight(e: WechatMiniprogram.Input) {
    const idx = e.currentTarget.dataset.idx as number;
    const v = parseFloat(e.detail.value);
    const sets = this.data.sets.slice();
    if (sets[idx]) sets[idx] = { ...sets[idx], weightKg: v };
    this.setData({ sets });
  },

  saveLog() {
    const ex = this.data.selectedExercise;
    if (!ex) {
      wx.showToast({ title: '请先选动作', icon: 'none' });
      return;
    }
    if (!this.data.sets.length) {
      wx.showToast({ title: '至少加 1 组', icon: 'none' });
      return;
    }
    // 有氧动作：reps = 分钟（>0）、weightKg = 距离 km（可选、可为 0）
    // 力量动作：reps 必填 >0；weightKg 必填 >0
    const isCardio = ex.bodyPart === 'cardio';
    const invalid = this.data.sets.find((s) => {
      if (!s.reps || s.reps <= 0) return true;
      if (!isCardio && (!s.weightKg || s.weightKg <= 0)) return true;
      return false;
    });
    if (invalid) {
      wx.showToast({
        title: isCardio ? '请填时间（分钟）' : '请填次数和重量',
        icon: 'none',
      });
      return;
    }
    const isEdit = !!this.data.editingLogId;
    const log: TrainingLog = {
      id: this.data.editingLogId || genId('tr'),
      date: this.data.today,
      exerciseId: ex.id,
      sets: this.data.sets.map((s) => ({ ...s, restSec: this.data.restSec })),
      createdAt: Date.now(),
    };
    if (isEdit) {
      updateTrainingLog(log);
    } else {
      addTrainingLog(log);
    }
    // T19 计算消耗并提示
    const burn = kcalForLog(
      { id: '', date: this.data.today, exerciseId: ex.id, sets: this.data.sets, createdAt: Date.now() },
      ex,
      currentWeightKg(),
    );
    wx.showToast({
      title: isEdit ? `已更新 ✅ 🔥 消耗约 ${burn} kcal` : `已保存 ✅ 🔥 消耗约 ${burn} kcal`,
      icon: 'none',
      duration: 2200,
    });
    this.setData({ selectedExercise: null, sets: [], editingLogId: '' });
    this.refreshLogs();
  },

  onRemoveLog(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.showModal({
      title: '删除这组？',
      confirmColor: '#E57B64',
      success: (r) => {
        if (r.confirm) {
          removeTrainingLog(this.data.today, id);
          // 如果删的恰好是正在编辑的那条，重置编辑模式
          if (this.data.editingLogId === id) {
            this.setData({ selectedExercise: null, sets: [], editingLogId: '' });
          }
          this.refreshLogs();
        }
      },
    });
  },

  /** 点已有记录 → 编辑模式：回填到上方表单 */
  onEditLog(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string;
    const log = dayTrainingLogs(this.data.today).find((l) => l.id === id);
    if (!log) {
      wx.showToast({ title: '记录不存在或已删除', icon: 'none' });
      return;
    }
    const ex = exercisesAll().find((e) => e.id === log.exerciseId) || null;
    if (!ex) {
      wx.showToast({ title: '动作已下架，无法编辑', icon: 'none' });
      return;
    }
    this.setData({
      selectedExercise: ex,
      currentPart: ex.bodyPart,
      sets: log.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg, restSec: s.restSec })),
      editingLogId: id,
    });
    wx.showToast({ title: `正在编辑「${ex.name}」`, icon: 'none', duration: 1500 });
    wx.pageScrollTo({ selector: '.card', duration: 200 });
  },

  /** 取消编辑（清空表单 + 退出编辑模式） */
  onCancelEdit() {
    this.setData({ selectedExercise: null, sets: [], editingLogId: '' });
  },

  /** T18 休息计时器 */
  startTimer() {
    if (this.data.timerRunning) return;
    if (this.data.timer) clearInterval(this.data.timer);
    let left = this.data.restSec;
    this.setData({ restLeft: left, timerRunning: true });
    wx.vibrateShort({ type: 'light' });
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(t);
        wx.vibrateLong();
        wx.showToast({ title: '休息结束，开练 💪', icon: 'none' });
        this.setData({ restLeft: 0, timerRunning: false, timer: null });
        return;
      }
      this.setData({ restLeft: left });
    }, 1000);
    this.setData({ timer: t });
  },

  stopTimer() {
    if (this.data.timer) clearInterval(this.data.timer);
    this.setData({ timerRunning: false, restLeft: 0, timer: null });
  },
});