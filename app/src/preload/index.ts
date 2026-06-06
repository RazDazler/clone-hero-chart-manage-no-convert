// Preload: bezpečné vystavení API do renderer procesu přes contextBridge.

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppConfig,
  Database,
  DownloadJob,
  LibListing,
  RhythmVerseSystem,
  SearchResponse,
  SongResult
} from '../shared/types'

const api = {
  search: (
    text: string,
    page: number,
    records: number,
    system?: RhythmVerseSystem,
    database?: Database
  ) =>
    ipcRenderer.invoke('search', text, page, records, system, database) as Promise<SearchResponse>,

  enqueueDownload: (song: SongResult, targetSubfolder?: string) =>
    ipcRenderer.invoke('jobs:enqueue', song, targetSubfolder) as Promise<string>,

  enqueueLocalFile: (localPath: string, song: SongResult, targetSubfolder?: string) =>
    ipcRenderer.invoke('jobs:enqueueLocal', localPath, song, targetSubfolder) as Promise<string>,

  listSongFolders: () => ipcRenderer.invoke('library:listFolders') as Promise<string[]>,

  libList: (rel: string) => ipcRenderer.invoke('lib:list', rel) as Promise<LibListing>,
  libCreateFolder: (rel: string, name: string) =>
    ipcRenderer.invoke('lib:createFolder', rel, name) as Promise<void>,
  libRename: (relItem: string, newName: string) =>
    ipcRenderer.invoke('lib:rename', relItem, newName) as Promise<void>,
  libTrash: (relItem: string) => ipcRenderer.invoke('lib:trash', relItem) as Promise<void>,
  libMove: (src: string, destDir: string) =>
    ipcRenderer.invoke('lib:move', src, destDir) as Promise<void>,
  libCopy: (src: string, destDir: string) =>
    ipcRenderer.invoke('lib:copy', src, destDir) as Promise<void>,
  libOpen: (rel: string) => ipcRenderer.send('lib:open', rel),
  libReveal: (relItem: string) => ipcRenderer.send('lib:reveal', relItem),

  getJobs: () => ipcRenderer.invoke('jobs:getAll') as Promise<DownloadJob[]>,
  clearFinishedJobs: () => ipcRenderer.invoke('jobs:clearFinished') as Promise<void>,

  onJobUpdate: (cb: (job: DownloadJob) => void) => {
    const handler = (_e: unknown, job: DownloadJob) => cb(job)
    ipcRenderer.on('jobs:update', handler)
    return () => ipcRenderer.removeListener('jobs:update', handler)
  },

  getConfig: () => ipcRenderer.invoke('config:get') as Promise<AppConfig>,
  setConfig: (patch: Partial<AppConfig>) =>
    ipcRenderer.invoke('config:set', patch) as Promise<AppConfig>,
  songsDirExists: () => ipcRenderer.invoke('config:songsDirExists') as Promise<boolean>,

  chooseDirectory: () => ipcRenderer.invoke('dialog:chooseDir') as Promise<string | null>,
  /** Vrátí absolutní cestu k souboru přetaženému přes HTML5 drag-and-drop.
   *  V novém Electronu už `File.path` neexistuje (security) — místo toho
   *  `webUtils.getPathForFile()` v preloadu. */
  getDroppedFilePath: (file: File): string | null => {
    try {
      return webUtils.getPathForFile(file) || null
    } catch {
      return null
    }
  },
  chooseSongFile: () =>
    ipcRenderer.invoke('dialog:chooseSongFile') as Promise<
      { path: string; name: string } | null
    >,

  peekFileMeta: (path: string) =>
    ipcRenderer.invoke('file:peekMeta', path) as Promise<{
      artist: string
      title: string
    } | null>,

  /** Rozbalí shortlink na finální URL. */
  resolveUrl: (url: string) => ipcRenderer.invoke('url:resolve', url) as Promise<string>,

  isGameRunning: () => ipcRenderer.invoke('game:isRunning') as Promise<boolean>,
  bringGameToFront: () =>
    ipcRenderer.invoke('game:bringToFront') as Promise<
      { ok: true } | { ok: false; error: string }
    >,
  chExeStatus: () =>
    ipcRenderer.invoke('game:exeStatus') as Promise<{
      path: string | null
      autoDetected: boolean
    }>,
  chooseExeFile: () => ipcRenderer.invoke('dialog:chooseExe') as Promise<string | null>,
  onGameStatus: (cb: (running: boolean) => void) => {
    const handler = (_e: unknown, running: boolean): void => cb(running)
    ipcRenderer.on('game:status', handler)
    return () => ipcRenderer.removeListener('game:status', handler)
  },

  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  quitApp: () => ipcRenderer.send('app:quit'),
  pauseHotkeys: () => ipcRenderer.send('hotkeys:pause'),
  resumeHotkeys: () => ipcRenderer.send('hotkeys:resume'),

  onHotkey: (cb: (action: string) => void) => {
    const handler = (_e: unknown, action: string) => cb(action)
    ipcRenderer.on('hotkey', handler)
    return () => ipcRenderer.removeListener('hotkey', handler)
  },

  openExternal: (url: string) => ipcRenderer.send('shell:openExternal', url)
}

contextBridge.exposeInMainWorld('api', api)
