import { foodsUserAll, foodUserRemove } from '../../services/storage';
import { Food } from '../../services/types';
import { giLevel } from '../../services/nutrition';

interface Row extends Food {
  giCls: string;
  giText: string;
}

const GI_LABELS: Record<string, string> = { low: '低GI', mid: '中GI', high: '高GI', none: '暂无' };

Page({
  data: {
    rows: [] as Row[],
    total: 0, // 顶部统计用
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const rows = foodsUserAll().map((f: Food) => {
      const lv = giLevel(f.gi);
      const key = lv ?? 'none';
      return {
        ...f,
        giCls: `gb-${key}`,
        giText: f.gi != null ? `${GI_LABELS[key]} ${f.gi}` : GI_LABELS.none,
      };
    });
    this.setData({ rows, total: rows.length });
  },

  /** 点条目 → 编辑（复用 food-edit，改完返回 onShow 刷新） */
  onPick(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.navigateTo({
      url: `/pages/food-edit/food-edit?source=user&foodId=${id}&from=myfoods`,
    });
  },

  /** 新建自定义食物 */
  onAdd() {
    wx.navigateTo({ url: '/pages/food-edit/food-edit?source=custom' });
  },

  onDelete(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const name = (e.currentTarget.dataset.name as string) || '';
    wx.showModal({
      title: '删除这个自定义食物？',
      content: name,
      confirmText: '删除',
      confirmColor: '#E57B64',
      success: (r) => {
        if (r.confirm) {
          foodUserRemove(id);
          this.refresh();
          wx.showToast({ title: '已删除', icon: 'none' });
        }
      },
    });
  },
});
