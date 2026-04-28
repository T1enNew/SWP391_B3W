import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, IconButton, Chip, Switch, Tooltip, FormControlLabel,
} from '@mui/material';
import {
  ArrowBack, ArrowForwardIos, ArrowBackIos, Image as ImageIcon,
} from '@mui/icons-material';
import { getLabelColor, formatDateTime } from '../Projects/ProjectDetail/utils';
import { buildImageUrl, coerceId } from './utils';
import { API_URL } from '../../../config/api';
import { BG, BORDER, CARD, MUTED, PANEL, PRIMARY, SUCCESS, TEXT } from './constants';

const ANNO_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];
const annoColor = (i) => ANNO_COLORS[i % ANNO_COLORS.length];

/* ── Annotated image renderer ── */
const AnnotatedImage = ({ imageUrl, datasetId, dataItemId, groups, visible }) => {
  const imgRef = useRef(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  const [src, setSrc] = useState(imageUrl || '');

  useEffect(() => {
    setLoaded(false); setErr(false); setNat({ w: 0, h: 0 });
    setSrc(imageUrl || '');
  }, [imageUrl]);

  const onError = useCallback(async () => {
    if (datasetId && dataItemId) {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(
          `${API_URL}/api/datasets/${datasetId}/signed-url/${dataItemId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const d = await res.json();
          const url = d?.signedUrl || d?.signed_url || d?.url || '';
          if (url) { setSrc(url); return; }
        }
      } catch {}
    }
    setErr(true);
  }, [datasetId, dataItemId]);

  const toPx = (bbox) => {
    if (!bbox || bbox.length < 4 || nat.w === 0) return null;
    let [x1, y1, x2, y2] = bbox;
    if (x1 <= 1 && y1 <= 1 && x2 <= 1 && y2 <= 1) { x1 *= 100; y1 *= 100; x2 *= 100; y2 *= 100; }
    return { px: (x1 / 100) * nat.w, py: (y1 / 100) * nat.h, pw: ((x2 - x1) / 100) * nat.w, ph: ((y2 - y1) / 100) * nat.h };
  };

  return (
    <Box sx={{ flex: 1, overflow: 'auto', bgcolor: '#07101d', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        {!loaded && !err && (
          <Box sx={{ width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{
              width: 36, height: 36, border: '3px solid #1e2d47', borderTopColor: PRIMARY,
              borderRadius: '50%', animation: 'dspin 0.8s linear infinite',
              '@keyframes dspin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
            }} />
          </Box>
        )}
        {err && (
          <Box sx={{ width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: '#ef4444', fontSize: 13 }}>Không tải được ảnh</Typography>
          </Box>
        )}
        <img
          ref={imgRef}
          src={src}
          alt="dataset item"
          style={{
            maxHeight: '70vh', maxWidth: '100%',
            display: err ? 'none' : 'block',
            borderRadius: 8, border: '1px solid #1e2d47',
          }}
          onLoad={e => { setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight }); setLoaded(true); }}
          onError={onError}
        />
        {loaded && nat.w > 0 && imgRef.current && (
          <svg
            style={{
              position: 'absolute', top: 0, left: 0,
              width: imgRef.current.clientWidth, height: imgRef.current.clientHeight,
              overflow: 'visible', pointerEvents: 'none',
            }}
            viewBox={`0 0 ${nat.w} ${nat.h}`}
            preserveAspectRatio="none"
          >
            {groups.map(g => {
              if (!visible.includes(g.name)) return null;
              return (g.annotations || []).map((obj, i) => {
                const p = toPx(obj.bbox);
                if (!p) return null;
                const tagH = 20;
                const tagW = Math.max(p.pw, 30);
                const label = obj.label || 'obj';
                return (
                  <g key={`${g.name}-${i}`}>
                    <rect x={p.px} y={p.py} width={p.pw} height={p.ph}
                      fill={g.color} fillOpacity={0.18} stroke={g.color} strokeWidth={2.5} />
                    <rect x={p.px} y={Math.max(0, p.py - tagH)} width={tagW} height={tagH}
                      fill={g.color} fillOpacity={0.92} rx={2} />
                    <text x={p.px + 4} y={Math.max(14, p.py - 5)}
                      fill="white" fontSize={13} fontWeight="bold" fontFamily="sans-serif">
                      {label.length > 22 ? label.substring(0, 19) + '...' : label}
                    </text>
                  </g>
                );
              });
            })}
          </svg>
        )}
      </Box>
    </Box>
  );
};

/* ── Main 3-panel viewer ── */
const DatasetItemViewer = ({ items, initialItem, approvedItemsMap, datasetId, onClose }) => {
  const [selIdx, setSelIdx] = useState(() => {
    if (!initialItem) return 0;
    const i = items.findIndex(it =>
      (coerceId(it) && coerceId(it) === coerceId(initialItem)) ||
      (it.filename && it.filename === initialItem.filename) ||
      (it.originalName && it.originalName === initialItem.originalName)
    );
    return i >= 0 ? i : 0;
  });

  const curItem = items[selIdx] || items[0];

  const itemData = useMemo(() => {
    if (!curItem || !approvedItemsMap) return null;
    const id    = coerceId(curItem);
    const fname = curItem?.originalName || curItem?.original_name || curItem?.filename || '';
    return approvedItemsMap.get(id) || approvedItemsMap.get(fname) || null;
  }, [curItem, approvedItemsMap]);

  const groups = useMemo(
    () => (itemData?.annotatorLabels || []).map((ann, i) => ({ ...ann, color: annoColor(i) })),
    [itemData]
  );

  // hiddenAnnotators = Set tên bị ẩn; mặc định tất cả visible (set rỗng)
  const [hidden, setHidden] = useState(new Set());
  useEffect(() => { setHidden(new Set()); }, [curItem]);

  const isOn   = (name) => !hidden.has(name);
  const toggle = (name) => setHidden(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const allOn  = groups.length > 0 && hidden.size === 0;
  const visible = groups.map(g => g.name).filter(n => isOn(n));

  const goTo = (i) => { if (i >= 0 && i < items.length) setSelIdx(i); };

  const fname      = curItem?.originalName || curItem?.original_name || curItem?.filename || `Item ${selIdx + 1}`;
  const imageUrl   = itemData?.fileUrl || buildImageUrl(curItem) || '';
  const dataItemId = itemData?.itemId || coerceId(curItem);

  return (
    <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', bgcolor: BG }}>

      {/* ── Left: image queue ── */}
      <Box sx={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Quay lại lưới ảnh">
            <IconButton size="small" onClick={onClose}
              sx={{ color: MUTED, '&:hover': { color: TEXT, bgcolor: 'rgba(255,255,255,0.06)' } }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography sx={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>{items.length} ảnh</Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {items.map((item, idx) => {
            const name     = item.originalName || item.original_name || item.filename || `item-${idx + 1}`;
            const thumbSrc = buildImageUrl(item);
            const isSel    = idx === selIdx;
            return (
              <Box
                key={coerceId(item) || idx}
                onClick={() => setSelIdx(idx)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.9, cursor: 'pointer',
                  borderLeft: `2px solid ${isSel ? PRIMARY : 'transparent'}`,
                  bgcolor: isSel ? 'rgba(59,130,246,0.12)' : 'transparent',
                  transition: 'all 0.12s',
                  '&:hover': { bgcolor: isSel ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)' },
                }}
              >
                <Box sx={{ width: 40, height: 32, borderRadius: 1, overflow: 'hidden', flexShrink: 0, bgcolor: '#07101d', position: 'relative' }}>
                  {thumbSrc ? (
                    <Box component="img" src={thumbSrc} alt={name}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <ImageIcon sx={{ fontSize: 14, color: MUTED }} />
                    </Box>
                  )}
                  <Box sx={{ position: 'absolute', top: 2, left: 2, width: 5, height: 5, borderRadius: '50%', bgcolor: SUCCESS }} />
                </Box>
                <Typography sx={{
                  fontSize: 11, color: isSel ? '#93c5fd' : '#94a3b8',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.3,
                }}>
                  {name.length > 18 ? name.substring(0, 16) + '...' : name}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Center: annotated image ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.2, borderBottom: `1px solid ${BORDER}`, bgcolor: PANEL, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ color: TEXT, fontWeight: 700, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fname}
          </Typography>
          <Typography sx={{ color: MUTED, fontSize: 11, flexShrink: 0 }}>
            {selIdx + 1} / {items.length}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.3, flexShrink: 0 }}>
            <IconButton size="small" onClick={() => goTo(selIdx - 1)} disabled={selIdx === 0}
              sx={{ color: MUTED, p: 0.5, '&:hover': { color: TEXT }, '&.Mui-disabled': { color: '#1e2d47' } }}>
              <ArrowBackIos sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={() => goTo(selIdx + 1)} disabled={selIdx === items.length - 1}
              sx={{ color: MUTED, p: 0.5, '&:hover': { color: TEXT }, '&.Mui-disabled': { color: '#1e2d47' } }}>
              <ArrowForwardIos sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        <AnnotatedImage
          imageUrl={imageUrl}
          datasetId={datasetId}
          dataItemId={dataItemId}
          groups={groups}
          visible={visible}
        />
      </Box>

      {/* ── Right: annotators panel ── */}
      <Box sx={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${BORDER}`, bgcolor: PANEL }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${BORDER}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Annotators</Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={allOn}
                  onChange={e => setHidden(e.target.checked ? new Set() : new Set(groups.map(g => g.name)))}
                />
              }
              label={<Typography sx={{ fontSize: 11, color: MUTED }}>Tất cả</Typography>}
              sx={{ m: 0, gap: 0.5 }}
            />
          </Box>
          {itemData?.approvedAt && (
            <Typography sx={{ fontSize: 11, color: '#4ade80', mt: 0.4 }}>
              ✓ Approved {formatDateTime(itemData.approvedAt)}
            </Typography>
          )}
          <Typography sx={{ color: MUTED, fontSize: 11, mt: 0.3 }}>
            {groups.length} annotator{groups.length !== 1 ? 's' : ''} • {groups.length - hidden.size} visible
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          {groups.length === 0 ? (
            <Typography sx={{ color: MUTED, fontSize: 12, textAlign: 'center', mt: 3 }}>
              Không có annotation
            </Typography>
          ) : groups.map((g, idx) => {
            const on = isOn(g.name);
            return (
              <Box
                key={`${g.name}-${idx}`}
                onClick={() => toggle(g.name)}
                sx={{
                  mb: 1.2, p: 1.5, borderRadius: 2, bgcolor: CARD, cursor: 'pointer',
                  border: `1px solid ${on ? g.color + '55' : BORDER}`,
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: on ? g.color + '88' : '#2d4060' },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: g.color, flexShrink: 0, boxShadow: `0 0 4px ${g.color}` }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: on ? TEXT : MUTED }}>
                      {g.name}
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={on}
                    onClick={e => e.stopPropagation()}
                    onChange={() => toggle(g.name)}
                    sx={{
                      '& .MuiSwitch-thumb': { bgcolor: on ? g.color : '#475569' },
                      '& .MuiSwitch-track': { bgcolor: on ? g.color + '44' : '#1e293b !important' },
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(g.labels || []).length === 0 ? (
                    <Typography variant="caption" sx={{ color: MUTED }}>Không có nhãn</Typography>
                  ) : g.labels.map((lbl, li) => (
                    <Chip key={li} label={lbl} size="small" sx={{
                      height: 20, fontSize: 10, fontWeight: 700,
                      bgcolor: getLabelColor(lbl) + '22',
                      color: getLabelColor(lbl),
                      border: `1px solid ${getLabelColor(lbl)}44`,
                    }} />
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default DatasetItemViewer;

