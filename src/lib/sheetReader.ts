/**
 * Lectura de hojas de cálculo en el navegador, SIN dependencias:
 *  - CSV: comillas, saltos de línea en celdas y separador , ; o tab (Excel en español exporta con ;).
 *  - XLSX: el .xlsx es un ZIP de XML. Se lee el directorio central, se descomprime con la API nativa
 *    DecompressionStream('deflate-raw') y se parsea con DOMParser (primera hoja, textos compartidos).
 * Devuelve filas de texto (la primera es la cabecera).
 */
export async function readSheetFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx')) return readXlsx(file)
  if (name.endsWith('.xls')) throw new Error('Formato .xls antiguo no soportado: guárdalo como .xlsx o .csv.')
  return parseCsv(await file.text())
}

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const counts: [string, number][] = [[',', (firstLine.match(/,/g) ?? []).length], [';', (firstLine.match(/;/g) ?? []).length], ['\t', (firstLine.match(/\t/g) ?? []).length]]
  counts.sort((a, b) => b[1] - a[1])
  const sep = counts[0][1] > 0 ? counts[0][0] : ','
  const out: string[][] = []
  let row: string[] = [], cell = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else inQ = false }
      else cell += c
      continue
    }
    if (c === '"') { inQ = true; continue }
    if (c === sep) { row.push(cell); cell = ''; continue }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); out.push(row); row = []; cell = ''; continue
    }
    cell += c
  }
  if (cell || row.length) { row.push(cell); out.push(row) }
  return out.filter((r) => r.some((c) => c.trim() !== ''))
}

async function readXlsx(file: File): Promise<string[][]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // Fin del directorio central (EOCD): firma 0x06054b50 buscando desde el final.
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('El archivo no parece un .xlsx válido.')
  const count = dv.getUint16(eocd + 10, true)
  let off = dv.getUint32(eocd + 16, true)
  const entries = new Map<string, { method: number; csize: number; local: number }>()
  const dec = new TextDecoder()
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break
    const method = dv.getUint16(off + 10, true)
    const csize = dv.getUint32(off + 20, true)
    const nameLen = dv.getUint16(off + 28, true)
    const extraLen = dv.getUint16(off + 30, true)
    const commentLen = dv.getUint16(off + 32, true)
    const local = dv.getUint32(off + 42, true)
    entries.set(dec.decode(buf.subarray(off + 46, off + 46 + nameLen)), { method, csize, local })
    off += 46 + nameLen + extraLen + commentLen
  }
  const readEntry = async (name: string): Promise<string | null> => {
    const e = entries.get(name)
    if (!e) return null
    if (dv.getUint32(e.local, true) !== 0x04034b50) throw new Error('El .xlsx está dañado.')
    const start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true)
    const data = buf.slice(start, start + e.csize)
    if (e.method === 0) return dec.decode(data)
    if (e.method !== 8) throw new Error('Compresión del .xlsx no soportada.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = new Blob([data]).stream().pipeThrough(new (DecompressionStream as any)('deflate-raw'))
    return await new Response(stream).text()
  }
  const xml = (s: string) => new DOMParser().parseFromString(s, 'application/xml')

  // Primera hoja: workbook.xml → r:id → workbook.xml.rels → ruta de la hoja.
  let sheetPath = 'xl/worksheets/sheet1.xml'
  const wb = await readEntry('xl/workbook.xml')
  const rels = await readEntry('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName('sheet')[0]
    const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    for (const r of Array.from(xml(rels).getElementsByTagName('Relationship'))) {
      if (r.getAttribute('Id') === rid) {
        const t = r.getAttribute('Target') ?? ''
        sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '')
        break
      }
    }
  }
  const shared: string[] = []
  const ss = await readEntry('xl/sharedStrings.xml')
  if (ss) for (const si of Array.from(xml(ss).getElementsByTagName('si'))) shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent ?? '').join(''))
  const sheet = await readEntry(sheetPath)
  if (!sheet) throw new Error('No se encontró la primera hoja del .xlsx.')

  const rows: string[][] = []
  for (const row of Array.from(xml(sheet).getElementsByTagName('row'))) {
    const rIdx = Number(row.getAttribute('r') ?? rows.length + 1) - 1
    const cells: string[] = []
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const col = colIndex((c.getAttribute('r') ?? '').replace(/[0-9]/g, ''))
      const t = c.getAttribute('t')
      const v = c.getElementsByTagName('v')[0]?.textContent ?? ''
      let val = v
      if (t === 's') val = shared[Number(v)] ?? ''
      else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent ?? '').join('')
      else if (t === 'b') val = v === '1' ? 'sí' : 'no'
      cells[col >= 0 ? col : cells.length] = val
    }
    rows[rIdx] = Array.from(cells, (x) => x ?? '')
  }
  return Array.from(rows, (r) => r ?? []).filter((r) => r.some((c) => String(c).trim() !== ''))
}

function colIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
