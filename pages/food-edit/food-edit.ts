import { giLevel, macroCalorieGap, scale } from '../../services/nutrition';
import {
  findFoodById,
  foodUserUpsert,
  genId,
  logAdd,
  logUpdate,
  logsOfDay,
  recentFoodsAdd,
  todayStr,
} from '../../services/storage';
import { consumeDraftItem, getRecogDraft } from '../../services/vision';
import { matchCandidates, MatchCandidate } from '../../services/vision-match';
import { RecogItem } from '../../services/types-vision';
import { Food, MealLog, MealType, Nutrition } from '../../services/types';

const MEALS: Array<{ key: MealType; label: string }> = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '加餐' },
];

/** AI 返回「该份」营养 → 反推每100g 口径（表单口径） */
function per100From(total: number | null, weightG: number | undefined): string {
  const w = weightG && weightG > 0 ? weightG : 100;
  if (total == null) return '0';
  return `${Math.round((total / w) * 1000) / 10}`;
}

/** 按当前时间猜餐次 */
function guessMealIndex(): number {
  const h = new Date().getHours();
  const key: MealType = h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
  return MEALS.findIndex((m) => m.key === key);
}

Page({
  data: {
    date: '',
    editLogId: '',
    /** 编辑已有记录时，先取回原记录 */
    editingLog: null as MealLog | null,
    name: '',
    weight: '100',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    gi: '',
    lowGiSwitch: false,
    meal: 'lunch' as MealType,
    meals: MEALS,
    mealIndex: 1,
    giCls: 'gb-none',
    giLabel: '暂无数据',
    warnText: '',
    pickedFoodId: '',
    draftIdx: -1,
    aiBanner: '',
    candidates: [] as Array<{ id: string; name: string; calories: number; source: string; totalScore: number; protein: number; carbs: number; fat: number; fiber: number | null; gi: number | null }>,
    showCandidates: false,
  } as Record<string, any>,

  onLoad(query: Record<string, string | undefined>) {
    const date = query.date || todayStr();
    const data: Record<string, any> = { date };

    if (query.editLogId) {
      const log = logsOfDay(date).find((l) => l.id === query.editLogId);
      if (log) {
        Object.assign(data, this.logToForm(log), { editLogId: log.id, editingLog: log });
      }
    }
    if (query.source === 'search' && query.foodId) {
      // T7 搜索选中：预填该食物，份量默认100g
      const food = findFoodById(query.foodId);
      if (food) {
        Object.assign(data, {
          name: food.name,
          weight: '100',
          calories: `${food.per100.calories}`,
          protein: `${food.per100.protein}`,
          carbs: `${food.per100.carbs}`,
          fat: `${food.per100.fat}`,
          fiber: food.per100.fiber == null ? '' : `${food.per100.fiber}`,
          gi: food.gi == null ? '' : `${food.gi}`,
          lowGiSwitch: food.gi != null && food.gi <= 55,
          pickedFoodId: food.id,
        });
      }
    }
    if (query.source === 'user' && query.foodId) {
      // T9 从我的食物库进入：编辑自定义食物本身（不入餐记录，保存回库）
      const food = findFoodById(query.foodId);
      if (food) {
        Object.assign(data, {
          name: food.name,
          weight: '100',
          calories: `${food.per100.calories}`,
          protein: `${food.per100.protein}`,
          carbs: `${food.per100.carbs}`,
          fat: `${food.per100.fat}`,
          fiber: food.per100.fiber == null ? '' : `${food.per100.fiber}`,
          gi: food.gi == null ? '' : `${food.gi}`,
          lowGiSwitch: food.gi != null && food.gi <= 55,
          pickedFoodId: food.id,
          fromMyFoods: true,
        });
      }
    }
    if (query.source === 'photo') {
      // T11 AI 识别草稿预填；保存时消费草稿，多菜品逐条确认
      const idx = parseInt(query.draftIdx || '0', 10) || 0;
      const draft = getRecogDraft();
      if (draft && draft.items[idx]) {
        const it: RecogItem = draft.items[idx];
        Object.assign(data, {
          name: it.name,
          weight: `${Math.max(1, Math.round(it.weight_g || 100))}`,
          // AI 返回的是「该份」营养 → 反推每100g 口径填表
          calories: `${per100From(it.calories, it.weight_g)}`,
          protein: `${per100From(it.protein, it.weight_g)}`,
          carbs: `${per100From(it.carbs, it.weight_g)}`,
          fat: `${per100From(it.fat, it.weight_g)}`,
          fiber: it.fiber == null ? '' : `${per100From(it.fiber, it.weight_g)}`,
          gi: it.gi_guess == null ? '' : `${it.gi_guess}`,
          lowGiSwitch: it.gi_guess != null && (it.gi_guess as number) <= 55,
          draftIdx: idx,
          aiBanner:
            draft.confidence < 0.6
              ? '⚠️ AI 对这餐不太确定，请逐项核对后保存'
              : '🤖 AI 预填，确认或修改后保存',
          mealIndex: guessMealIndex(),
        });

        // T21: OCR 后智能匹配数据库候选
        const cs = matchCandidates(it, 3);
        if (cs.length > 0) {
          Object.assign(data, {
            candidates: cs.map((c) => ({
              id: c.food.id,
              name: c.food.name,
              calories: c.food.per100.calories,
              protein: c.food.per100.protein,
              carbs: c.food.per100.carbs,
              fat: c.food.per100.fat,
              fiber: c.food.per100.fiber,
              gi: c.food.gi,
              source: c.food.source,
              totalScore: c.totalScore,
            })),
            showCandidates: true,
          });
        }
      }
    }
    if (!data.mealIndex) {
      Object.assign(data, {
        meal: MEALS[guessMealIndex()].key,
        mealIndex: guessMealIndex(),
      });
    }
    this.setData(data);
    this.refreshGi();
  },

  logToForm(log: MealLog): Record<string, any> {
    // 记录存的是换算后 intake；反推 per100 口径填表（按记录份量）
    const k = log.weight > 0 ? log.weight : 100;
    const inv = (v: number) => Math.round((v / k) * 1000) / 10;
    return {
      name: log.nameSnapshot,
      weight: `${log.weight}`,
      calories: `${inv(log.intake.calories)}`,
      protein: `${inv(log.intake.protein)}`,
      carbs: `${inv(log.intake.carbs)}`,
      fat: `${inv(log.intake.fat)}`,
      fiber: log.intake.fiber == null ? '' : `${inv(log.intake.fiber)}`,
      gi: log.gi == null ? '' : `${log.gi}`,
      lowGiSwitch: log.gi != null && log.gi <= 55,
      mealIndex: MEALS.findIndex((m) => m.key === log.meal),
    };
  },

  onInput(e: WechatMiniprogram.CustomEvent) {
    const field = e.currentTarget.dataset.field as string;
    this.setData({ [field]: e.detail.value } as Record<string, unknown>);
    if (field === 'gi') this.refreshGi();
    if (['calories', 'protein', 'carbs', 'fat'].includes(field)) this.checkMacro();
  },

  onPickMeal(e: WechatMiniprogram.PickerChange) {
    const i = Number(e.detail.value);
    this.setData({ mealIndex: i, meal: MEALS[i].key });
  },

  onLowGiChange(e: WechatMiniprogram.SwitchChange) {
    this.setData({ lowGiSwitch: e.detail.value });
  },

  /** T21: 采用数据库候选食物的精确数据 */
  onPickCandidate(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const c = this.data.candidates.find((x: { id: string }) => x.id === id);
    if (!c) return;
    this.setData({
      name: c.name,
      calories: `${c.calories}`,
      protein: `${c.protein}`,
      carbs: `${c.carbs}`,
      fat: `${c.fat}`,
      fiber: c.fiber == null ? '' : `${c.fiber}`,
      gi: c.gi == null ? '' : `${c.gi}`,
      lowGiSwitch: c.gi != null && c.gi <= 55,
      pickedFoodId: c.id,
      showCandidates: false,
    } as Record<string, unknown>);
    this.refreshGi();
    this.checkMacro();
    wx.showToast({ title: `已采用「${c.name}」数据`, icon: 'success', duration: 1500 });
  },

  /** 关闭候选卡（用户保留 AI 识别值） */
  onDismissCandidates() {
    this.setData({ showCandidates: false });
  },

  refreshGi() {
    const v = parseInt(this.data.gi, 10);
    const lv = isNaN(v) ? null : giLevel(v);
    const key = lv ?? 'none';
    const labelMap: Record<string, string> = { low: '低GI', mid: '中GI', high: '高GI', none: '暂无数据' };
    this.setData({
      giCls: `gb-${key}`,
      giLabel: isNaN(v) ? '暂无数据' : `${labelMap[key]} ${v}`,
    });
  },

  checkMacro() {
    const n: Nutrition = {
      calories: parseFloat(this.data.calories) || 0,
      protein: parseFloat(this.data.protein) || 0,
      carbs: parseFloat(this.data.carbs) || 0,
      fat: parseFloat(this.data.fat) || 0,
      fiber: null,
    };
    const gap = macroCalorieGap(n);
    this.setData({
      warnText:
        gap > 0.3 && n.calories > 0
          ? '营养素折算热量与填写热量差距较大，请核对'
          : '',
    });
  },

  formToFood(): Food | null {
    const name = (this.data.name || '').trim();
    if (!name) return null;
    return {
      id: this.data.pickedFoodId || genId('f'),
      name,
      // T22.1: source 准确传递（之前都设成 'builtin'，cfc/user 都丢失源信息）
      //   - search 选中 → 查 findFoodById 拿原始 source（builtin/cfc/user）
      //   - my-foods 编辑 → user
      //   - OCR / 手动 / +号 → user（全新自定义）
      source: this.resolveSource(),
      category: '其他',
      unit: 'g',
      per100: {
        calories: parseFloat(this.data.calories) || 0,
        protein: parseFloat(this.data.protein) || 0,
        carbs: parseFloat(this.data.carbs) || 0,
        fat: parseFloat(this.data.fat) || 0,
        fiber: this.data.fiber === '' ? null : parseFloat(this.data.fiber),
      },
      gi: this.data.gi === '' ? null : parseInt(this.data.gi, 10),
    };
  },

  /** T22.1: 准确推断 source
   *  原则：
   *   - pickedFoodId 有值 + 能查到原食物 → 用原 source（cfc/builtin/user 都保留）
   *   - pickedFoodId 有值 + 查不到（极端情况）→ 退回 user（避免损坏数据）
   *   - pickedFoodId 空（OCR/手动/+号）→ user
   */
  resolveSource(): 'builtin' | 'cfc' | 'user' {
    const pid = this.data.pickedFoodId;
    if (pid) {
      const f = findFoodById(pid);
      if (f) return f.source;
    }
    return 'user';
  },

  onSave() {
    const food = this.formToFood();
    if (!food) {
      wx.showToast({ title: '请填写食物名称', icon: 'none' });
      return;
    }
    if (!(parseFloat(this.data.calories) >= 0) || this.data.calories === '') {
      wx.showToast({ title: '请填写热量', icon: 'none' });
      return;
    }

    // 从我的食物库进来：只更新库，不写餐记录
    if (this.data.fromMyFoods) {
      foodUserUpsert(food);
      wx.showToast({ title: '已保存到我的食物库 ✅', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 500);
      return;
    }

    const weight = Math.max(1, parseFloat(this.data.weight) || 100);

    // 仅用户自建（无 pickedFoodId）才入「我的食物库」；内置/编辑记录不动库
    if (food.source === 'user' && !this.data.editLogId) foodUserUpsert(food);

    // 组装记录（per100 × weight 换算）
    const intake = scale(food.per100, weight);
    const log: MealLog = {
      id: this.data.editLogId || genId('log'),
      date: this.data.date,
      meal: MEALS[this.data.mealIndex].key,
      foodId: food.id,
      nameSnapshot: food.name,
      weight,
      intake,
      gi: food.gi,
      source: this.data.editLogId ? (this.data.editingLog?.source ?? 'custom') : 'custom',
      createdAt: this.data.editingLog?.createdAt ?? Date.now(),
    };
    if (this.data.editLogId) logUpdate(log);
    else {
      logAdd(log);
      // T20.2: 记录食物到「最近用过」列表，供 food-search 智能排序
      if (food.id) recentFoodsAdd(food.id);
    }

    // T11：来源是 AI 草稿 → 消费该项，还有剩余则继续确认下一道
    if (this.data.draftIdx >= 0) {
      const remain = consumeDraftItem(this.data.draftIdx);
      if (remain > 0) {
        wx.showToast({ title: `已记录，还有 ${remain} 道`, icon: 'none' });
        wx.redirectTo({
          url: `/pages/food-edit/food-edit?date=${this.data.date}&source=photo&draftIdx=0`,
        });
        return;
      }
      wx.showToast({ title: '本餐全部记录 ✅', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 2 }), 600);
      return;
    }

    wx.showToast({ title: '已记录 ✅', icon: 'none' });
    setTimeout(() => wx.navigateBack(), 500);
  },
});
