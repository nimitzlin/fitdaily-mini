/** 识别结果类型（vision 服务专用，避免与 UI 组件循环依赖） */
export interface RecogItem {
  name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  gi_guess: number | null;
}

export interface RecogResult {
  items: RecogItem[];
  confidence: number;
}
