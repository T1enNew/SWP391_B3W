// Trạng thái của item trong queue reviewer: mỗi trạng thái có label hiển thị và màu chấm
export const ITEM_STATUS = {
  pending_review:     { label: 'Chờ review',      dot: 'bg-yellow-400' },
  partially_reviewed: { label: 'Một phần',         dot: 'bg-orange-400' },
  fully_reviewed:     { label: 'Đã review xong',   dot: 'bg-emerald-400' },
  waiting_rework:     { label: 'Chờ sửa lại',      dot: 'bg-amber-400' },
  finalized:          { label: 'Đã finalize',       dot: 'bg-purple-400' },
};

export const SUBMISSION_STATUS = {
  pending:  { label: 'Cho review', color: 'bg-yellow-600' },
  approved: { label: 'Approved',   color: 'bg-emerald-600' },
  rejected: { label: 'Rejected',   color: 'bg-rose-600' },
};

// Danh mục lỗi khi reviewer reject bài, dùng trong dropdown chọn loại lỗi
export const FEEDBACK_CATEGORIES = [
  { value: 'incorrect_label',          label: 'Nhãn sai' },
  { value: 'missing_label',            label: 'Thiếu nhãn' },
  { value: 'poor_quality',             label: 'Chất lượng thấp' },
  { value: 'does_not_follow_guidelines', label: 'Không đúng guideline' },
  { value: 'other',                    label: 'Khác' },
];

export const ITEM_STATUS_ORDER = {
  pending_review: 0,
  partially_reviewed: 1,
  waiting_rework: 2,
  fully_reviewed: 3,
  finalized: 4,
};

export const ANNOTATOR_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6',
];
