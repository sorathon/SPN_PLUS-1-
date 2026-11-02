"""Recover the surviving HTML, without inventing deleted execution evidence."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'report testcase update'
DATA=REPORT/'data'
class Table(HTMLParser):
    def __init__(self):super().__init__();self.rows=[];self.cells=None;self.cell=None;self.small=False;self.note=''
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='tr' and a.get('data-module'):self.cells=[];self.note=''
        if tag=='td' and self.cells is not None:self.cell=''
        if tag=='small' and self.cell is not None:self.small=True
    def handle_data(self,text):
        if self.cell is not None:
            if self.small:self.note+=text
            else:self.cell+=text
    def handle_endtag(self,tag):
        if tag=='small':self.small=False
        if tag=='td' and self.cell is not None:self.cells.append(self.cell.strip());self.cell=None
        if tag=='tr' and self.cells is not None:
            if len(self.cells)!=6:raise ValueError('Unexpected report columns')
            row=dict(zip(['module','id','name','steps','check','result'],self.cells));row.update(note=self.note.strip(),evidence=None,durationMs=None,recoveredFromHtml=True);self.rows.append(row);self.cells=None
def main():
    if (DATA/'baseline.json').exists():raise SystemExit('Recovery baseline already exists; not overwritten.')
    file=REPORT/'TESTCASES_ALL_SHORT_20261030.html';raw=file.read_bytes();text=raw.decode('utf8')
    table=Table();table.feed(text)
    assert table.rows and len({r['id'] for r in table.rows})==len(table.rows)
    DATA.mkdir(parents=True,exist_ok=True);(REPORT/'runs').mkdir(exist_ok=True)
    (DATA/'recovered-original.html').write_bytes(raw)
    (DATA/'baseline.json').write_text(json.dumps({'scope':len(table.rows),'sourceSha256':hashlib.sha256(raw).hexdigest(),'rows':table.rows},ensure_ascii=False,indent=2),encoding='utf8')
    template=re.sub(r'<tbody>.*?</tbody>','<tbody>__ROWS__</tbody>',text,count=1,flags=re.S)
    markers=iter(['__HEADER__','__SUMMARY__','__NOTICE__'])
    template=re.sub(r'<p>.*?</p>',lambda m:'<p>'+next(markers)+'</p>',template,count=3,flags=re.S)
    (DATA/'template.html').write_text(template,encoding='utf8')
    (REPORT/'runs/stages.json').write_text('[]',encoding='utf8')
    (REPORT/'runs/status.json').write_text(json.dumps({'state':'RECOVERED','notice':'Historical results recovered from HTML; original traces were deleted.'}),encoding='utf8')
    print(f'Recovered {len(table.rows)} testcase rows; original HTML copied unchanged. No historical traces fabricated.')
if __name__=='__main__':main()
