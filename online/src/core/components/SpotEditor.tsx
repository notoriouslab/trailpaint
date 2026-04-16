import { useRef, useState, useEffect } from 'react';
import type { Spot } from '../models/types';
import { ICONS, getIcon } from '../icons';
import { compressImage } from '../hooks/useImageCompress';
import { t } from '../../i18n';

interface SpotEditorProps {
  spot: Spot;
  onUpdate: (patch: Partial<Spot>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function SpotEditor({ spot, onUpdate, onDelete, onClose }: SpotEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showIcons, setShowIcons] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const dragStartRef = useRef<{ y: number; py: number } | null>(null);

  // Auto-collapse icon picker on click outside
  useEffect(() => {
    if (!showIcons) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowIcons(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showIcons]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    try {
      const dataUrl = await compressImage(file);
      onUpdate({ photo: dataUrl, photoY: 50 });
    } catch (err) {
      alert(err instanceof Error ? err.message : t('editor.photoFailed'));
    }
  };

  // Photo Y adjustment dragging
  const onPhotoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
    dragStartRef.current = { y: e.clientY, py: spot.photoY ?? 50 };

    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const delta = (ev.clientY - dragStartRef.current.y) / 2; // Sensitivity
      const nextY = Math.max(0, Math.min(100, dragStartRef.current.py - delta));
      onUpdate({ photoY: nextY });
    };

    const onUp = () => {
      setIsDraggingPhoto(false);
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const currentIcon = getIcon(spot.iconId, spot.customEmoji);

  return (
    <div className="spot-editor">
      <div className="spot-editor__header">
        <span className="spot-editor__num">#{spot.num}</span>
        <button className="spot-editor__close" onClick={onClose}>✕</button>
      </div>

      <label className="spot-editor__label">
        {t('editor.name')}
        <input
          className="spot-editor__input"
          value={spot.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
      </label>

      <label className="spot-editor__label">
        {t('editor.desc')}
        <textarea
          className="spot-editor__textarea"
          value={spot.desc}
          onChange={(e) => onUpdate({ desc: e.target.value })}
          rows={3}
        />
      </label>

      <div className="spot-editor__label">{t('editor.icon')}</div>
      <div className="spot-editor__icon-picker" ref={pickerRef}>
        {!showIcons ? (
          <button 
            className="spot-editor__icon-toggle"
            onClick={() => setShowIcons(true)}
          >
            <span className="spot-editor__current-emoji">{currentIcon.emoji}</span>
            <span className="spot-editor__current-label">{currentIcon.label}</span>
            <span className="spot-editor__caret">▼</span>
          </button>
        ) : (
          <div className="spot-editor__icons-grid">
            {ICONS.map((ic) => (
              <button
                key={ic.id}
                className={`spot-editor__icon-btn${spot.iconId === ic.id ? ' spot-editor__icon-btn--active' : ''}`}
                title={ic.label}
                onClick={() => {
                  onUpdate({ iconId: ic.id });
                  setShowIcons(false);
                }}
              >
                {ic.emoji}
              </button>
            ))}
          </div>
        )}
      </div>



      <div className="spot-editor__label" style={{ marginTop: '12px' }}>
        {t('editor.photo')}
        {spot.photo && <span style={{ fontWeight: 'normal', fontSize: '10px', float: 'right', opacity: 0.7 }}>↕ Drag photo to position</span>}
      </div>
      {spot.photo && (
        <div className="spot-editor__photo-preview">
          <div 
            className={`spot-editor__photo-container${isDraggingPhoto ? ' spot-editor__photo-container--dragging' : ''}`}
            onMouseDown={onPhotoMouseDown}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && file.type.startsWith('image/')) {
                processFile(file);
              }
            }}
          >
            <img 
              src={spot.photo} 
              alt="" 
              style={{ objectPosition: `center ${spot.photoY ?? 50}%` }}
            />
          </div>
          <button className="spot-editor__photo-remove" onClick={() => onUpdate({ photo: null })}>
            {t('editor.removePhoto')}
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      <button 
        className="spot-editor__btn" 
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) {
            processFile(file);
          }
        }}
      >
        {spot.photo ? t('editor.changePhoto') : t('editor.uploadPhoto')}
      </button>

      <button
        className="spot-editor__btn spot-editor__btn--danger"
        onClick={() => {
          if (confirm(t('editor.deleteConfirm'))) onDelete();
        }}
      >
        {t('editor.delete')}
      </button>
    </div>
  );
}
