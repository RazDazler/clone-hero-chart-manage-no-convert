import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import { Icon } from './Icon'

export function TargetFolderModal(): JSX.Element | null {
  const pendingSong = useStore((s) => s.pendingSong)
  const folders = useStore((s) => s.folders)
  const foldersLoading = useStore((s) => s.foldersLoading)
  const lastSubfolder = useStore((s) => s.lastSubfolder)
  const confirmDownload = useStore((s) => s.confirmDownload)
  const cancelDownload = useStore((s) => s.cancelDownload)

  const [selected, setSelected] = useState<string>(lastSubfolder)
  const [newFolder, setNewFolder] = useState('')
  const [filter, setFilter] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)

  // Reset při otevření pro novou píseň.
  useEffect(() => {
    if (pendingSong) {
      setSelected(lastSubfolder)
      setNewFolder('')
      setFilter('')
    }
  }, [pendingSong, lastSubfolder])

  const filtered = useMemo(
    () => folders.filter((f) => f.toLowerCase().includes(filter.toLowerCase())),
    [folders, filter]
  )

  if (!pendingSong) return null

  // Cíl: nová složka má přednost, jinak vybraná (prázdné = kořen Songs).
  const target = newFolder.trim() || selected

  const confirm = () => void confirmDownload(target)

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancelDownload()
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
            cancelDownload()
          }
        }}
      >
        <div className="modal__head">
          <h2>Where to save?</h2>
          <button className="modal__close" onClick={cancelDownload}>
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="folder-song">
            {pendingSong.artist} – <strong>{pendingSong.title}</strong>
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
                    void confirmDownload(f)
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
          <button className="btn-secondary" onClick={cancelDownload}>
            Cancel
          </button>
          <button className="btn-primary" onClick={confirm}>
            {newFolder.trim()
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
