import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../../config/api';
import {
  getFullImageUrl, normalizeLabelSet, pickBestLabelSet,
  isTextItem, getAnnotatorColor, getLabelColor,
} from './utils';
import DatasetStatsPanel from './DatasetStatsPanel';
import ItemGrid from './ItemGrid';
import MediaPanel from './MediaPanel';
import AnnotationSidebar from './AnnotationSidebar';

const DatasetItemDetail = () => {
  const navigate = useNavigate();
  const audioPlayerRef = useRef(null);
  const location = useLocation();
  const { datasetId } = useParams();

  const itemId = useMemo(() => {
    const raw = (location.pathname.split(`/manager/datasets/${datasetId}/items/`)[1] || '').trim();
    return raw;
  }, [location.pathname, datasetId]);

  const state = location.state || {};

  const [resolvedItem, setResolvedItem] = useState(state.item || null);
  const [resolvedDatasetName, setResolvedDatasetName] = useState(state.datasetName || 'Dataset');
  const [allDatasetItems, setAllDatasetItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState('all');

  const datasetItems = useMemo(() => {
    let items = allDatasetItems;
    if (itemSearch) {
      const q = itemSearch.toLowerCase();
      items = items.filter(it => (it.originalName || it.filename || it.id || '').toLowerCase().includes(q));
    }
    if (itemStatusFilter && itemStatusFilter !== 'all') {
      items = items.filter(it => it.status === itemStatusFilter);
    }
    return items;
  }, [allDatasetItems, itemSearch, itemStatusFilter]);

  const [resolvedLabelSet, setResolvedLabelSet] = useState(
    normalizeLabelSet(
      pickBestLabelSet(
        state.labelSet,
        state.item?.labelSet,
        state.item?.availableLabels,
        state.item?.projectId?.availableLabels,
        state.item?.datasetId?.projectId?.availableLabels,
        state.item?.datasetId?.availableLabels,
      )
    )
  );
  const [loading, setLoading] = useState(false);

  const item      = resolvedItem;
  const datasetName = resolvedDatasetName;
  const labelSet  = resolvedLabelSet;
  const imageUrl  = useMemo(() => getFullImageUrl(item?.dataItem || item), [item]);

  // Fetch text content for text items
  useEffect(() => {
    if (!resolvedItem || !isTextItem(resolvedItem)) return;
    if (resolvedItem?.text || resolvedItem?.dataItem?.text) return;

    const fetchText = async () => {
      try {
        const textUrl = getFullImageUrl(resolvedItem?.dataItem || resolvedItem);
        if (!textUrl) return;
        const textResp = await axios.get(textUrl, { responseType: 'text' });
        const loadedText = typeof textResp.data === 'string' ? textResp.data : '';
        if (!loadedText) return;
        setResolvedItem((prev) => prev ? { ...prev, text: loadedText, dataItem: { ...(prev.dataItem || {}), text: loadedText } } : prev);
      } catch (e) {
        console.error('Error fetching text content for detail item:', e);
      }
    };
    fetchText();
  }, [resolvedItem]);

  const annotations         = (item?.annotations || []);
  const primaryAnnotations  = annotations.filter((a) => a.primaryForItem);
  const approvedAnnotations = annotations.filter((a) => a.status === 'approved');
  // Luôn ưu tiên hiển thị tất cả annotator đã approved (không chỉ primary)
  const displayAnnotations  = approvedAnnotations.length > 0 ? approvedAnnotations : annotations;

  const reviewerDisplayName = useMemo(() => {
    const looksLikeObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

    const directReviewer = item?.reviewerId;
    if (directReviewer?.fullName) return directReviewer.fullName;
    if (directReviewer?.username) return directReviewer.username;
    if (directReviewer?.name) return directReviewer.name;
    if (typeof directReviewer === 'string' && directReviewer.trim() && !looksLikeObjectId(directReviewer)) return directReviewer;

    const reviewedBy = item?.reviewedBy;
    if (reviewedBy?.fullName) return reviewedBy.fullName;
    if (reviewedBy?.username) return reviewedBy.username;
    if (typeof reviewedBy === 'string' && reviewedBy.trim() && !looksLikeObjectId(reviewedBy)) return reviewedBy;

    if (Array.isArray(item?.annotations) && item.annotations.length > 0) {
      const annWithReviewer = item.annotations.find((a) => a?.reviewerId?.fullName || a?.reviewerId?.username);
      if (annWithReviewer?.reviewerId?.fullName) return annWithReviewer.reviewerId.fullName;
      if (annWithReviewer?.reviewerId?.username) return annWithReviewer.reviewerId.username;
    }

    if (Array.isArray(item?.reviewers) && item.reviewers.length > 0) {
      const picked = item.reviewers.find((r) => r?.status === 'approved' || r?.status === 'rejected') || item.reviewers[0];
      const rid = picked?.reviewerId || picked?.reviewedBy;
      if (rid?.fullName) return rid.fullName;
      if (rid?.username) return rid.username;
      if (typeof rid === 'string' && rid.trim() && !looksLikeObjectId(rid)) return rid;
    }

    return 'Unknown';
  }, [item]);

  const normalizedAnnotations = displayAnnotations.map((ann, idx) => ({
    ...ann,
    id: (ann.annotatorId || ann.annotator || `annotator-${idx}`)?.toString?.(),
    name: ann.annotator || ann.annotatorId?.fullName || ann.annotatorId?.username || 'Unknown annotator',
    labels: ann.labels || {},
  }));

  const [visibleAnnotators, setVisibleAnnotators] = useState({});

  useEffect(() => {
    if (!normalizedAnnotations.length) return;
    setVisibleAnnotators((prev) => {
      const next = {};
      normalizedAnnotations.forEach((a) => { next[a.id] = prev[a.id] ?? true; });
      return next;
    });
  }, [normalizedAnnotations]);

  // Determine the actual data type
  const dataType = item?.type ||
    (item?.mimeType?.startsWith('image/') ? 'image' :
     item?.mimeType?.startsWith('audio/') ? 'audio' :
     item?.mimeType?.startsWith('text/') || item?.dataItem?.mimeType?.startsWith('text/') || item?.text || item?.dataItem?.text ? 'text' : 'image');

  const mergedObjects = useMemo(() => {
    if (!item) return [];

    if (dataType === 'text') {
      return normalizedAnnotations.flatMap((ann, annIdx) => {
        const spans = ann?.labels?.spans || ann?.labels?.sentences || [];
        return spans.map((span, idx) => ({
          id: `span_${annIdx}_${idx}`,
          text: span.text || span.sentence || '',
          label: span.label || 'Unknown',
          start: span.start,
          end: span.end,
          sourceAnnotator: ann.name,
          sourceAnnotatorId: ann.id,
        }));
      });
    }

    if (dataType === 'audio') {
      return normalizedAnnotations.flatMap((ann, annIdx) => {
        const segments = ann?.labels?.segments || [];
        return segments.map((seg, idx) => ({
          id: `segment_${annIdx}_${idx}`,
          start: seg.start ?? seg.startTime ?? 0,
          end: seg.end ?? seg.endTime ?? 0,
          label: seg.label || 'unknown',
          note: seg.note || '',
          sourceAnnotator: ann.name,
          sourceAnnotatorId: ann.id,
        }));
      });
    }

    // Handle image data type - only use annotators currently represented in normalizedAnnotations
    return normalizedAnnotations.flatMap((ann, annIdx) => {
      const annName  = ann.name || 'Unknown';
      const annId    = ann.id;
      const isPrimary = Boolean(ann.primaryForItem);
      const annColor = getAnnotatorColor(annName);
      return (ann.labels?.objects || []).map((obj, objIdx) => ({
        ...obj,
        id: `${annName}-${annIdx}-${objIdx}`,
        label: `${obj.label || 'Unknown'}`,
        originalLabel: obj.label,
        sourceAnnotator: annName,
        sourceAnnotatorId: annId,
        isPrimary,
        color: annColor,
      }));
    });
  }, [item, dataType, normalizedAnnotations]);

  const visibleMergedObjects = useMemo(
    () => mergedObjects.filter((obj) => visibleAnnotators[obj.sourceAnnotatorId] === true),
    [mergedObjects, visibleAnnotators]
  );

  const uniqueLabels = useMemo(() => {
    if (!item) return [];
    if (dataType === 'text' || dataType === 'audio') {
      return Array.from(new Set(visibleMergedObjects.map((obj) => obj.label).filter(Boolean)));
    }
    return Array.from(new Set(visibleMergedObjects.map((obj) => obj.originalLabel || obj.label).filter(Boolean)));
  }, [item, visibleMergedObjects, dataType]);

  const baseLabels = useMemo(() => {
    if (!item) return [];
    if (dataType === 'text' || dataType === 'audio') {
      return Array.from(new Set(visibleMergedObjects.map((obj) => obj.label?.split(' • ')[0]).filter(Boolean)));
    }
    return Array.from(new Set(visibleMergedObjects.map((obj) => obj.originalLabel || obj.label).filter(Boolean)));
  }, [item, visibleMergedObjects, dataType]);

  // Fetch item if not provided via navigation state
  useEffect(() => {
    if (resolvedItem || !datasetId) return;
    const fetchItem = async () => {
      try {
        setLoading(true);
        const resp = await axios.get(`${API_URL}/api/datasets/${datasetId}`);
        let items = resp.data?.items || resp.data?.data_items || [];
        setAllDatasetItems(items);
        const decodedId = itemId ? decodeURIComponent(itemId) : '';
        let found = items.find((it) => it.path === decodedId || it.id?.toString?.() === decodedId || it.imageUrl === decodedId);

        if (found && !found.text && (found.mimeType === 'text/plain' || found.filename?.endsWith('.txt'))) {
          try {
            const textUrl = getFullImageUrl(found);
            if (textUrl) {
              const textResp = await axios.get(textUrl, { responseType: 'text' });
              found = { ...found, text: textResp.data };
            }
          } catch (textErr) {
            console.error('Error fetching text content:', textErr);
          }
        }

        if (found) {
          setResolvedItem(found);
          setResolvedDatasetName(resp.data?.datasetName || resolvedDatasetName);
          const resolvedLabels = pickBestLabelSet(
            found?.availableLabels,
            found?.projectId?.availableLabels,
            resp.data?.projectId?.availableLabels,
            resp.data?.dataset?.projectId?.availableLabels,
            found?.datasetId?.projectId?.availableLabels,
            found?.datasetId?.availableLabels,
            found?.labelSet,
            resp.data?.labelSet,
            resp.data?.dataset?.labelSet,
            resolvedLabelSet,
          );
          setResolvedLabelSet(normalizeLabelSet(resolvedLabels));
        }
      } catch (err) {
        console.error('Error fetching item detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [resolvedItem, datasetId, itemId, resolvedDatasetName, resolvedLabelSet]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: '#0f172a' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/manager/datasets')}
          sx={{ borderColor: '#3b82f6', color: '#3b82f6' }}
        >
          Back to Datasets
        </Button>
        <Typography variant="h5" fontWeight={800} sx={{ color: '#e2e8f0' }}>
          {datasetName} • Item Detail
        </Typography>
      </Stack>

      <DatasetStatsPanel
        allDatasetItems={allDatasetItems}
        item={item}
        onSetSearch={setItemSearch}
        onSetStatusFilter={setItemStatusFilter}
      />

      {!item && !itemId ? (
        <Box sx={{ p: 4, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
          <ItemGrid
            loading={loading}
            datasetItems={datasetItems}
            datasetId={datasetId}
            navigate={navigate}
            datasetName={datasetName}
            itemSearch={itemSearch}
            setItemSearch={setItemSearch}
            itemStatusFilter={itemStatusFilter}
            setItemStatusFilter={setItemStatusFilter}
            normalizedLabelSet={normalizedLabelSet}
          />
        </Box>
      ) : !item ? (
        <Box sx={{ p: 4, borderRadius: 3, bgcolor: '#1e293b', border: '1px solid #334155' }}>
          <Typography sx={{ color: '#94a3b8' }}>Item not found.</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
          <MediaPanel
            item={item}
            dataType={dataType}
            imageUrl={imageUrl}
            visibleMergedObjects={visibleMergedObjects}
            labelSet={labelSet}
            normalizedAnnotations={normalizedAnnotations}
            primaryAnnotations={primaryAnnotations}
            visibleAnnotators={visibleAnnotators}
            setVisibleAnnotators={setVisibleAnnotators}
            audioPlayerRef={audioPlayerRef}
          />
          <AnnotationSidebar
            item={item}
            mergedObjects={mergedObjects}
            uniqueLabels={uniqueLabels}
            baseLabels={baseLabels}
            labelSet={labelSet}
            reviewerDisplayName={reviewerDisplayName}
          />
        </Box>
      )}
    </Box>
  );
};

export default DatasetItemDetail;
