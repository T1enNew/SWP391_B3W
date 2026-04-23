import React, { useEffect, useState, useRef, useCallback } from 'react';
import { API_URL } from '../../../config/api';

const ImageViewPanel = ({ item, visibleAnnotators, activeAnnotatorId, availableLabels, datasetId, dataItemId }) => {
  const imgRef = useRef(null);
  const [imgNat, setImgNat] = useState({ w: 0, h: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState('');

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setImgNat({ w: 0, h: 0 });
    setResolvedUrl(item?.imageUrl || '');
  }, [item?.imageUrl]);

  const handleLoad = (e) => {
    setImgNat({ w: e.target.naturalWidth, h: e.target.naturalHeight });
    setIsLoaded(true);
  };

  const handleError = useCallback(async () => {
    if (datasetId && dataItemId) {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(
          `${API_URL}/api/datasets/${datasetId}/signed-url/${dataItemId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          const url = data?.signedUrl || data?.signed_url || data?.url || data?.data?.signedUrl || '';
          if (url) { setResolvedUrl(url); return; }
        }
      } catch {}
    }
    setHasError(true);
    setIsLoaded(false);
  }, [datasetId, dataItemId]);

  const getLabelColor = (labelName) => {
    if (!availableLabels || !labelName) return '#888888';
    return availableLabels.find(l => l.name === labelName)?.color || '#888888';
  };

  const toPixel = (bbox) => {
    if (!bbox || bbox.length < 4 || imgNat.w === 0 || imgNat.h === 0) return null;
    const [x1, y1, x2, y2] = bbox;
    return {
      px: (x1 / 100) * imgNat.w,
      py: (y1 / 100) * imgNat.h,
      pw: ((x2 - x1) / 100) * imgNat.w,
      ph: ((y2 - y1) / 100) * imgNat.h,
    };
  };

  if (!resolvedUrl && !item?.imageUrl) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <p className="text-gray-500 text-xs">Khong co URL anh</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-800 p-3 flex items-center justify-center">
      <div className="relative inline-block">
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-800/80 rounded-lg min-w-[200px] min-h-[200px]">
            <div className="h-8 w-8 border-3 border-gray-600 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900/90 rounded-lg min-w-[200px] min-h-[200px]">
            <p className="text-rose-400 text-xs font-semibold">Khong tai duoc anh</p>
          </div>
        )}

        <img
          ref={imgRef}
          key={resolvedUrl}
          src={resolvedUrl}
          alt={item.filename || 'Review item'}
          className="max-w-full rounded-lg border border-gray-700 block"
          style={{ maxHeight: '75vh', width: 'auto', height: 'auto', display: 'block' }}
          onLoad={handleLoad}
          onError={handleError}
        />

        {isLoaded && imgNat.w > 0 && imgRef.current && (
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight, overflow: 'visible' }}
            viewBox={`0 0 ${imgNat.w} ${imgNat.h}`}
            preserveAspectRatio="none"
          >
            {(item.submissions || []).map((sub) => {
              if (!visibleAnnotators.includes(sub.annotatorId)) return null;
              if (!sub.labels?.objects) return null;
              const isActive = sub.annotatorId === activeAnnotatorId;
              const alpha    = isActive ? 0.3 : 0.15;
              const strokeW  = isActive ? 3 : 2;

              return sub.labels.objects.map((obj, idx) => {
                const px = toPixel(obj.bbox);
                if (!px) return null;
                const labelText = obj.label || `Obj ${idx + 1}`;
                const color = getLabelColor(obj.label);
                const tagH = 22;
                const tagW = Math.min(Math.max(px.pw, 30), 200);
                return (
                  <g key={`${sub.submissionId}-${idx}`}>
                    <rect x={px.px} y={px.py} width={px.pw} height={px.ph}
                      fill={color} fillOpacity={alpha} stroke={color} strokeWidth={strokeW} />
                    <rect x={px.px} y={Math.max(0, px.py - tagH)} width={tagW} height={tagH}
                      fill={color} fillOpacity={0.95} rx={2} />
                    <text x={px.px + 5} y={Math.max(15, px.py - 5)}
                      fill="white" fontSize={15} fontWeight="bold" fontFamily="sans-serif">
                      {labelText.length > 25 ? labelText.substring(0, 22) + '...' : labelText}
                    </text>
                  </g>
                );
              });
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

export default ImageViewPanel;
