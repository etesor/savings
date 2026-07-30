import { APP_NAME } from '../config';
import { useStore } from '../state/store';
import { Modal } from './Modal';

/**
 * Explains, in plain language, where the user's data is stored and how to keep
 * a durable copy. The wording adapts to what the current browser can do:
 *   - File System Access API available -> a real auto-saving file is possible.
 *   - Not available -> browser storage + manual Export/Import backups.
 */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const { fsSupported, storageMode, fileName } = useStore();

  return (
    <Modal title={`Cómo se guardan tus datos`} onClose={onClose}>
      <div className="help">
        <p>
          <strong>{APP_NAME}</strong> guarda todo <strong>en tu propio dispositivo</strong>. Nada
          se sube a internet ni a ningún servidor — no hay cuentas ni nube.
        </p>

        {fsSupported ? (
          <>
            <h3>Guardar en un archivo (recomendado)</h3>
            <p>
              Este navegador puede escribir directamente en un archivo <code>.json</code> tuyo.
              Pulsa <strong>«Guardar en archivo…»</strong> para crear uno nuevo, o{' '}
              <strong>«Abrir archivo…»</strong> para conectar uno existente. A partir de ahí, cada
              cambio se guarda solo en ese archivo.
            </p>
            <p className="muted">
              Truco: guárdalo en una carpeta de Dropbox, iCloud o Google Drive para respaldarlo y
              usarlo desde varios equipos.
            </p>
            <h3>Solo en el navegador</h3>
            <p>
              Si no conectas un archivo, los datos viven en el almacenamiento de este navegador. Es
              cómodo, pero si borras los datos de navegación se pierden. Usa{' '}
              <strong>Exportar</strong> para tener una copia.
            </p>
          </>
        ) : (
          <>
            <h3>En este navegador</h3>
            <p>
              Tus datos se guardan en el almacenamiento de este navegador. Este navegador (por
              ejemplo Brave, Firefox, Safari o cualquier navegador móvil) no permite que la app
              escriba en un archivo automáticamente, así que la copia la haces tú.
            </p>
            <h3>Cómo conservar una copia</h3>
            <ul>
              <li>
                <strong>Exportar</strong> descarga un archivo <code>.json</code> con todos tus
                datos. Hazlo cada tanto y guárdalo donde prefieras (Dropbox, iCloud, tu disco).
              </li>
              <li>
                <strong>Importar</strong> vuelve a cargar ese archivo — útil para restaurar o para
                pasar tus datos a otro dispositivo o navegador.
              </li>
            </ul>
            <p className="warn-text">
              ⚠️ Si borras los datos de navegación de este sitio, se perderá todo lo que no hayas
              exportado.
            </p>
          </>
        )}

        <p className="muted small-note">
          Estado actual:{' '}
          {storageMode === 'file' && fileName
            ? `guardando en «${fileName}».`
            : 'guardando solo en este navegador.'}
        </p>
      </div>
    </Modal>
  );
}
