/** 基础任务类型配置；界面快捷选择和演示数据共用。 */
export interface CategoryPreset {
  name: string
  color: string
}

export const DEFAULT_CATEGORIES: CategoryPreset[] = [
  { name: '课程', color: '#d97706' },
  { name: '科研', color: '#7c3aed' },
  { name: '会议', color: '#2563eb' },
  { name: '生活', color: '#0d9488' },
  { name: '任务', color: '#16a34a' },
  { name: '工作', color: '#4f46e5' },
  { name: '运动', color: '#dc2626' },
  { name: '休息', color: '#64748b' },
]
