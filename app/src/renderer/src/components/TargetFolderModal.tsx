import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { Icon } from './Icon'

export function TargetFolderModal(): JSX.Element | null {
  const pendingSong = useStore((s) => s.pendingSong)
  const pendingBatch = useStore((s) => s.pendingBatch)
  const folders = useStore((s) => s.folders)
  const foldersLoading = useStore((s) => s.foldersLoading)
  const lastSubfolder = useStore((s) => s.lastSubfolder)
  const confirmDownload = useStore((s) => s.confirmDownload)
  const cancelDownload = useStore((s) => s.cancelDownload)
  const confirmBatchDownload = useStore((s) => s.confirmBatchDownload)
  const cancelBatchDownload = useStore((s) => s.cancelBatchDownload)

  const isBatch = pendingBatch !== null
  const batchCount = pendingBatch?.length ?? 0

  const [selected, setSelected] = useState<string>(lastSubfolder)
  const [newFolder, setNewFolder] = useState('')
  const [filter, setFilter] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  // Reset při otevření (pro píseň i pro dávku).
  useEffect(() => {
    if (pendingSong || pendingBatch) {
      setSelected(lastSubfolder)
      setNewFolder('')
      setFilter('')
    }
  }, [pendingSong, pendingBatch, lastSubfolder])

  const filtered = useMemo(
    () => folders.filter((f) => f.toLowerCase().includes(filter.toLowerCase())),
    [folders, filter]
  )

  if (!pendingSong && !pendingBatch) return null

  // Cíl: nová složka má přednost, jinak vybraná (prázdné = kořen Songs).
  const target = newFolder.trim() || selected

  const cancel = (): void => (isBatch ? cancelBatchDownload() : cancelDownload())
  const confirm = (): void =>
    void (isBatch ? confirmBatchDownload(target) : confirmDownload(target))

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel()
      }}
    >
      <div
        className="modal modal--folder"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            confirm()
          } else if (e.key === 'Escape') {
            cancel()
          }
        }}
      >
        <div className="modal__head">
          <h2>Where to save?</h2>
          <button className="modal__close" onClick={cancel}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="folder-song">
            {isBatch ? (
              <strong>
                {batchCount} {batchCount === 1 ? 'song' : 'songs'} selected
              </strong>
            ) : (
              <>
                {pendingSong?.artist} – <strong>{pendingSong?.title}</strong>
              </>
            )}
          </div>

          <input
            className="folder-filter"
            placeholder="Filter folders…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />

          <div className="folder-list">
            <button
              className={`folder-item ${selected === '' && !newFolder ? 'folder-item--sel' : ''}`}
              onClick={() => {
                setSelected('')
                setNewFolder('')
              }}
            >
              <Icon name="folder" size={15} /> <em>(Songs root)</em>
            </button>
            {foldersLoading ? (
              <div className="folder-empty">Loading folders…</div>
            ) : filtered.length === 0 ? (
              <div className="folder-empty">No subfolders.</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f}
                  className={`folder-item ${selected === f && !newFolder ? 'folder-item--sel' : ''}`}
                  onClick={() => {
                    setSelected(f)
                    setNewFolder('')
                  }}
                  onDoubleClick={() => {
                    setSelected(f)
                    setNewFolder('')
                    void (isBatch ? confirmBatchDownload(f) : confirmDownload(f))
                  }}
                >
                  <Icon name="folder" size={15} /> {f}
                </button>
              ))
            )}
          </div>

          <label className="field">
            <span>…or create a new folder</span>
            <input
              ref={newInputRef}
              placeholder="New folder name"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
            />
          </label>
        </div>

        <div className="modal__foot">
          <button className="btn-secondary" onClick={cancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={confirm}>
            {isBatch
              ? `Download ${batchCount} → ${target || 'root'}`
              : newFolder.trim()
                ? `Create & download → ${newFolder.trim()}`
                : target
                  ? `Download → ${target}`
                  : 'Download to root'}
          </button>
        </div>
      </div>
    </div>
  )
}
