/**
 * food-card 饮食记录条目
 * props: log (MealLog)
 * events: tap(整卡点击→详情), edit, remove
 */
Component({
  properties: {
    log: { type: Object, value: null },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { log: this.data.log });
    },
    onEdit(e: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('edit', { log: this.data.log });
    },
    onRemove() {
      const log = this.data.log as { nameSnapshot: string };
      wx.showModal({
        title: '删除这条记录？',
        content: log.nameSnapshot,
        confirmColor: '#E57B64',
        success: (r) => {
          if (r.confirm) this.triggerEvent('remove', { log: this.data.log });
        },
      });
    },
  },
});
