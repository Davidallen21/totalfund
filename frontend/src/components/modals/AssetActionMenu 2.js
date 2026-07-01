import { useRef, useEffect } from 'react';

export default function AssetActionMenu({ asset, anchorPos, isMobile, onEdit, onDelete, onClose, t }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick); };
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!asset) return null;

  const menuItems = (
    <>
      <div className="action-menu-item" onClick={() => { onEdit(asset); onClose(); }}>
        <span style={{ fontSize: '15px' }}>✎</span> {t('edit_asset')}
      </div>
      <div className="action-menu-item danger" onClick={() => { onDelete(asset); onClose(); }}>
        <span style={{ fontSize: '15px' }}>🗑</span> {t('delete_asset')}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="action-menu-backdrop" onClick={onClose} />
        <div className="action-menu-sheet" ref={menuRef}>
          <div className="action-menu-sheet-handle" />
          <div className="action-menu-sheet-title">{asset.ticker} — {t('asset_actions')}</div>
          {menuItems}
        </div>
      </>
    );
  }

  const style = {
    top: Math.min(anchorPos?.y ?? 0, window.innerHeight - 120),
    left: Math.min(anchorPos?.x ?? 0, window.innerWidth - 200),
  };

  return (
    <>
      <div className="action-menu-backdrop" style={{ background: 'transparent', backdropFilter: 'none' }} onClick={onClose} />
      <div className="action-menu-dropdown" style={style} ref={menuRef}>
        {menuItems}
      </div>
    </>
  );
}
