import type { DayTemplate } from '../types';

/** 张瑞的默认 4 分化训练计划 */
export const DEFAULT_PLAN: DayTemplate[] = [
  {
    id: 'day1',
    label: 'Day 1',
    title: '胸 · 三头',
    time: '约 80 分钟',
    warmup: '快走 5 分钟 → 肩袖激活 2 组 → 空杆卧推 2×15',
    exercises: [
      { id: 'd1e1', name: '杠铃平板卧推', sets: 5, reps: '8', weight: 70, step: 2.5, tip: '主项 · 组间休息 3 分钟', unit: 'kg', order: 1 },
      { id: 'd1e2', name: '上斜哑铃卧推', sets: 3, reps: '10', weight: 22.5, step: 2.5, tip: '上胸 · 斜板 30°', unit: 'kg', order: 2 },
      { id: 'd1e3', name: '双杠臂屈伸 / 下斜卧推', sets: 3, reps: '10', weight: 0, step: 5, tip: '下胸 · 自重填 0', unit: 'bodyweight', order: 3 },
      { id: 'd1e4', name: '绳索夹胸', sets: 3, reps: '12', weight: 15, step: 2.5, tip: '中缝 · 离心控制', unit: 'kg', order: 4 },
      { id: 'd1e5', name: '窄距卧推', sets: 3, reps: '10', weight: 50, step: 2.5, tip: '三头主导', unit: 'kg', order: 5 },
      { id: 'd1e6', name: '绳索下压', sets: 3, reps: '12', weight: 20, step: 2.5, tip: '肘部固定', unit: 'kg', order: 6 },
    ],
  },
  {
    id: 'day2',
    label: 'Day 2',
    title: '背 · 二头',
    time: '约 80 分钟',
    warmup: '划船机 5 分钟 → 弹力带下拉 2×15 → 空杆划船 2×12',
    exercises: [
      { id: 'd2e1', name: '引体向上', sets: 4, reps: '8', weight: 0, step: 2.5, tip: '垂直拉主项 · 可负重', unit: 'bodyweight', order: 1 },
      { id: 'd2e2', name: 'T 杠划船', sets: 4, reps: '10', weight: 50, step: 2.5, tip: '水平拉主项', unit: 'kg', order: 2 },
      { id: 'd2e3', name: '高位下拉', sets: 3, reps: '10', weight: 60, step: 5, tip: '宽握', unit: 'kg', order: 3 },
      { id: 'd2e4', name: '坐姿绳索划船', sets: 3, reps: '10', weight: 55, step: 5, tip: '肩胛后缩', unit: 'kg', order: 4 },
      { id: 'd2e5', name: '单臂哑铃划船', sets: 3, reps: '10', weight: 30, step: 2.5, tip: '每侧', unit: 'kg', order: 5 },
      { id: 'd2e6', name: '杠铃弯举', sets: 3, reps: '10', weight: 30, step: 2.5, tip: '二头', unit: 'kg', order: 6 },
      { id: 'd2e7', name: '锤式弯举', sets: 3, reps: '12', weight: 12, step: 2, tip: '肱肌', unit: 'kg', order: 7 },
    ],
  },
  {
    id: 'day3',
    label: 'Day 3',
    title: '腿',
    time: '约 80 分钟',
    warmup: '椭圆机 6 分钟 → 空杆深蹲 2×12 → 髋部动态拉伸',
    exercises: [
      { id: 'd3e1', name: '杠铃深蹲', sets: 5, reps: '6', weight: 80, step: 5, tip: '主项', unit: 'kg', order: 1 },
      { id: 'd3e2', name: '罗马尼亚硬拉', sets: 4, reps: '8', weight: 60, step: 5, tip: '腘绳肌', unit: 'kg', order: 2 },
      { id: 'd3e3', name: '腿举', sets: 3, reps: '10', weight: 120, step: 10, tip: '股四头', unit: 'kg', order: 3 },
      { id: 'd3e4', name: '坐姿腿弯举', sets: 3, reps: '12', weight: 40, step: 5, tip: '腘绳肌孤立', unit: 'kg', order: 4 },
      { id: 'd3e5', name: '腿屈伸', sets: 3, reps: '12', weight: 45, step: 5, tip: '股四头孤立', unit: 'kg', order: 5 },
      { id: 'd3e6', name: '站姿提踵', sets: 4, reps: '15', weight: 60, step: 5, tip: '小腿', unit: 'kg', order: 6 },
    ],
  },
  {
    id: 'day4',
    label: 'Day 4',
    title: '肩 · 核心',
    time: '约 75 分钟',
    warmup: '快走 5 分钟 → 弹力带外旋 2×15 → 空杆推举 2×12',
    exercises: [
      { id: 'd4e1', name: '站姿杠铃推举', sets: 4, reps: '8', weight: 40, step: 2.5, tip: '主项', unit: 'kg', order: 1 },
      { id: 'd4e2', name: '哑铃侧平举', sets: 4, reps: '12', weight: 10, step: 2, tip: '中束', unit: 'kg', order: 2 },
      { id: 'd4e3', name: '哑铃前平举', sets: 3, reps: '12', weight: 10, step: 2, tip: '前束', unit: 'kg', order: 3 },
      { id: 'd4e4', name: '面拉', sets: 3, reps: '15', weight: 25, step: 2.5, tip: '后束', unit: 'kg', order: 4 },
      { id: 'd4e5', name: '反向飞鸟', sets: 3, reps: '12', weight: 8, step: 2, tip: '后束', unit: 'kg', order: 5 },
      { id: 'd4e6', name: '悬垂举腿', sets: 3, reps: '15', weight: 0, step: 5, tip: '腹直肌', unit: 'bodyweight', order: 6 },
      { id: 'd4e7', name: '绳索卷腹', sets: 3, reps: '15', weight: 20, step: 2.5, tip: '腹直肌', unit: 'kg', order: 7 },
    ],
  },
];

/** 每次都返回一份深拷贝，避免外部改动污染默认计划 */
export function cloneDefaultPlan(): DayTemplate[] {
  return DEFAULT_PLAN.map((day) => ({
    ...day,
    exercises: day.exercises.map((exercise) => ({ ...exercise })),
  }));
}
