import base from '../../tests/playwright.config'
import path from 'node:path'
export default {...base,testDir:path.resolve(__dirname,'../../tests'),reporter:[
 ['json',{outputFile:process.env.PW_RESULTS_FILE}],
 [path.resolve(__dirname,'reporter.cjs')],
] as any}
