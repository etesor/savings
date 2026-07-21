import { useState } from 'react';
import './App.css';
import { StoreProvider, useStore } from './state/store';
import type { Bucket } from './model/types';
import { bucketBalances } from './model/calculations';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { BucketCard } from './components/BucketCard';
import { BucketForm } from './components/BucketForm';
import { MovementForm } from './components/MovementForm';
import { FileGate } from './components/FileGate';
import { Modal } from './components/Modal';
import { UndoToast } from './components/UndoToast';
import type { Movement } from './model/types';

type ModalState =
  | { kind: 'none' }
  | { kind: 'bucket-create' }
  | { kind: 'bucket-edit'; bucket: Bucket }
  | { kind: 'movement'; bucket: Bucket; sign: 'deposit' | 'withdrawal' }
  | { kind: 'movement-edit'; bucket: Bucket; movement: Movement };

function Shell() {
  const store = useStore();
  const {
    data,
    status,
    addBucket,
    updateBucket,
    removeBucket,
    setArchived,
    addMovement,
    updateMovement,
    removeMovement,
    reorderBuckets,
  } = store;

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  if (status === 'loading') {
    return <div className="center-screen muted">Cargando…</div>;
  }
  if (status === 'welcome' || status === 'needs-permission') {
    return <FileGate />;
  }

  const balances = bucketBalances(data);
  const activeBuckets = data.buckets
    .filter((b) => !b.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDrop(targetId: string) {
    setOverId(null);
    const draggedId = dragId;
    setDragId(null);
    if (!draggedId || draggedId === targetId) return;
    const ids = activeBuckets.map((b) => b.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    reorderBuckets(ids);
  }

  return (
    <div className="app">
      <Header onNewBucket={() => setModal({ kind: 'bucket-create' })} />

      <main className="content">
        <Dashboard data={data} />

        {activeBuckets.length === 0 ? (
          <div className="empty">
            <p>Aún no tienes buckets de ahorro.</p>
            <button
              type="button"
              className="btn primary"
              onClick={() => setModal({ kind: 'bucket-create' })}
            >
              Crear mi primer bucket
            </button>
          </div>
        ) : (
          <div className="bucket-grid">
            {activeBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className={
                  'grid-item' +
                  (dragId === bucket.id ? ' dragging' : '') +
                  (overId === bucket.id && dragId && dragId !== bucket.id ? ' drag-over' : '')
                }
                draggable
                onDragStart={(e) => {
                  // Don't start a drag from an interactive control inside the card.
                  if ((e.target as HTMLElement).closest('button, input, a')) {
                    e.preventDefault();
                    return;
                  }
                  setDragId(bucket.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (overId !== bucket.id) setOverId(bucket.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(bucket.id);
                }}
              >
                <BucketCard
                  bucket={bucket}
                  balance={balances.get(bucket.id) ?? 0}
                  movements={data.movements}
                  currency={data.currency}
                  locale={data.locale}
                  expanded={expanded.has(bucket.id)}
                  onToggleExpand={() => toggleExpand(bucket.id)}
                  onAdd={() => setModal({ kind: 'movement', bucket, sign: 'deposit' })}
                  onWithdraw={() => setModal({ kind: 'movement', bucket, sign: 'withdrawal' })}
                  onEdit={() => setModal({ kind: 'bucket-edit', bucket })}
                  onEditMovement={(movement) => setModal({ kind: 'movement-edit', bucket, movement })}
                  onDeleteMovement={removeMovement}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {modal.kind === 'bucket-create' && (
        <Modal title="Nuevo bucket" onClose={() => setModal({ kind: 'none' })}>
          <BucketForm
            locale={data.locale}
            onCreate={addBucket}
            onUpdate={updateBucket}
            onClose={() => setModal({ kind: 'none' })}
          />
        </Modal>
      )}

      {modal.kind === 'bucket-edit' && (
        <Modal title="Editar bucket" onClose={() => setModal({ kind: 'none' })}>
          <BucketForm
            initial={modal.bucket}
            locale={data.locale}
            onCreate={addBucket}
            onUpdate={updateBucket}
            onArchive={setArchived}
            onDelete={removeBucket}
            onClose={() => setModal({ kind: 'none' })}
          />
        </Modal>
      )}

      {modal.kind === 'movement' && (
        <Modal title={modal.bucket.name} onClose={() => setModal({ kind: 'none' })}>
          <MovementForm
            bucket={modal.bucket}
            currentBalance={balances.get(modal.bucket.id) ?? 0}
            currency={data.currency}
            locale={data.locale}
            defaultSign={modal.sign}
            onSubmit={addMovement}
            onClose={() => setModal({ kind: 'none' })}
          />
        </Modal>
      )}

      {modal.kind === 'movement-edit' && (
        <Modal title="Editar movimiento" onClose={() => setModal({ kind: 'none' })}>
          <MovementForm
            bucket={modal.bucket}
            currentBalance={balances.get(modal.bucket.id) ?? 0}
            currency={data.currency}
            locale={data.locale}
            movement={modal.movement}
            onSubmit={addMovement}
            onUpdate={updateMovement}
            onDelete={removeMovement}
            onClose={() => setModal({ kind: 'none' })}
          />
        </Modal>
      )}

      <UndoToast />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
