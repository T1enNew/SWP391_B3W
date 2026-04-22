export const ITEM_STATUS = {
  pending_review:     { label: 'Cho review',      dot: 'bg-yellow-400' },
  partially_reviewed: { label: 'Mot phan',         dot: 'bg-orange-400' },
  fully_reviewed:     { label: 'Da review xong',   dot: 'bg-emerald-400' },
  waiting_rework:     { label: 'Cho sua lai',       dot: 'bg-amber-400' },
  finalized:          { label: 'Da finalize',       dot: 'bg-purple-400' },
};

export const SUBMISSION_STATUS = {
  pending:  { label: 'Cho review', color: 'bg-yellow-600' },
  approved: { label: 'Approved',   color: 'bg-emerald-600' },
  rejected: { label: 'Rejected',   color: 'bg-rose-600' },
};

export const FEEDBACK_CATEGORIES = [
  { value: 'incorrect_label',          label: 'Nhan sai' },
  { value: 'missing_label',            label: 'Thieu nhan' },
  { value: 'poor_quality',             label: 'Chat luong thap' },
  { value: 'does_not_follow_guidelines', label: 'Khong dung guideline' },
  { value: 'other',                    label: 'Khac' },
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
