import { useRef } from 'react';
import { APP_NAME } from '../config';
import { useStore } from '../state/store';

/**
 * Shown on first run (choose where data lives) and when a previously connected
 * file needs its permission re-granted after a browser restart.
 *
 * Two first-run variants:
 *   - Browsers with the File System Access API (Chrome/Edge): offer a real,
 *     auto-saving .json file.
 *   - Everyone else (Brave, Firefox, Safari, mobile): explain that data lives
 *     in this browser and let them import an existing backup to start.
 */
export function FileGate() {
  const {
    status,
    fileName,
    fsSupported,
    connectNewFile,
    connectExistingFile,
    reconnect,
    continueLocal,
    importBackup,
  } = useStore();
  const importInput = useRef<HTMLInputElement>(null);

  async function onImportPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importBackup(file);
    continueLocal(); // leave the gate; data now lives in browser storage
  }

  if (status === 'needs-permission') {
    return (
      <div className="gate">
        <div className="gate-card">
          <span className="gate-icon" aria-hidden>
            🔒
          </span>
          <h2>Reconecta tu archivo</h2>
          <p className="muted">
            Por seguridad, el navegador pide tu permiso otra vez para abrir
            {fileName ? ` "${fileName}"` : ' tu archivo de ahorros'}. Tus datos están a salvo.
          </p>
          <div className="gate-actions">
            <button type="button" className="btn primary" onClick={reconnect}>
              Reconectar archivo
            </button>
            <button type="button" className="btn ghost" onClick={continueLocal}>
              Continuar solo en el navegador
            </button>
          </div>
        </div>
      </div>
    );
  }

  // First run, browser WITHOUT the File System Access API.
  if (!fsSupported) {
    return (
      <div className="gate">
        <div className="gate-card">
          <span className="gate-icon" aria-hidden>
            💰
          </span>
          <h2>Bienvenido a {APP_NAME}</h2>
          <p className="muted">
            Tus ahorros se guardan en este navegador — nada se sube a internet. Este navegador no
            puede escribir en un archivo automáticamente, así que para conservar una copia usa{' '}
            <strong>Exportar</strong> cada tanto y guárdala donde prefieras (Dropbox, iCloud, tu
            disco). Si borras los datos del navegador, se perderá lo que no hayas exportado.
          </p>
          <div className="gate-actions">
            <button type="button" className="btn primary" onClick={continueLocal}>
              Empezar
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => importInput.current?.click()}
            >
              Importar un respaldo…
            </button>
          </div>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportPick}
          />
        </div>
      </div>
    );
  }

  // First run, browser WITH the File System Access API.
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="gate-icon" aria-hidden>
          💰
        </span>
        <h2>Bienvenido a {APP_NAME}</h2>
        <p className="muted">
          Tus ahorros se guardan en un archivo <code>.json</code> que vive en tu computadora — nada
          se sube a internet. Guárdalo en Dropbox o iCloud si quieres respaldarlo o sincronizarlo.
        </p>
        <div className="gate-actions">
          <button type="button" className="btn primary" onClick={connectNewFile}>
            Crear archivo nuevo
          </button>
          <button type="button" className="btn" onClick={connectExistingFile}>
            Abrir archivo existente
          </button>
        </div>
        <button type="button" className="link-btn muted" onClick={continueLocal}>
          O usar solo este navegador (sin archivo)
        </button>
      </div>
    </div>
  );
}
