/**
 * 每日目标设置 · Mifflin-St Jeor 计算 + 手动微调
 * 流程：填 6 个身体档案字段 → 实时算出预览 → 保存后写入 storage
 */
import { calcDetail, calcTargets } from '../../services/goal';
import {
  bodyGet,
  bodySet,
  profileSet,
  todayStr,
  weightUpsert,
  weightsAll,
} from '../../services/storage';
import { ACTIVITY_LABEL, ActivityLevel, BodyProfile, GOAL_LABEL, Goal, Sex } from '../../services/types';

Page({
  data: {
    // 身体档案输入
    sex: 'male' as Sex,
    sexOptions: ['男', '女'],
    sexIndex: 0,
    age: 30,
    heightCm: 175,
    weightKg: 70,
    activity: 'moderate' as ActivityLevel,
    activityOptions: Object.values(ACTIVITY_LABEL),
    activityIndex: 2,
    goal: 'maintain' as Goal,
    goalOptions: Object.values(GOAL_LABEL),
    goalIndex: 1,
    // 计算预览
    bmr: 0,
    tdee: 0,
    targetKcal: 0,
    // 算出的 UserProfile（保存时落盘）
    computed: {
      calorieTarget: 0,
      proteinTarget: 0,
      carbsTarget: 0,
      fatTarget: 0,
      fiberTarget: 25,
      waterTargetMl: 0,
      giRemindOn: true,
    },
  },

  onLoad() {
    const body = bodyGet();
    if (body) {
      this.setData({
        sex: body.sex,
        sexIndex: body.sex === 'male' ? 0 : 1,
        age: body.age,
        heightCm: body.heightCm,
        weightKg: body.weightKg,
        activity: body.activity,
        activityIndex: Object.keys(ACTIVITY_LABEL).indexOf(body.activity as string),
        goal: body.goal,
        goalIndex: Object.keys(GOAL_LABEL).indexOf(body.goal as string),
      });
    }
    this.recompute();
  },

  onPickerSex(e: WechatMiniprogram.PickerChange) {
    const i = Number(e.detail.value);
    this.setData({ sexIndex: i, sex: i === 0 ? 'male' : 'female' }, () => this.recompute());
  },

  onPickerActivity(e: WechatMiniprogram.PickerChange) {
    const i = Number(e.detail.value);
    const keys = Object.keys(ACTIVITY_LABEL) as ActivityLevel[];
    this.setData({ activityIndex: i, activity: keys[i] }, () => this.recompute());
  },

  onPickerGoal(e: WechatMiniprogram.PickerChange) {
    const i = Number(e.detail.value);
    const keys = Object.keys(GOAL_LABEL) as Goal[];
    this.setData({ goalIndex: i, goal: keys[i] }, () => this.recompute());
  },

  onAge(e: WechatMiniprogram.Input) {
    const v = parseInt((e.detail.value || '').trim(), 10);
    if (!Number.isFinite(v)) return;
    this.setData({ age: v }, () => this.recompute());
  },
  onHeight(e: WechatMiniprogram.Input) {
    const v = parseInt((e.detail.value || '').trim(), 10);
    if (!Number.isFinite(v)) return;
    this.setData({ heightCm: v }, () => this.recompute());
  },
  onWeight(e: WechatMiniprogram.Input) {
    const v = parseFloat(e.detail.value);
    if (!Number.isFinite(v)) return;
    this.setData({ weightKg: v }, () => this.recompute());
  },

  /** 重新计算 BMR / TDEE / 目标 */
  recompute() {
    const body: BodyProfile = {
      sex: this.data.sex,
      age: this.data.age,
      heightCm: this.data.heightCm,
      weightKg: this.data.weightKg,
      activity: this.data.activity,
      goal: this.data.goal,
    };
    const detail = calcDetail(body);
    const targets = calcTargets(body);
    this.setData({
      bmr: detail.bmr,
      tdee: detail.tdee,
      targetKcal: detail.target,
      computed: targets,
    });
  },

  /** 保存：写身体档案 + 算出的 UserProfile + 可选同步今日体重 */
  onSave() {
    const age = this.data.age;
    const h = this.data.heightCm;
    const w = this.data.weightKg;
    if (age < 10 || age > 100) return wx.showToast({ title: '年龄 10-100', icon: 'none' });
    if (h < 100 || h > 230) return wx.showToast({ title: '身高 100-230cm', icon: 'none' });
    if (w < 30 || w > 200) return wx.showToast({ title: '体重 30-200kg', icon: 'none' });

    const body: BodyProfile = {
      sex: this.data.sex,
      age,
      heightCm: h,
      weightKg: w,
      activity: this.data.activity,
      goal: this.data.goal,
    };
    bodySet(body);
    profileSet(this.data.computed);

    // 如果用户没记过体重，顺便记录今天体重（本地时区，不用 toISOString/UTC）
    const ws = weightsAll();
    const today = todayStr();
    if (!ws.find((x) => x.date === today)) {
      weightUpsert({ date: today, weightKg: w });
    }

    wx.showToast({ title: '已保存 ✅ 目标已更新', icon: 'none', duration: 1500 });
    setTimeout(() => wx.navigateBack(), 800);
  },
});