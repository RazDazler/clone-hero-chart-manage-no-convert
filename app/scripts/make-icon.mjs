// Vygeneruje build/icon.ico a build/icon.png z build/icon.svg.
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))

function renderPng(size) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  return r.render().asPng()
}

// Hlavní PNG (256) pro okno
const png256 = renderPng(256)
writeFileSync(join(root, 'build', 'icon.png'), png256)

// ICO s více velikostmi
const sizes = [256, 128, 64, 48, 32, 16]
const buffers = sizes.map(renderPng)
const ico = await pngToIco(buffers)
writeFileSync(join(root, 'build', 'icon.ico'), ico)

console.log('Hotovo: build/icon.png a build/icon.ico')
