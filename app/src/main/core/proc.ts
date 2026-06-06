// Pomocník pro spouštění externích procesů.

import { spawn } from 'child_process'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export function run(
  exe: string,
  args: string[],
  onLine?: (line: string, stream: 'stdout' | 'stderr') => void
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    let stdoutBuf = ''
    let stderrBuf = ''

    const handle = (chunk: Buffer, stream: 'stdout' | 'stderr') => {
      const text = chunk.toString()
      if (stream === 'stdout') stdout += text
      else stderr += text
      if (!onLine) return
      if (stream === 'stdout') {
        stdoutBuf += text
        let i: number
        while ((i = stdoutBuf.indexOf('\n')) >= 0) {
          onLine(stdoutBuf.slice(0, i).replace(/\r$/, ''), 'stdout')
          stdoutBuf = stdoutBuf.slice(i + 1)
        }
      } else {
        stderrBuf += text
        let i: number
        while ((i = stderrBuf.indexOf('\n')) >= 0) {
          onLine(stderrBuf.slice(0, i).replace(/\r$/, ''), 'stderr')
          stderrBuf = stderrBuf.slice(i + 1)
        }
      }
    }

    child.stdout.on('data', (c) => handle(c, 'stdout'))
    child.stderr.on('data', (c) => handle(c, 'stderr'))
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }))
  })
}
