import fs from 'node:fs'
import path from 'node:path'
import { parseCsv } from './csv'

export const WORKSPACE_CSV = path.resolve(__dirname, 'Test_ใบกำกับ_1แถว.csv')
export const CONTROL_COLUMNS = ['containerLoader','departureDate','dischargePort','packingPort','carLicense_2','carProvince_2','carCountryCode','trailerLicense','trailerProvinceCode','trailerCountryCode','carType2','sealNumber1','containerNo','containerTypeCode2','GPSID','remarkGCL','authorizer','containerIndicator','modeOfMovement','portOfTranshipment','finalDestination','remark']
export const DETAIL_COLUMNS = ['orderbyItemNo','source','declaration','description','realPackage','packageUnit','realGrossWeight','weightUnit','tax','branch','itemMasterBillOfLading','itemHouseBillOfLading','invoiceNo','notation']
export function workspaceCsv() {
  const bytes = fs.readFileSync(WORKSPACE_CSV)
  const text = new TextDecoder('windows-874').decode(bytes)
  const rows = parseCsv(text).filter(row => row.some(value => value.trim()))
  if (!rows[0]?.[0].startsWith('//')) throw Error('Workspace CSV must have a commented column heading')
  if (rows.some(row => row.length !== 36)) throw Error('Workspace CSV must have exactly 36 columns per row')
  const data = rows.slice(1)
  if (!data.length || data.some(row => JSON.stringify(row.slice(0,22)) !== JSON.stringify(data[0].slice(0,22)))) throw Error('Expected one consistent Control for this workspace upload')
  return { bytes, rows, control: Object.fromEntries(CONTROL_COLUMNS.map((name,i) => [name,data[0][i]])),
    details: data.map(row => Object.fromEntries(DETAIL_COLUMNS.map((name,i) => [name,row[i+22]]))) }
}
