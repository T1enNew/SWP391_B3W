import {
  Assignment as AssignmentIcon,
  AudioFile as AudioIcon,
  Description as TextIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

export const pageSx = {
  minHeight: '100vh',
  background: '#0f172a',
  color: '#e2e8f0',
  px: { xs: 2, md: 4 },
  py: { xs: 2, md: 3 },
};

export const panelSx = {
  background: '#111827',
  border: '1px solid #243041',
  borderRadius: 4,
  boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
};

export const cardSx = {
  background: '#1f2937',
  border: '1px solid #334155',
  borderRadius: 3,
  color: '#e2e8f0',
  boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
};

export const softCardSx = {
  ...cardSx,
  background: '#172132',
};

export const primaryBtnSx = {
  borderRadius: 2.5,
  textTransform: 'none',
  fontWeight: 700,
  bgcolor: '#2563eb',
  color: '#fff',
  '&:hover': { bgcolor: '#1d4ed8' },
};

export const secondaryBtnSx = {
  borderRadius: 2.5,
  textTransform: 'none',
  fontWeight: 700,
  bgcolor: '#1f2937',
  color: '#e2e8f0',
  border: '1px solid #334155',
  '&:hover': { bgcolor: '#273548' },
};

export const modalPaperSx = {
  bgcolor: '#111827',
  color: '#e2e8f0',
  border: '1px solid #243041',
  borderRadius: '18px',
  boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
};

export const statusPalette = {
  draft:         { label: 'Draft',         color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
  active:        { label: 'Active',        color: '#22c55e', bg: 'rgba(34,197,94,0.16)'   },
  waiting_rework:{ label: 'Waiting rework',color: '#f97316', bg: 'rgba(249,115,22,0.16)'  },
  submitted:     { label: 'In review',     color: '#f59e0b', bg: 'rgba(245,158,11,0.16)'  },
  approved:      { label: 'Approved',      color: '#22c55e', bg: 'rgba(34,197,94,0.16)'   },
  rejected:      { label: 'Rework',        color: '#ef4444', bg: 'rgba(239,68,68,0.16)'   },
  in_progress:   { label: 'In progress',   color: '#3b82f6', bg: 'rgba(59,130,246,0.16)'  },
  assigned:      { label: 'Assigned',      color: '#a78bfa', bg: 'rgba(167,139,250,0.16)' },
};

export const typePalette = {
  image: { color: '#f59e0b', bg: 'rgba(245,158,11,0.16)', icon: ImageIcon },
  audio: { color: '#f472b6', bg: 'rgba(244,114,182,0.16)', icon: AudioIcon },
  text:  { color: '#34d399', bg: 'rgba(52,211,153,0.16)',  icon: TextIcon },
  other: { color: '#a78bfa', bg: 'rgba(167,139,250,0.16)', icon: AssignmentIcon },
};
