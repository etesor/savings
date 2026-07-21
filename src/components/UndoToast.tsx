import { useStore } from '../state/store';

/** Bottom toast offering to revert the last destructive action for a few seconds. */
export function UndoToast() {
  const { pendingUndo, undo, dismissUndo } = useStore();
  if (!pendingUndo) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-label">{pendingUndo.label}</span>
      <button type="button" className="toast-undo" onClick={undo}>
        Deshacer
      </button>
      <button type="button" className="icon-btn tiny" onClick={dismissUndo} aria-label="Cerrar">
        ×
      </button>
    </div>
  );
}
