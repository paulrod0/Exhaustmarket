import React from 'react'
import { Text, View, StyleSheet, Linking } from 'react-native'

interface Props {
  source: string
}

function parseInlineToSegments(text: string): Array<React.ReactNode> {
  const segments: Array<React.ReactNode> = []
  const regex = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let lastIdx = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) segments.push(text.slice(lastIdx, match.index))
    if (match[1]) {
      segments.push(<Text key={key++} style={mdStyles.code}>{match[1]}</Text>)
    } else if (match[2] && match[3]) {
      const href = match[3]
      segments.push(
        <Text
          key={key++}
          style={mdStyles.link}
          onPress={() => { Linking.openURL(href).catch(() => {}) }}
        >
          {match[2]}
        </Text>,
      )
    } else if (match[4]) {
      segments.push(<Text key={key++} style={mdStyles.bold}>{match[4]}</Text>)
    } else if (match[5]) {
      segments.push(<Text key={key++} style={mdStyles.italic}>{match[5]}</Text>)
    }
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) segments.push(text.slice(lastIdx))
  return segments
}

export function MarkdownRenderer({ source }: Props) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^### /.test(line)) {
      blocks.push(
        <Text key={key++} style={mdStyles.h3}>
          {parseInlineToSegments(line.replace(/^### /, ''))}
        </Text>,
      )
      i++
      continue
    }
    if (/^## /.test(line)) {
      blocks.push(
        <Text key={key++} style={mdStyles.h2}>
          {parseInlineToSegments(line.replace(/^## /, ''))}
        </Text>,
      )
      i++
      continue
    }
    if (/^# /.test(line)) {
      blocks.push(
        <Text key={key++} style={mdStyles.h1}>
          {parseInlineToSegments(line.replace(/^# /, ''))}
        </Text>,
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
        <View key={key++} style={mdStyles.tableBlock}>
          {rows.map((r, ri) => (
            <View key={ri} style={mdStyles.tableRow}>
              {r.map((c, ci) => (
                <View key={ci} style={mdStyles.tableCell}>
                  <Text style={mdStyles.tableHeader}>{header[ci]}</Text>
                  <Text style={mdStyles.tableValue}>{parseInlineToSegments(c)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>,
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
        <View key={key++} style={mdStyles.list}>
          {items.map((it, ii) => (
            <View key={ii} style={mdStyles.listItem}>
              <Text style={mdStyles.bullet}>•</Text>
              <Text style={mdStyles.listText}>{parseInlineToSegments(it)}</Text>
            </View>
          ))}
        </View>,
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
      <Text key={key++} style={mdStyles.paragraph}>
        {parseInlineToSegments(paraLines.join(' '))}
      </Text>,
    )
  }

  return <View>{blocks}</View>
}

const mdStyles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '700', color: '#1D1D1F', marginTop: 24, marginBottom: 10 },
  h2: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginTop: 22, marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginTop: 16, marginBottom: 6 },
  paragraph: { fontSize: 15, color: '#1D1D1F', lineHeight: 23, marginBottom: 12 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'Courier', fontSize: 13, backgroundColor: '#F5F5F7' },
  link: { color: '#0071E3', textDecorationLine: 'underline' },
  list: { marginVertical: 6 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#86868B', marginRight: 8, lineHeight: 22 },
  listText: { fontSize: 15, color: '#1D1D1F', lineHeight: 22, flex: 1 },
  tableBlock: { marginVertical: 12, gap: 8 },
  tableRow: { backgroundColor: '#F5F5F7', borderRadius: 10, padding: 12, gap: 6 },
  tableCell: {},
  tableHeader: { fontSize: 10, fontWeight: '600', color: '#86868B', marginBottom: 2 },
  tableValue: { fontSize: 14, color: '#1D1D1F' },
})
