import { APP_NAME } from '../config';
import { useStore } from '../state/store';

/**
 * Shown on first run (choose where data lives) and when a previously connected
 * file needs its permission re-granted after a browser restart.
 */
export function FileGate() {
  const { status, fileName, connectNewFile, connectExistingFile, reconnect, continueLocal } =
    useStore();

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
