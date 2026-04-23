export const TASK_STATUS = {
  assigned:    { label: 'Chưa làm',    color: 'bg-gray-600',   textColor: 'text-gray-300',   dotColor: 'bg-gray-400' },
  in_progress: { label: 'Đang làm',    color: 'bg-blue-600',   textColor: 'text-blue-300',   dotColor: 'bg-blue-400' },
  completed:   { label: 'Đã xong',     color: 'bg-emerald-600', textColor: 'text-emerald-300', dotColor: 'bg-emerald-400' },
  submitted:   { label: 'Đã nộp',      color: 'bg-orange-600', textColor: 'text-orange-300', dotColor: 'bg-orange-400' },
  resubmitted: { label: 'Đã nộp lại', color: 'bg-orange-700', textColor: 'text-orange-200', dotColor: 'bg-orange-500' },
  approved:    { label: 'Đã duyệt',    color: 'bg-emerald-600', textColor: 'text-emerald-300', dotColor: 'bg-emerald-400' },
  rejected:    { label: 'Bị trả lại', color: 'bg-rose-600',   textColor: 'text-rose-300',   dotColor: 'bg-rose-400' },
  revised:     { label: 'Đang sửa',    color: 'bg-amber-600',  textColor: 'text-amber-300',  dotColor: 'bg-amber-400' },
};
