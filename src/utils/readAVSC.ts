import fs from 'fs'
import { promisify } from 'util'

const readFileAsync = promisify(fs.readFile)
const ENCODING = 'utf-8'

export function readAVSC(path: string) {
  return JSON.parse(fs.readFileSync(path, ENCODING))
}

export async function readAVSCAsync(path: string) {
  const file = await readFileAsync(path, ENCODING)
  return JSON.parse(file)
}
