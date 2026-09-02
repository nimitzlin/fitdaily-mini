import {
  highGiFoodsThisWeek,
  mondayOf,
  weekAverages,
  weekAvgGi,
  weekDailySummaries,
  weekTrainingSummary,
  WeekAverages,
  WeekTrainingSummary,
  DaySummary,
} from '../../services/stats';
import { profileGet } from '../../services/storage';
import { UserProfile } from '../../services/types';

Page({
  data: {
    startDate: '',
    endDate: '',
    profile: null as UserProfile | null,
    summaries: [] as DaySummary[],
    weekAvg: null as WeekAverages | null,
    weekGi: null as number | null,
    highGi: [] as { name: string; gi: number }[],
    // 计算后字段（用于模板直接渲染）
    calorieTarget: 0,
    proteinTarget: 0,
    carbsTarget: 0,
    fatTarget: 0,
    fiberTarget: 0,
    waterTargetMl: 0,
    maxKcal: 0, // 7 天中最大的摄入，用于柱状图归一化
    activeDays: 0,
    hasAnyLog: false,
    training: null as WeekTrainingSummary | null, // T19.2 缺口 A
    maxBurn: 0,
  },

  onShow() {
    this.recompute();
  },

  /** T22: 跳到数据补登页 */
  goData() {
    wx.navigateTo({ url: '/pages/data/data' });
  },

  recompute() {
    const start = mondayOf();
    const summaries = weekDailySummaries(start);
    const weekAvg = weekAverages(summaries);
    const weekGi = weekAvgGi(summaries);
    const highGi = highGiFoodsThisWeek(summaries);
    const profile = profileGet();
    const training = weekTrainingSummary(start);
    const maxBurn = Math.max(1, ...training.daily.map((d) => d.burn));
    const maxKcal = Math.max(profile.calorieTarget, ...summaries.map((s) => s.stats?.calories ?? 0));
    const hasAnyLog = summaries.some((s) => s.hasLog || s.waterMl > 0);

    this.setData({
      startDate: start,
      endDate: summaries[6].date,
      profile,
      summaries,
      weekAvg,
      weekGi,
      highGi,
      calorieTarget: profile.calorieTarget,
      proteinTarget: profile.proteinTarget,
      carbsTarget: profile.carbsTarget,
      fatTarget: profile.fatTarget,
      fiberTarget: profile.fiberTarget,
      waterTargetMl: profile.waterTargetMl,
      maxKcal,
      activeDays: weekAvg.activeDays,
      hasAnyLog,
      training,
      maxBurn,
    });
  },
});