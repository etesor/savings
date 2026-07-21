import { useRef } from 'react';
import { APP_NAME } from '../config';
import { useStore } from '../state/store';

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
            <span className="chip chip-local" title="Los datos viven solo en este navegador">
              <span className="dot warn" /> Solo navegador
            </span>
            <button type="button" className="btn small ghost" onClick={connectNewFile}>
              Guardar en archivo…
            </button>
            <button type="button" className="btn small ghost" onClick={connectExistingFile}>
              Abrir archivo…
            </button>
          </div>
        ) : (
          <span className="chip chip-local">
            <span className="dot warn" /> Solo navegador
          </span>
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
        <button type="button" className="btn primary" onClick={onNewBucket}>
          + Nuevo bucket
        </button>
      </div>
    </header>
  );
}
