import { type ReactElement } from 'react'

/**
 * Mini renderizador Markdown -> React (sin dependencias).
 * Soporta: # h1, ## h2, ### h3, **negrita**, *cursiva*, `codigo`,
 * [texto](url), listas con -, tablas pipe y parrafos.
 */

function applyInline(text: string, key: string): (string | ReactElement)[] {
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  const out: (string | ReactElement)[] = []
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1] && m[2]) {
      out.push(
        <a key={key + '-a-' + idx} href={m[2]} target="_blank" rel="noreferrer noopener" style={{ color: '#0071E3' }}>
          {m[1]}
        </a>,
      )
    } else if (m[3]) {
      out.push(<strong key={key + '-b-' + idx}>{m[3]}</strong>)
    } else if (m[4]) {
      out.push(<em key={key + '-i-' + idx}>{m[4]}</em>)
    }
    last = m.index + m[0].length
    idx += 1
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function inline(text: string, key: string | number): ReactElement {
  const parts: (string | ReactElement)[] = []
  const codeRegex = /`([^`]+)`/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = codeRegex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    parts.push(
      <code
        key={'c-' + m.index}
        style={{
          backgroundColor: '#F5F5F7',
          padding: '1px 6px',
          borderRadius: 4,
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
        }}
      >
        {m[1]}
      </code>,
    )
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  const out = parts.flatMap((part, i) =>
    typeof part === 'string' ? applyInline(part, String(key) + '-' + i) : [part],
  )
  return <>{out}</>
}

export function MarkdownRenderer({ source }: { source: string }): ReactElement {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactElement[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (/^### /.test(line)) {
      blocks.push(
        <h3 key={key++} style={{ fontSize: 18, fontWeight: 600, color: '#1D1D1F', margin: '24px 0 8px', letterSpacing: '-0.01em' }}>
          {inline(line.replace(/^### /, ''), key)}
        </h3>,
      )
      i++
      continue
    }
    if (/^## /.test(line)) {
      blocks.push(
        <h2 key={key++} style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', margin: '32px 0 10px', letterSpacing: '-0.02em' }}>
          {inline(line.replace(/^## /, ''), key)}
        </h2>,
      )
      i++
      continue
    }
    if (/^# /.test(line)) {
      blocks.push(
        <h1 key={key++} style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', margin: '32px 0 14px', letterSpacing: '-0.02em' }}>
          {inline(line.replace(/^# /, ''), key)}
        </h1>,
      )
      i++
      continue
    }
    if (/^\|/.test(line) && /^\|[-: |]+\|/.test(lines[i + 1] ?? '')) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      const rows: string[][] = []
      let j = i + 2
      while (j < lines.length && /^\|/.test(lines[j])) {
        rows.push(lines[j].split('|').slice(1, -1).map((c) => c.trim()))
        j += 1
      }
      blocks.push(
        <div key={key++} style={{ overflowX: 'auto', margin: '16px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {header.map((h, hi) => (
                  <th key={hi} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1.5px solid #D2D2D7', fontWeight: 600, color: '#1D1D1F' }}>
                    {inline(h, hi)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid #F2F2F7', color: '#1D1D1F', verticalAlign: 'top' }}>
                      {inline(c, ri * 10 + ci)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j
      continue
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ''))
        i++
      }
      blocks.push(
        <ul key={key++} style={{ margin: '8px 0 14px', paddingLeft: 22, color: '#1D1D1F', lineHeight: 1.65 }}>
          {items.map((it, ii) => (
            <li key={ii} style={{ marginBottom: 4 }}>
              {inline(it, ii)}
            </li>
          ))}
        </ul>,
      )
      continue
    }
    if (/^\s*$/.test(line)) {
      i++
      continue
    }
    const paraLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3} /.test(lines[i]) &&
      !/^[-*] /.test(lines[i]) &&
      !/^\|/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} style={{ fontSize: 15, lineHeight: 1.7, color: '#1D1D1F', margin: '0 0 14px' }}>
        {inline(paraLines.join(' '), key)}
      </p>,
    )
  }

  return <article>{blocks}</article>
}
