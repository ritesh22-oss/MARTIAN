import React, { useState, useEffect } from 'react';
import { Eye, ExternalLink, RefreshCw, AlertTriangle, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { resolveStacItemImage, getHiRisePdsBrowseUrl, extractObservationId } from '../utils/stacAssetResolver';

export default function StacCardImage({ item, isSelected, onExpand }) {
  const [resolved, setResolved] = useState(null);
  const [imageState, setImageState] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  useEffect(() => {
    if (!item) return;
    const initialResolved = resolveStacItemImage(item);
    setResolved(initialResolved);
    setImageState('loading');
    setFallbackAttempted(false);
  }, [item]);

  const handleImageError = () => {
    if (!fallbackAttempted && resolved) {
      setFallbackAttempted(true);
      const obsId = extractObservationId(item);
      const pdsUrl = getHiRisePdsBrowseUrl(obsId);

      if (pdsUrl && pdsUrl !== resolved.originalAssetUrl) {
        setResolved({
          imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(pdsUrl)}`,
          originalAssetUrl: pdsUrl,
          assetKey: 'pds_fallback',
          assetTypeLabel: 'PDS Archive',
          observationId: obsId,
          attribution: 'NASA / JPL / UA / USGS',
          isGeoTiff: false
        });
        setImageState('loading');
        return;
      }
    }
    setImageState('error');
  };

  if (!resolved) {
    return (
      <div className="h-56 bg-slate-900 animate-pulse flex items-center justify-center text-slate-600 font-mono text-xs">
        Initializing STAC Asset...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="relative h-60 bg-[#050814] overflow-hidden flex items-center justify-center border-b border-slate-800 cursor-pointer group/img rounded-t-2xl"
        onClick={() => {
          if (imageState === 'loaded' && resolved.imageUrl) {
            onExpand(resolved.imageUrl, item.properties?.title || item.id, resolved);
          }
        }}
      >
        {/* Loading Spinner */}
        {imageState === 'loading' && (
          <div className="absolute inset-0 bg-[#070B19] flex flex-col items-center justify-center text-slate-400 font-mono gap-2 z-10">
            <RefreshCw className="w-6 h-6 text-orange-400 animate-spin" />
            <span className="text-[10px] text-slate-300 font-bold">
              Fetching {resolved.assetTypeLabel}...
            </span>
          </div>
        )}

        {/* Loaded Image */}
        {resolved.imageUrl && (
          <img
            src={resolved.imageUrl}
            alt={item.properties?.title || item.id}
            className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 rounded-t-2xl ${
              imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageState('loaded')}
            onError={handleImageError}
            loading="lazy"
          />
        )}

        {/* Error Fallback Box */}
        {(imageState === 'error' || !resolved.imageUrl) && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-2 font-mono text-xs">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            <span className="text-slate-300 font-bold text-[11px]">Preview unavailable for this format</span>
            <p className="text-[10px] text-slate-500 max-w-[200px]">
              Observation: {resolved.observationId}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageState('loading');
                setFallbackAttempted(false);
                setResolved(resolveStacItemImage(item));
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Render</span>
            </button>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

        {/* Source Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-20">
          <span className="px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/40 font-bold shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            HiRISE / USGS
          </span>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[9px] font-mono font-bold shadow-md">
            {resolved.assetTypeLabel}
          </span>
        </div>

        {/* Active Badge (Top Right) */}
        {isSelected && (
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-cyan-500 text-black font-bold font-mono text-[10px] flex items-center gap-1 shadow-lg z-20">
            <Check className="w-3 h-3" />
            <span>Active DTM</span>
          </div>
        )}

        {/* Expand View Hover Button */}
        {imageState === 'loaded' && (
          <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-white font-mono text-[10px] flex items-center gap-1 shadow-xl z-20">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Expand View</span>
          </div>
        )}
      </div>

      {/* Provenance & Observation Metadata Sub-bar */}
      <div className="px-3 pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 gap-2 flex-wrap">
        <div className="flex items-center gap-1 truncate">
          <span className="text-slate-500">Obs ID:</span>
          <strong className="text-cyan-300 font-bold truncate">{resolved.observationId}</strong>
        </div>

        {resolved.originalAssetUrl && (
          <a
            href={resolved.originalAssetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1 font-bold shrink-0"
            title="View Original NASA/USGS Source Asset"
          >
            <span>Original Asset</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
