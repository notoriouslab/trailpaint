import { useRef } from 'react';
import type { Spot } from '../models/types';
import { ICONS } from '../icons';
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

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      onUpdate({ photo: dataUrl });
    } catch (err) {
      alert(err instanceof Error ? err.message : t('editor.photoFailed'));
    }
    e.target.value = '';
  };

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
      <div className="spot-editor__icons">
        {ICONS.map((ic) => (
          <button
            key={ic.id}
            className={`spot-editor__icon-btn${spot.iconId === ic.id ? ' spot-editor__icon-btn--active' : ''}`}
            title={ic.label}
            onClick={() => onUpdate({ iconId: ic.id })}
          >
            {ic.emoji}
          </button>
        ))}
      </div>

      <div className="spot-editor__label">{t('editor.photo')}</div>
      {spot.photo && (
        <div className="spot-editor__photo-preview">
          <img src={spot.photo} alt="" />
          <button className="spot-editor__photo-remove" onClick={() => onUpdate({ photo: null })}>
            {t('editor.removePhoto')}
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      <button className="spot-editor__btn" onClick={() => fileRef.current?.click()}>
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
