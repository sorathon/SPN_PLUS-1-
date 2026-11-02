import fs from 'node:fs'
import path from 'node:path'
export const CSV_SOURCE=path.resolve(__dirname,'TestCSV_minimal.csv')
export function parseCsv(input:string) {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false
 input=input.replace(/^\uFEFF/,'')
 for(let i=0;i<input.length;i++) {const c=input[i]
  if(c==='"'){if(quoted && input[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(c===',' && !quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r') && !quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
  else cell+=c
 }
 if(cell || row.length){row.push(cell);rows.push(row)}
 return rows
}
export const sourceRows=()=>parseCsv(fs.readFileSync(CSV_SOURCE,'utf8'))
export type CsvGroup={header:string[];details:string[][]}
export function sourceGroups():CsvGroup[]{const groups:CsvGroup[]=[];for(const row of sourceRows()){if(row[0]==='H')groups.push({header:row,details:[]});else if(row[0]==='D')groups.at(-1)!.details.push(row)}return groups}
export function encodeCsv(rows:string[][]){return '\uFEFF'+rows.map(r=>r.map(v=>/[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join(',')).join('\r\n')+'\r\n'}
export function groupRows(groups:CsvGroup[]){return [...sourceRows().filter(r=>r[0].startsWith('//')),...groups.flatMap(g=>[g.header,...g.details])]}
export function fields(row:string[],kind:'H'|'D'):Record<string,string>{const names=sourceRows()[kind==='H'?1:2];return Object.fromEntries(names.slice(1).map((name,i)=>[name,row[i+1]||'']).filter(([name])=>name))}
