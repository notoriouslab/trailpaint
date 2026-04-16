import { useState, useRef, useEffect } from 'react';
import type { Spot } from '../models/types';

interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onSelect: () => void;
  onUpdate?: (patch: Partial<Spot>) => void;
}

export default function SpotCard({ spot, selected, onSelect, onUpdate }: SpotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  return (
    <div
      className={`spot-card${selected ? ' spot-card--selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        if (onUpdate) {
          e.stopPropagation();
          setIsEditing(true);
        }
      }}
    >
      {/* Title tag */}
      <div className="spot-card__title-tag">
        <span className="spot-card__hole" />
        {isEditing ? (
          <input
            ref={inputRef}
            className="spot-card__title-input"
            value={spot.title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="spot-card__title">{spot.title}</span>
        )}
      </div>

      {/* Photo */}
      {spot.photo && (
        <div className="spot-card__photo-wrap">
          <img 
            src={spot.photo} 
            alt={spot.title} 
            className="spot-card__photo" 
            style={{ objectPosition: `center ${spot.photoY ?? 50}%` }}
          />
        </div>
      )}

      {/* Description */}
      {spot.desc && (
        <div className="spot-card__desc">{spot.desc}</div>
      )}

      {/* Number badge */}
      <div className="spot-card__badge">{spot.num}</div>
    </div>
  );
}
