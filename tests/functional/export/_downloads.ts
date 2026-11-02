import fs from 'node:fs'
import path from 'node:path'
import { expect } from '@playwright/test'
import { readZip } from '../../data/zip'
import type { ExportUI,RecordRef } from './_shared'
import type { SpnSession } from '../../pages/spn/SpnApp'
import type { ExportDownload } from '../../pages/export/ListPage'

export async function exported(ui:ExportUI,spn:SpnSession,d:RecordRef,button:ExportDownload,dir:string){
  await ui.list.open(spn);await ui.list.search({referenceNo:d.referenceNo});await ui.list.select(d.id)
  const download=await ui.list.download(button)
  fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,download.suggestedFilename());await download.saveAs(file)
  const entries=readZip(file);expect(entries.length,'Download must contain files').toBeGreaterThan(0)
  return entries
}
