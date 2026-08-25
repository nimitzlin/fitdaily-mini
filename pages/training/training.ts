/**
 * 训练主页：月历 + 今日打卡 + 今日训练动作列表 + 入口
 */
import { isTrainedToday, kcalForDay, monthTrainedDays, dayTrainingLogs, setTrainingDone, exercisesAll } from '../../services/training';
import { currentWeightKg, todayStr } from '../../services/storage';
import { removeTrainingLog } from '../../services/training';
import { Exercise, TrainingLog } from '../../services/types';

interface DayCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isTrained: boolean;
}

Page({
  data: {
    today: '',
    trained: false,
    monthLabel: '',
    calendar: [] as DayCell[][],
    todayLogs: [] as Array<TrainingLog & { exName: string; summary: string }>,
    todayExerciseCount: 0,
    todayTotalSets: 0,
    todayBurn: 0, // T19
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const today = todayStr();
    const trained = isTrainedToday(today);
    const cal = this.buildMonthCalendar(today);
    const ym = today.slice(0, 7);
    const trainedDays = monthTrainedDays(ym);
    cal.forEach((row) =>
      row.forEach((c) => {
        c.isTrained = trainedDays.has(c.date);
      }),
    );
    const todayLogs = dayTrainingLogs(today).map((l) => {
      const ex = exercisesAll().find((e) => e.id === l.exerciseId);
      const isCardio = ex?.bodyPart === 'cardio';
      // 力量：「4 组 · 顶组 60kg × 12」；有氧（reps=分钟）：「30 分钟」
      const summary = isCardio
        ? `${l.sets.reduce((s, x) => s + (x.reps || 0), 0)} 分钟`
        : `${l.sets.length} 组 · 顶组 ${l.sets[0]?.weightKg ?? 0}kg × ${l.sets[0]?.reps ?? 0}`;
      return {
        ...l,
        exName: ex?.name || l.exerciseId,
        summary,
      };
    });
    const todayBurn = kcalForDay(todayLogs, currentWeightKg());
    this.setData({
      today,
      trained,
      monthLabel: this.monthLabel(today),
      calendar: cal,
      todayLogs,
      todayExerciseCount: new Set(todayLogs.map((l) => l.exerciseId)).size,
      todayTotalSets: todayLogs.reduce((s, l) => s + l.sets.length, 0),
      todayBurn,
    });
  },

  monthLabel(d: string): string {
    const [y, m] = d.split('-');
    return `${y} 年 ${parseInt(m, 10)} 月`;
  },

  /** 当月日历（6 行 × 7 列，从周一开始） */
  buildMonthCalendar(today: string): DayCell[][] {
    const [y, m] = today.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0); // 当月最后一天
    const daysInMonth = last.getDate();
    const startDow = first.getDay(); // 0=周日
    const offset = startDow === 0 ? 6 : startDow - 1; // 转为周一=0
    const cells: DayCell[] = [];
    // 上月填充
    for (let i = 0; i < offset; i++) {
      cells.push({ date: '', day: 0, inMonth: false, isToday: false, isTrained: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(m).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const date = `${y}-${mm}-${dd}`;
      cells.push({
        date,
        day: d,
        inMonth: true,
        isToday: date === today,
        isTrained: false, // 由 refresh 后续填
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: '', day: 0, inMonth: false, isToday: false, isTrained: false });
    }
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  },

  onToggleTrain() {
    const today = this.data.today;
    const next = !this.data.trained;
    setTrainingDone(today, next);
    this.refresh();
    wx.showToast({
      title: next ? '打卡成功 💪' : '已取消打卡',
      icon: 'none',
    });
  },

  goLog() {
    wx.navigateTo({ url: '/pages/training-log/training-log' });
  },

  /** 长按删除今日某条训练记录 */
  onRemoveTodayLog(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.showModal({
      title: '删除这条记录？',
      confirmColor: '#E57B64',
      success: (r) => {
        if (r.confirm) {
          removeTrainingLog(this.data.today, id);
          this.refresh();
        }
      },
    });
  },

  goPR() {
    wx.showModal({ title: 'PR 曲线', content: '进入动作历史，看卧推/深蹲/硬拉的重量趋势（v1.2 上）', showCancel: false });
  },
});