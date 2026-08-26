import { foodsUserAll } from '../../services/storage';
import { ALL_FOODS } from '../../data/foods';
import { Food } from '../../services/types';
import { giLevel } from '../../services/nutrition';

interface Row extends Food {
  giCls: string;
  giText: string;
}

const CATS = ['全部', '主食', '肉蛋', '蔬果', '奶豆', '零食', '饮品', '其他'];
const GI_LABELS: Record<string, string> = { low: '低GI', mid: '中GI', high: '高GI', none: '暂无' };

// 列表页默认显示条数，避免一次性渲染 1751 条击穿小程序 setData 限制
const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_KEYWORD = 100; // 有搜索词时多显示一些（预期命中少）

function decorate(list: Food[]): Row[] {
  return list.map((f) => {
    const lv = giLevel(f.gi);
    const key = lv ?? 'none';
    return {
      ...f,
      giCls: `gb-${key}`,
      giText: f.gi != null ? `${GI_LABELS[key]} ${f.gi}` : GI_LABELS.none,
    };
  });
}

Page({
  data: {
    keyword: '',
    cats: CATS,
    catIndex: 0,
    rows: [] as Row[],
    myRows: [] as Row[],
    date: '',
    total: 0,       // 总命中条数
    shown: 0,       // 当前显示条数
    pageSize: PAGE_SIZE_DEFAULT,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({ date: query.date || '' });
    this.search();
  },

  search() {
    const kw = (this.data.keyword || '').trim().toLowerCase();
    const cat = this.data.cats[this.data.catIndex];

    // 我的食物库：搜索命中时置顶展示
    const my = foodsUserAll().filter((fd: Food) => !kw || fd.name.toLowerCase().includes(kw));

    let pool: Food[] =
      cat === '全部' ? ALL_FOODS : ALL_FOODS.filter((fd) => fd.category === cat);
    if (kw) pool = pool.filter((fd) => fd.name.toLowerCase().includes(kw));

    const pageSize = kw ? PAGE_SIZE_KEYWORD : PAGE_SIZE_DEFAULT;
    const slice = pool.slice(0, pageSize);

    this.setData({
      myRows: decorate(my.slice(0, 10)),
      rows: decorate(slice),
      total: pool.length,
      shown: slice.length,
      pageSize,
    });
  },

  /** 点击"加载更多" */
  onMore() {
    const next = this.data.rows.length + this.data.pageSize;
    const cat = this.data.cats[this.data.catIndex];
    const kw = (this.data.keyword || '').trim().toLowerCase();
    let pool: Food[] = cat === '全部' ? ALL_FOODS : ALL_FOODS.filter((fd) => fd.category === cat);
    if (kw) pool = pool.filter((fd) => fd.name.toLowerCase().includes(kw));
    const slice = pool.slice(0, next);
    this.setData({
      rows: decorate(slice),
      shown: slice.length,
    });
  },

  onKeyword(e: WechatMiniprogram.Input) {
    this.setData({ keyword: e.detail.value });
    this.search();
  },

  onCat(e: WechatMiniprogram.TouchEvent) {
    this.setData({ catIndex: Number(e.currentTarget.dataset.index) });
    this.search();
  },

  /** 选中食物 → 替换当前页为编辑页预填确认 */
  onPick(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    wx.redirectTo({
      url: `/pages/food-edit/food-edit?date=${this.data.date}&source=search&foodId=${id}`,
    });
  },
});
