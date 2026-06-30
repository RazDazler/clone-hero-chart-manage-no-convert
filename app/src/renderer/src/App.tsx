import { useEffect, useMemo } from 'react'
import chLogoUrl from './assets/CHM_logo.png'
import { DownloadQueue } from './components/DownloadQueue'
import { FilterBar } from './components/FilterBar'
import { Icon } from './components/Icon'
import { LibraryManager } from './components/LibraryManager'
import { LocalDropModal } from './components/LocalDropModal'
import { MarketplaceModal } from './components/MarketplaceModal'
import { Pager } from './components/Pager'
import { SearchBar } from './components/SearchBar'
import { Settings } from './components/Settings'
import { SongRow } from './components/SongRow'
import { SortSelect } from './components/SortSelect'
import { TargetFolderModal } from './components/TargetFolderModal'
import { TitleBar } from './components/TitleBar'
import { useStore } from './store'

export function App(): JSX.Element {
  const results = useStore((s) => s.results)
  const loading = useStore((s) => s.loading)
  const error = useStore((s) => s.error)
  const page = useStore((s) => s.page)
  const records = useStore((s) => s.records)
  const totalFiltered = useStore((s) => s.totalFiltered)
  const selectedIndex = useStore((s) => s.selectedIndex)
  const jobs = useStore((s) => s.jobs)
  const enqueuedKeys = useStore((s) => s.enqueuedKeys)
  const query = useStore((s) => s.query)
  const system = useStore((s) => s.system)
  const database = useStore((s) => s.database)
  const instrumentFilters = useStore((s) => s.instrumentFilters)
  const diffMin = useStore((s) => s.diffMin)
  const diffMax = useStore((s) => s.diffMax)
  const sort = useStore((s) => s.sort)

  // Klientský filtr + řazení.
  const visible = useMemo(() => {
    const filtered =
      instrumentFilters.length === 0
        ? results
        : results.filter((song) =>
            instrumentFilters.every((id) => {
              const d = song.difficulties[id as keyof typeof song.difficulties]
              return d !== undefined && d >= diffMin && d <= diffMax
            })
          )
    if (sort === 'relevance') return filtered
    const arr = [...filtered]
    if (sort === 'title') arr.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'artist')
      arr.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title))
    else if (sort === 'length') arr.sort((a, b) => (b.lengthSeconds ?? 0) - (a.lengthSeconds ?? 0))
    return arr
  }, [results, instrumentFilters, diffMin, diffMax, sort])

  const setSelectedIndex = useStore((s) => s.setSelectedIndex)
  const openDownload = useStore((s) => s.openDownload)
  const openMarketplace = useStore((s) => s.openMarketplace)
  const doSearch = useStore((s) => s.doSearch)

  // Akce „stáhnout" – oficiální DLC místo toho nabídne otevření obchodu.
  const triggerDownload = (song: (typeof results)[number]): void => {
    if (song.official) openMarketplace(song)
    else if (!enqueuedKeys[song.key]) void openDownload(song)
  }
  const applyJobUpdate = useStore((s) => s.applyJobUpdate)
  const loadConfig = useStore((s) => s.loadConfig)

  // Načtení configu + odběr událostí (úlohy, hotkeys).
  useEffect(() => {
    void (async () => {
      await loadConfig()
      // První spuštění mimo složku hry: pokud Songs neexistuje, otevři Nastavení.
      const exists = await window.api.songsDirExists()
      if (!exists) useStore.getState().setShowSettings(true)
    })()
    const offJob = window.api.onJobUpdate(applyJobUpdate)
    const offHotkey = window.api.onHotkey((action) => {
      if (action === 'focus-search') {
        ;(document.querySelector('.searchbar input') as HTMLInputElement)?.focus()
      }
    })
    // Default v Electron rendereru je otevřít drop file ve výchozím prohlížeči — zabit.
    const stopDrag = (e: DragEvent): void => e.preventDefault()
    window.addEventListener('dragover', stopDrag)
    window.addEventListener('drop', stopDrag)
    return () => {
      offJob()
      offHotkey()
      window.removeEventListener('dragover', stopDrag)
      window.removeEventListener('drop', stopDrag)
    }
  }, [loadConfig, applyJobUpdate])

  const totalPages = Math.max(1, Math.ceil(totalFiltered / records))

  // Globální klávesová navigace v overlayi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'

      // Když je otevřený modal výběru složky, klávesy řeší samotný modal.
      if (useStore.getState().pendingSong) return
      if (useStore.getState().pendingLocal) return
      // Dotaz na obchod (oficiální DLC): jen Escape zavře.
      if (useStore.getState().marketplacePrompt) {
        if (e.key === 'Escape') useStore.getState().closeMarketplace()
        return
      }

      if (e.key === 'Escape') {
        const st = useStore.getState()
        if (st.showLibrary) st.setShowLibrary(false)
        else if (st.showSettings) st.setShowSettings(false)
        else window.api.hideOverlay()
        return
      }
      // Otevřené Nastavení/Správce: nech projít jen Escape (výše), nenaviguj.
      if (useStore.getState().showSettings || useStore.getState().showLibrary) return
      if (e.key === '/' && !typing) {
        e.preventDefault()
        ;(document.querySelector('.searchbar input') as HTMLInputElement)?.focus()
        return
      }
      if (typing) return

      const max = visible.length - 1
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(Math.min(selectedIndex + 1, max))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(Math.max(selectedIndex - 1, 0))
      } else if (e.key === 'Enter') {
        const song = visible[selectedIndex]
        if (song) {
          if (song.official) openMarketplace(song)
          else if (!enqueuedKeys[song.key]) void openDownload(song)
        }
      } else if (e.key === 'PageDown') {
        if (page < totalPages) void doSearch(page + 1)
      } else if (e.key === 'PageUp') {
        if (page > 1) void doSearch(page - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    visible,
    selectedIndex,
    page,
    totalPages,
    enqueuedKeys,
    setSelectedIndex,
    openDownload,
    openMarketplace,
    doSearch
  ])

  // Scroll vybrané položky do view.
  useEffect(() => {
    document
      .querySelector('.song--selected')
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedIndex])

  return (
    <div className="app">
      <TitleBar />
      <SearchBar />
      <FilterBar />

      {database !== 'enchor' && system !== 'ch' ? (
        <div className="rec-hint">
          <Icon name="info" size={14} />
          <span>
            For the most reliable downloads, use the <strong>Clone Hero</strong> tab. Phase Shift /
            Rock Band charts are often hosted on MEGA or Mediafire and may need manual download.
          </span>
        </div>
      ) : null}
      {database === 'enchor' ? (
        <div className="rec-hint">
          <Icon name="info" size={14} />
          <span>
            <strong>Chorus Encore</strong>: curated Clone Hero charts only. Files are hosted
            directly as <code>.sng</code> — no Google Drive or MEGA friction.
          </span>
        </div>
      ) : null}

      {results.length > 0 && !loading && !error ? (
        <div className="resultsbar">
          <span className="resultsbar__count">
            <strong>{totalFiltered}</strong> results found
            {query ? (
              <>
                {' for '}
                <strong>“{query}”</strong>
              </>
            ) : null}
          </span>
          <SortSelect />
        </div>
      ) : null}

      <div className="results">
        {loading ? (
          <div className="state">Searching…</div>
        ) : error ? (
          <div className="state state--error">⚠ {error}</div>
        ) : results.length === 0 ? (
          <div className="state state--empty">
            <img className="ch-logo" src={chLogoUrl} alt="" draggable={false} />
            <div className="state__msg">
              {query ? 'Nothing found.' : 'Type a song or artist and press Search.'}
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="state">No song matches the instrument filter.</div>
        ) : (
          visible.map((song, i) => (
            <SongRow
              key={song.key}
              song={song}
              selected={i === selectedIndex}
              job={enqueuedKeys[song.key] ? jobs[enqueuedKeys[song.key]] : undefined}
              onSelect={() => setSelectedIndex(i)}
              onDownload={() => triggerDownload(song)}
              onMarketplace={() => openMarketplace(song)}
            />
          ))
        )}
      </div>

      {results.length > 0 && !loading ? <Pager visibleCount={visible.length} /> : null}

      <DownloadQueue />
      <Settings />
      <TargetFolderModal />
      <MarketplaceModal />
      <LibraryManager />
      <LocalDropModal />
    </div>
  )
}
