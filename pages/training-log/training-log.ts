/**
 * 训练记录 · 选动作 + 加组 + 休息计时器
 */
import { genId, todayStr, currentWeightKg } from '../../services/storage';
import { addTrainingLog, dayTrainingLogs, exercisesAll, kcalForLog, removeTrainingLog } from '../../services/training';
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
    todayLogs: [] as Array<TrainingLog & { exName: string }>,
    timer: null as number | null,
  },

  onShow() {
    const all = exercisesAll();
    const parts = Array.from(new Set(all.map((e) => e.bodyPart)));
    const partLabels = parts.map((p) => ({ key: p, label: BODY_PART_LABEL[p as BodyPart] }));
    this.setData({
      today: todayStr(),
      exercises: all,
      partLabels,
      currentPart: parts[0] || '',
    });
    this.refreshLogs();
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
  },

  refreshLogs() {
    const today = this.data.today;
    const logs = dayTrainingLogs(today).map((l) => ({
      ...l,
      exName: this.data.exercises.find((e) => e.id === l.exerciseId)?.name || l.exerciseId,
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
    addTrainingLog({
      id: genId('tr'),
      date: this.data.today,
      exerciseId: ex.id,
      sets: this.data.sets.map((s) => ({ ...s, restSec: this.data.restSec })),
      createdAt: Date.now(),
    });
    // T19 计算消耗并提示
    const burn = kcalForLog(
      { id: '', date: this.data.today, exerciseId: ex.id, sets: this.data.sets, createdAt: Date.now() },
      ex,
      currentWeightKg(),
    );
    wx.showToast({
      title: `已保存 ✅ 🔥 消耗约 ${burn} kcal`,
      icon: 'none',
      duration: 2200,
    });
    this.setData({ selectedExercise: null, sets: [] });
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
          this.refreshLogs();
        }
      },
    });
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