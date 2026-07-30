import { useRef, useState } from 'react';
import { APP_NAME } from '../config';
import { useStore } from '../state/store';
import { HelpModal } from './HelpModal';

interface HeaderProps {
  onNewBucket: () => void;
}

export function Header({ onNewBucket }: HeaderProps) {
  const {
    storageMode,
    fsSupported,
    fileName,
    connectNewFile,
    connectExistingFile,
    disconnectFile,
    exportBackup,
    importBackup,
  } = useStore();
  const importInput = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  async function onImportPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      confirm('Importar reemplazará todos los datos actuales por los del archivo. ¿Continuar?')
    ) {
      await importBackup(file);
    }
    e.target.value = '';
  }

  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo" aria-hidden>
          💰
        </span>
        <h1>{APP_NAME}</h1>
      </div>

      <div className="header-actions">
        {storageMode === 'file' && fileName ? (
          <button
            type="button"
            className="chip chip-file"
            title="Datos guardados en tu archivo. Clic para desconectar."
            onClick={() => {
              if (confirm('¿Desconectar el archivo? Los datos seguirán en este navegador.')) {
                disconnectFile();
              }
            }}
          >
            <span className="dot ok" /> {fileName}
          </button>
        ) : fsSupported ? (
          <div className="chip-group">
            <button
              type="button"
              className="chip chip-local chip-btn"
              title="Los datos viven solo en este navegador. Clic para saber más."
              onClick={() => setHelpOpen(true)}
            >
              <span className="dot warn" /> Solo navegador
            </button>
            <button type="button" className="btn small ghost" onClick={connectNewFile}>
              Guardar en archivo…
            </button>
            <button type="button" className="btn small ghost" onClick={connectExistingFile}>
              Abrir archivo…
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="chip chip-local chip-btn"
            title="Los datos viven solo en este navegador. Clic para saber más."
            onClick={() => setHelpOpen(true)}
          >
            <span className="dot warn" /> Solo navegador
          </button>
        )}

        <button type="button" className="btn small ghost" onClick={exportBackup}>
          Exportar
        </button>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => importInput.current?.click()}
        >
          Importar
        </button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImportPick}
        />
        <button
          type="button"
          className="icon-btn help-btn"
          onClick={() => setHelpOpen(true)}
          aria-label="Cómo se guardan tus datos"
          title="Cómo se guardan tus datos"
        >
          ?
        </button>
        <button type="button" className="btn primary" onClick={onNewBucket}>
          + Nuevo bucket
        </button>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </header>
  );
}
