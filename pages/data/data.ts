/**
 * 数据 · 历史补登 + 日历视图 (T22)
 *
 * 功能：
 *  1. 顶部日期切换器（‹ 8/25 周二 ›）+ 「回到今天」按钮
 *  2. 6×7 月历视图，绿点 = 有饮食 / 🔥角标 = 有训练
 *  3. 选中日期的饮食 + 训练 + 饮水汇总 + 列表（每条可编辑/删除）
 *  4. 右下角 + 按钮 → 添加食品 / 训练 / 饮水，传当前选中日期
 */
import {
  currentWeightKg,
  foodUserUpsert,
  logsOfDay,
  profileGet,
  todayStr,
  waterAdd,
  waterOf,
  waterReset,
  waterSet,
  waterSub,
} from '../../services/storage';
import {
  dayTrainingLogs,
  exerciseById,
  formatSetSummary,
  isTrainedToday,
  kcalForDay,
  setTrainingDone,
} from '../../services/training';
import { dailyStats, DailyStats } from '../../services/nutrition';
import { MealLog, TrainingLog, UserProfile } from '../../services/types';

const WK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 训练记录原始日志 → 列表展示态（解 exerciseId + 汇总组数） */
function viewTrainLog(log: TrainingLog) {
  const ex = exerciseById(log.exerciseId);
  const sets = Array.isArray(log.sets) ? log.sets : [];
  const name = ex ? ex.name : log.exerciseId; // 查不到时降级到原 id，避免 [object Object]
  const summary = sets.length === 0 ? '仅打卡 · 未记录组数' : formatSetSummary(log);
  return {
    id: log.id,
    date: log.date,
    exerciseName: name,
    summary,
    _raw: log,
  };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return ymd(dt);
}

function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `周${WK_LABELS[dt.getDay()]}`;
}

/** 扫 30 天内每日是否有饮食/训练（O(30) 简单实现） */
function buildMonthGrid(centerDate: string): {
  weeks: Array<Array<{ date: string; inMonth: boolean; isToday: boolean; hasFood: boolean; hasTrain: boolean; isSelected: boolean; dayNum: number }>>;
  monthLabel: string;
  prevMonthAvailable: boolean;
  nextMonthAvailable: boolean;
} {
  const [y, m] = centerDate.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const firstWeekday = first.getDay(); // 0=日
  const offset = firstWeekday === 0 ? -6 : 1 - firstWeekday; // 以周一为首
  const start = new Date(y, m - 1, 1 + offset);
  const today = todayStr();

  const weeks: ReturnType<typeof buildMonthGrid>['weeks'] = [];
  for (let w = 0; w < 6; w++) {
    const row: Array<{ date: string; inMonth: boolean; isToday: boolean; hasFood: boolean; hasTrain: boolean; isSelected: boolean; dayNum: number }> = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + w * 7 + d);
      const dateStr = ymd(dt);
      const inMonth = dt.getMonth() === m - 1;
      const logs = logsOfDay(dateStr);
      const trains = dayTrainingLogs(dateStr);
      const marked = isTrainedToday(dateStr);
      row.push({
        date: dateStr,
        inMonth,
        isToday: dateStr === today,
        hasFood: logs.length > 0,
        hasTrain: trains.length > 0 || marked,
        isSelected: dateStr === centerDate,
        dayNum: dt.getDate(),
      });
    }
    weeks.push(row);
  }

  return {
    weeks,
    monthLabel: `${y} 年 ${m} 月`,
    prevMonthAvailable: m > 1,
    nextMonthAvailable: m < 12,
  };
}

Page({
  data: {
    selectedDate: '',
    selectedWeekday: '',
    selectedIsToday: false,
    today: '',
    selectedStats: null as DailyStats | null,
    selectedHasLog: false,
    selectedWater: 0,
    selectedLogs: [] as MealLog[],
    selectedTrained: false,
    selectedTrainLogs: [] as Array<{
      id: string;
      date: string;
      exerciseName: string;
      summary: string;
      _raw: TrainingLog;
    }>,
    selectedBurn: 0,
    profile: null as UserProfile | null,
    weeks: [] as Array<Array<{ date: string; inMonth: boolean; isToday: boolean; hasFood: boolean; hasTrain: boolean; isSelected: boolean; dayNum: number }>>,
    monthLabel: '',
    calendarMonth: '' as string, // 当前展示的月份（YYYY-MM）
  },

  onShow() {
    if (!this.data.selectedDate) {
      const today = todayStr();
      this.setData({
        selectedDate: today,
        selectedWeekday: weekdayLabel(today),
        selectedIsToday: true,
        today,
        calendarMonth: today.slice(0, 7),
      });
    } else {
      this.setData({ today: todayStr() });
    }
    this.refreshAll();
  },

  /** 整体刷新：根据 selectedDate + calendarMonth 重算 */
  refreshAll() {
    const date = this.data.selectedDate;
    const monthStr = this.data.calendarMonth || date.slice(0, 7);
    const grid = buildMonthGrid(date);
    const logs = logsOfDay(date);
    const stats = logs.length ? dailyStats(logs) : null;
    const trainLogs = dayTrainingLogs(date);
    const trained = isTrainedToday(date);
    const burn = kcalForDay(trainLogs, currentWeightKg());
    this.setData({
      weeks: grid.weeks,
      monthLabel: grid.monthLabel,
      selectedWeekday: weekdayLabel(date),
      selectedIsToday: date === todayStr(),
      selectedStats: stats,
      selectedHasLog: logs.length > 0,
      selectedLogs: logs,
      selectedWater: waterOf(date),
      selectedTrained: trained,
      selectedTrainLogs: trainLogs.map(viewTrainLog),
      selectedBurn: burn,
      profile: profileGet(),
      calendarMonth: monthStr,
    });
  },

  /** ‹ 上一天 */
  onPrevDay() {
    const next = addDays(this.data.selectedDate, -1);
    this.setData({ selectedDate: next, calendarMonth: next.slice(0, 7) });
    this.refreshAll();
  },

  /** › 下一天（不可超过今天） */
  onNextDay() {
    const next = addDays(this.data.selectedDate, 1);
    if (next > this.data.today) {
      wx.showToast({ title: '不能选未来的日期', icon: 'none' });
      return;
    }
    this.setData({ selectedDate: next, calendarMonth: next.slice(0, 7) });
    this.refreshAll();
  },

  /** 回到今天 */
  onJumpToday() {
    const today = todayStr();
    this.setData({ selectedDate: today, calendarMonth: today.slice(0, 7) });
    this.refreshAll();
  },

  /** ‹ 上一月 */
  onPrevMonth() {
    const [y, m] = this.data.calendarMonth.split('-').map(Number);
    const dt = new Date(y, m - 2, 1);
    const next = ymd(dt);
    this.setData({ calendarMonth: next });
    this.refreshAll();
  },

  /** › 下一月 */
  onNextMonth() {
    const [y, m] = this.data.calendarMonth.split('-').map(Number);
    if (m >= 12) {
      wx.showToast({ title: '已到当前年份', icon: 'none' });
      return;
    }
    const dt = new Date(y, m, 1);
    const next = ymd(dt);
    this.setData({ calendarMonth: next });
    this.refreshAll();
  },

  /** 点日历某天 */
  onPickDate(e: WechatMiniprogram.BaseEvent) {
    const date = e.currentTarget.dataset.date as string;
    if (date > this.data.today) {
      wx.showToast({ title: '不能选未来的日期', icon: 'none' });
      return;
    }
    this.setData({ selectedDate: date, calendarMonth: date.slice(0, 7) });
    this.refreshAll();
  },

  /** 训练日打卡（补登打卡也算） */
  onToggleTrain() {
    const date = this.data.selectedDate;
    const next = !this.data.selectedTrained;
    setTrainingDone(date, next);
    // 强制从 storage 重读，让 UI 立即反映该日期的真实状态
    const trainedNow = isTrainedToday(date);
    this.setData({ selectedTrained: trainedNow });
    this.refreshAll();
    const weekTxt = weekdayLabel(date);
    wx.showToast({
      title: next ? `${date} ${weekTxt} 已补打卡 ✅` : `${date} ${weekTxt} 已取消打卡`,
      icon: 'none',
      duration: 1800,
    });
  },

  /** 食品条目操作（编辑 / 删除） */
  onFoodAction(e: WechatMiniprogram.CustomEvent) {
    const { type, id: logId, name } = e.currentTarget.dataset as {
      type: 'edit' | 'remove';
      id: string;
      name: string;
    };
    const date = this.data.selectedDate;
    if (type === 'edit') {
      wx.navigateTo({
        url: `/pages/food-edit/food-edit?date=${date}&editLogId=${logId}`,
      });
    } else if (type === 'remove') {
      wx.showModal({
        title: '删除这条记录？',
        content: name ? `${name}\n该操作不可撤销` : undefined,
        confirmColor: '#E57B64',
        success: (r) => {
          if (r.confirm) {
            // 直接走 storage 的 logRemove
            const { logRemove } = require('../../services/storage');
            logRemove(date, logId);
            this.refreshAll();
            wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
          }
        },
      });
    }
  },

  /** 训练条目操作（编辑 / 删除） */
  onTrainAction(e: WechatMiniprogram.CustomEvent) {
    const { type, id: logId, name } = e.currentTarget.dataset as {
      type: 'edit' | 'remove';
      id: string;
      name: string;
    };
    const date = this.data.selectedDate;
    if (type === 'edit') {
      // 跳训练记录页，带 date 参数；进入后用 onShow 同步
      wx.navigateTo({ url: `/pages/training-log/training-log?date=${date}` });
      // 不在 data 页处理具体编辑逻辑，复用 training-log 的 onEditLog 即可
      wx.showToast({ title: '进入训练记录页，点该条「编辑」', icon: 'none', duration: 1800 });
    } else if (type === 'remove') {
      wx.showModal({
        title: '删除这组训练？',
        content: name ? `${name}\n该操作不可撤销` : undefined,
        confirmColor: '#E57B64',
        success: (r) => {
          if (r.confirm) {
            const { trainingLogRemove } = require('../../services/storage');
            trainingLogRemove(date, logId);
            this.refreshAll();
            wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
          }
        },
      });
    }
  },

  // ---- 快捷加水 / 改水 / 加训练 ----

  onAddWater() {
    const date = this.data.selectedDate;
    this.setData({ selectedWater: waterAdd(date, 250) });
  },

  onWaterLongPress() {
    const date = this.data.selectedDate;
    const cur = waterOf(date);
    const items: string[] = ['减 250ml'];
    if (cur > 0) items.push('清零');
    items.push('自定义…');
    wx.showActionSheet({
      itemList: items,
      success: (r) => {
        const tap = items[r.tapIndex];
        if (tap === '减 250ml') {
          this.setData({ selectedWater: waterSub(date, 250) });
        } else if (tap === '清零') {
          wx.showModal({
            title: '清零该日饮水？',
            content: `当前 ${cur}ml`,
            confirmColor: '#E57B64',
            success: (m) => {
              if (m.confirm) {
                waterReset(date);
                this.setData({ selectedWater: 0 });
              }
            },
          });
        } else {
          wx.showModal({
            title: '设置该日饮水',
            editable: true,
            placeholderText: '0-9999',
            content: `当前 ${cur}ml`,
            success: (res) => {
              if (!res.confirm) return;
              const raw = (res.content || '').trim();
              if (!/^\d{1,4}$/.test(raw)) {
                wx.showToast({ title: '请输入合法整数', icon: 'none' });
                return;
              }
              this.setData({ selectedWater: waterSet(date, parseInt(raw, 10)) });
            },
          });
        }
      },
    });
  },

  // ---- 快捷添加 ----

  onAddFood() {
    const date = this.data.selectedDate;
    if (date > this.data.today) {
      wx.showToast({ title: '不能补登未来日期', icon: 'none' });
      return;
    }
    wx.showActionSheet({
      itemList: ['🔍 从数据库选', '✏️ 手动录入'],
      success: (r) => {
        if (r.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/food-search/food-search?date=${date}` });
        } else {
          wx.navigateTo({ url: `/pages/food-edit/food-edit?date=${date}&source=custom` });
        }
      },
    });
  },

  onAddTrain() {
    const date = this.data.selectedDate;
    if (date > this.data.today) {
      wx.showToast({ title: '不能补登未来日期', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/training-log/training-log?date=${date}` });
  },

  /** 防止 food-card 编辑时把 user 食物误存进库（与 index 行为对齐：编辑已有记录不入库） */
  noop() {
    void foodUserUpsert;
  },
});
