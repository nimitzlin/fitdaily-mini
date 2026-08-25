/**
 * meal-section 餐次分组（折叠）
 * props: meal (MealType), logs (MealLog[]), expanded 默认true
 * events: 透传 food-card 的 tap/edit/remove（附带 meal）
 */
Component({
  properties: {
    meal: { type: String, value: 'breakfast' },
    label: { type: String, value: '' },
    logs: { type: Array, value: [] },
    expanded: { type: Boolean, value: true },
  },
  data: {
    open: true,
    kcal: 0,
  },
  lifetimes: {
    attached() {
      this.setData({ open: this.data.expanded });
    },
  },
  observers: {
    logs(logs: Array<{ intake: { calories: number } }>) {
      const kcal = (logs || []).reduce((s, l) => s + (l.intake?.calories || 0), 0);
      this.setData({ kcal: Math.round(kcal * 10) / 10 });
    },
  },
  methods: {
    toggle() {
      this.setData({ open: !this.data.open });
    },
    reemit(name: string, e: WechatMiniprogram.CustomEvent) {
      this.triggerEvent(name, { ...e.detail, meal: this.data.meal });
    },
    onTap(e: WechatMiniprogram.CustomEvent) {
      this.reemit('itemtap', e);
    },
    onEdit(e: WechatMiniprogram.CustomEvent) {
      this.reemit('itemedit', e);
    },
    onRemove(e: WechatMiniprogram.CustomEvent) {
      this.reemit('itemremove', e);
    },
  },
});
