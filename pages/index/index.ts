import { adjustedTargets, TRAIN_DAY_KCAL, TRAIN_DAY_PROTEIN } from '../../services/goal';
import { dailyStats, DailyStats } from '../../services/nutrition';
import {
  currentWeightKg,
  genId,
  logAdd,
  logRemove,
  logsOfDay,
  profileGet,
  todayStr,
  visionCfgGet,
  visionKeyGet,
  waterAdd,
  waterOf,
  waterSub,
  waterSet,
  waterReset,
} from '../../services/storage';
import { isTrainedToday, kcalForDay, dayTrainingLogs, setTrainingDone } from '../../services/training';
import { MealLog, MealType, MEAL_LABEL, UserProfile } from '../../services/types';
import { compressImage, fileToBase64, recognizeMeal, setRecogDraft } from '../../services/vision';

interface MealGroup {
  key: MealType;
  label: string;
  logs: MealLog[];
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

Page({
  data: {
    date: '',
    stats: null as DailyStats | null,
    profile: null as UserProfile | null,
    trained: false,
    meals: [] as MealGroup[],
    water: 0,
    sheetShow: false,
  },
  // 非 data 字段（不参与渲染）今日训练日志缓存
  _todayLogsCache: [] as ReturnType<typeof dayTrainingLogs>,

  onShow() {
    this.refresh();
  },

  refresh() {
    const date = todayStr();
    const logs = logsOfDay(date);
    const groups: MealGroup[] = MEAL_ORDER.map((k) => ({
      key: k,
      label: MEAL_LABEL[k],
      logs: logs.filter((l) => l.meal === k),
    }));
    const trained = isTrainedToday(date);
    const baseProfile = profileGet();
    const profile = adjustedTargets(baseProfile, trained);
    // 缓存今日训练日志，供 onToggleTrain 计算消耗用
    this._todayLogsCache = dayTrainingLogs(date);
    this.setData({
      date,
      profile,
      trained,
      stats: dailyStats(logs),
      meals: groups,
      water: waterOf(date),
    });
  },

  /** T17 训练日打卡 / 取消打卡 */
  onToggleTrain() {
    const date = this.data.date;
    const next = !this.data.trained;
    setTrainingDone(date, next);
    this.refresh();
    if (next) {
      // T19 同步显示今日训练消耗
      const bodyWeight = currentWeightKg();
      const burn = kcalForDay(this._todayLogsCache || [], bodyWeight);
      wx.showToast({
        title: `打卡成功 +${TRAIN_DAY_KCAL} kcal 🔥消耗 ${burn} kcal`,
        icon: 'none',
        duration: 2400,
      });
    } else {
      wx.showToast({ title: '已取消打卡', icon: 'none' });
    }
  },

  goTraining() {
    wx.navigateTo({ url: '/pages/training/training' });
  },

  openSheet() {
    this.setData({ sheetShow: true });
  },
  closeSheet() {
    this.setData({ sheetShow: false });
  },

  onChooseEntry(e: WechatMiniprogram.CustomEvent) {
    const type = e.detail.type as string;
    this.setData({ sheetShow: false });
    if (type === 'photo') {
      this.startPhoto();
    } else if (type === 'search') {
      wx.navigateTo({ url: `/pages/food-search/food-search?date=${this.data.date}` });
    } else {
      wx.navigateTo({
        url: `/pages/food-edit/food-edit?date=${this.data.date}&source=custom`,
      });
    }
  },

  /** T11：拍照识别主链路 compress → base64 → MiniMax → 草稿 → food-edit */
  async startPhoto() {
    const cfg = visionCfgGet();
    const apiKey = visionKeyGet();
    if (!cfg || !apiKey) {
      wx.showModal({
        title: '先用 AI 识别，需要配置服务',
        content: '去「我的 → AI 识别设置」填入 MiniMax API Key（仅存本机）',
        confirmText: '去配置',
        success: (r) => {
          if (r.confirm) wx.navigateTo({ url: '/pages/vision-settings/vision-settings' });
        },
      });
      return;
    }

    try {
      const chosen = await new Promise<WechatMiniprogram.ChooseMediaSuccessCallbackResult>(
        (resolve, reject) =>
          wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['camera', 'album'],
            sizeType: ['compressed'],
            success: resolve,
            fail: reject,
          }),
      );
      const src = chosen.tempFiles[0].tempFilePath;
      wx.showLoading({ title: 'AI 识别中…', mask: true });

      const compressed = await compressImage(src);
      const b64 = await fileToBase64(compressed);
      const result = await recognizeMeal(
        { baseUrl: cfg.baseUrl, model: cfg.model },
        apiKey,
        b64,
      );
      wx.hideLoading();

      setRecogDraft(result.items, result.confidence);
      if (result.confidence < 0.6) {
        wx.showToast({ title: 'AI 不太确定，请逐项核对', icon: 'none', duration: 2000 });
      }
      wx.navigateTo({
        url: `/pages/food-edit/food-edit?date=${this.data.date}&source=photo&draftIdx=0`,
      });
    } catch (e) {
      wx.hideLoading();
      // 用户取消选图不提示
      const emsg = (e as { errMsg?: string })?.errMsg || '';
      if (emsg.includes('cancel')) return;
      wx.showModal({
        title: '识别失败',
        content: (e as Error)?.message || '请重试或手动录入',
        confirmText: '手动录入',
        cancelText: '重试',
        success: (r) => {
          if (r.confirm) {
            wx.navigateTo({ url: `/pages/food-edit/food-edit?date=${this.data.date}&source=custom` });
          } else {
            this.startPhoto();
          }
        },
      });
    }
  },

  onAddWater() {
    const date = this.data.date;
    this.setData({ water: waterAdd(date, 250) });
  },

  /** 长按喝水卡：弹出减水 / 自定义 / 清零选项 */
  onWaterLongPress() {
    const date = this.data.date;
    const cur = waterOf(date);
    const items: string[] = ['减 250ml'];
    if (cur > 0) items.push('清零今日');
    items.push('自定义输入…');

    wx.showActionSheet({
      itemList: items,
      success: (r) => {
        const tap = items[r.tapIndex];
        if (tap === '减 250ml') {
          this.setData({ water: waterSub(date, 250) });
        } else if (tap === '清零今日') {
          wx.showModal({
            title: '清零今日饮水？',
            content: `当前 ${cur}ml 将被清零`,
            confirmColor: '#E57B64',
            success: (m) => {
              if (m.confirm) {
                waterReset(date);
                this.setData({ water: 0 });
              }
            },
          });
        } else if (tap === '自定义输入…') {
          this.onWaterCustomInput();
        }
      },
    });
  },

  /** 自定义输入今日饮水 ml */
  onWaterCustomInput() {
    const date = this.data.date;
    const cur = waterOf(date);
    wx.showModal({
      title: '修改今日饮水',
      editable: true,
      placeholderText: '请输入 ml（0-9999）',
      content: `当前 ${cur}ml`,
      confirmText: '保存',
      success: (r) => {
        if (!r.confirm) return;
        const raw = (r.content || '').trim();
        if (!/^\d{1,4}$/.test(raw)) {
          wx.showToast({ title: '请输入合法整数', icon: 'none' });
          return;
        }
        const ml = parseInt(raw, 10);
        if (ml > 9999) {
          wx.showToast({ title: '不能超过 9999ml', icon: 'none' });
          return;
        }
        this.setData({ water: waterSet(date, ml) });
      },
    });
  },

  onItemTap(e: WechatMiniprogram.CustomEvent) {
    const log = e.detail.log as MealLog;
    wx.showActionSheet({
      itemList: [`编辑「${log.nameSnapshot}」`, '删除'],
      itemColor: '#386641',
      success: (r) => {
        if (r.tapIndex === 0) this.doEdit(log);
        else this.doRemove(log);
      },
    });
  },

  onItemEdit(e: WechatMiniprogram.CustomEvent) {
    this.doEdit(e.detail.log as MealLog);
  },

  doEdit(log: MealLog) {
    wx.navigateTo({
      url: `/pages/food-edit/food-edit?date=${log.date}&editLogId=${log.id}`,
    });
  },

  onItemRemove(e: WechatMiniprogram.CustomEvent) {
    this.doRemove(e.detail.log as MealLog);
  },

  doRemove(log: MealLog) {
    wx.showModal({
      title: '删除这条记录？',
      content: log.nameSnapshot,
      confirmColor: '#E57B64',
      success: (r) => {
        if (r.confirm) {
          logRemove(log.date, log.id);
          this.refresh();
        }
      },
    });
  },
});
