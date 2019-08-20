import fs from 'fs'

export default (path: string) => JSON.parse(fs.readFileSync(path, 'utf-8'))
