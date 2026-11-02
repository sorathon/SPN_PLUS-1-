import fs from 'fs'
import zlib from 'zlib'

/**
 * Minimal zip reader for the app's export downloads (Save XML/PDF/Tiff/XLS/Dat all
 * answer with a .zip). Reads the central directory; supports stored and deflated
 * entries — enough to list the files and read an XML back.
 */
export type ZipEntry = { name: string; data: Buffer }

export function readZip(file: string): ZipEntry[] {
  const buf = fs.readFileSync(file)
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error(`${file} is not a zip file`)
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLen + localExtraLen
    const raw = buf.subarray(start, start + compressedSize)
    entries.push({ name, data: method === 0 ? raw : zlib.inflateRawSync(raw) })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}
