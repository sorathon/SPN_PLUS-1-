from pathlib import Path
from datetime import datetime,timezone,timedelta
import json,re,html,os,time
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'report testcase update';DATA=REPORT/'data';RUNS=REPORT/'runs'
def read(path,default):
    try:return json.loads(path.read_text(encoding='utf-8-sig'))
    except (FileNotFoundError,json.JSONDecodeError):return default
def atomic(path,text):
    temp=path.with_name('.'+path.name+'.tmp-'+str(os.getpid()));temp.write_text(text,encoding='utf8')
    for attempt in range(5):
        try:temp.replace(path);return
        except PermissionError:
            if attempt==4:raise
            time.sleep(.1)
def clean(text):return re.sub(r'(?i)(UCODE|PHPSESSID)=([^&\s"<>]+)',r'\1=[redacted]',re.sub(r'\x1b\[[0-9;]*m','',str(text)))
def stamp(value):
    try:return datetime.fromisoformat(value.replace('Z','+00:00'))
    except (ValueError,AttributeError):return datetime.min.replace(tzinfo=timezone.utc)
def main():
    baseline=read(DATA/'baseline.json',None)
    if not baseline:raise RuntimeError('Recovery data missing; run recover.py once with the surviving HTML.')
    plan=read(RUNS/'local-active-plan.json',{});selected=set(plan.get('selectedIds',[]));cutoff=stamp(plan.get('startedAt',''))
    status=read(RUNS/'status.json',{});active=read(RUNS/'current-case.json',{}) if status.get('state')=='DEBUG_RUNNING' else {}
    events={}
    for file in RUNS.glob('*/incremental.jsonl'):
        for line in file.read_text(encoding='utf8').splitlines():
            try:event=json.loads(line)
            except json.JSONDecodeError:continue
            cid=event.get('id');explicit=any(a.get('type')=='skip' for a in event.get('annotations',[]))
            if not cid or (event.get('status')=='skipped' and not explicit):continue
            if cid in selected and stamp(event.get('endedAt',''))<cutoff:continue
            if cid not in events or stamp(event.get('endedAt',''))>=stamp(events[cid].get('endedAt','')):events[cid]={**event,'evidence':file.as_posix()}
    labels={'passed':'ผ่าน','failed':'ไม่ผ่าน','timedOut':'ไม่ผ่าน','skipped':'ข้าม','interrupted':'หยุดกลางทาง'}
    rows=[]
    blocked=read(Path(__file__).with_name('blocked-cases.json'),{})
    fixture_updates=read(DATA/'fixture-updates.json',{})
    excluded=set(read(Path(__file__).with_name('excluded-cases.json'),{}).get('ids',[]))
    for original in baseline['rows']:
        if original['id'] in excluded:continue
        row=dict(original);cid=row['id'];event=events.get(cid)
        fixture=fixture_updates.get(cid)
        if fixture:
            row.update({key:fixture[key] for key in ['name','steps','check'] if key in fixture})
            if not event or stamp(event.get('endedAt',''))<stamp(fixture['changedAt']):
                event=None
                row.update(result='รอรัน',note='ลดชุดข้อมูลเป็น1Detailต่อGCLแล้ว ยังไม่ได้รันทวนชุดข้อมูลใหม่',evidence=None,durationMs=None)
        if cid in selected:row.update(result='รอรัน',note='',evidence=None,durationMs=None)
        if event:
            note='; '.join(clean(e) for e in event.get('errors',[]))
            if event.get('status') in ['failed','timedOut']:
                for diagnostic in read(DATA/'debug-notes.json',[]):
                    if diagnostic['id']==cid and diagnostic['stage'] in event['evidence']:note=diagnostic['message']
            annotations=event.get('annotations',[])
            if event['status']=='skipped':note='; '.join(a.get('description','') for a in annotations if a.get('type')=='skip')
            extra='; '.join(a.get('description','') for a in annotations if a.get('type') in ['reference','gcl-reference'] or 'warning' in a.get('type',''))
            ended=stamp(event.get('endedAt','')).astimezone(timezone(timedelta(hours=7))).strftime('%d/%m/%Y %H:%M:%S')
            note='รัน local '+ended+' เวลาไทย; '+note+('; '+extra if extra else '')
            row.update(result=labels.get(event['status'],'รอรัน'),note=note[:1800].rstrip('; '),evidence=event['evidence'],durationMs=event.get('duration'),recoveredFromHtml=False)
        if cid==active.get('id') and (not event or stamp(active.get('startedAt',''))>stamp(event.get('endedAt',''))):row.update(result='กำลังรัน',note='กำลังรัน local')
        if cid in blocked:
            row.update(previousResult=row['result'],result='ข้าม',note=blocked[cid],durationMs=None,blocked=True)
        rows.append(row)
    statuses=['ผ่าน','ไม่ผ่าน','ข้าม','รอรัน','กำลังรัน','หยุดกลางทาง']
    stats={m:{s:sum(r['module']==m and r['result']==s for r in rows) for s in statuses} for m in ['IMPORT','EXPORT','GCL']}
    now=datetime.now(timezone(timedelta(hours=7))).isoformat(timespec='seconds')
    summary=' | '.join(m+': '+', '.join(f'{n} {s}' for s,n in values.items() if n) for m,values in stats.items())
    table=[]
    for row in rows:
        cells=''.join('<td>'+html.escape(str(row[k]))+'</td>' for k in ['module','id','name','steps','check'])
        css={'ผ่าน':'pass','ไม่ผ่าน':'fail','ข้าม':'skip'}.get(row['result'],'pending')
        cells+='<td class="'+css+'">'+html.escape(row['result'])+('<small>'+html.escape(row['note'])+'</small>' if row.get('note') else '')+'</td>'
        table.append('<tr data-module="'+html.escape(row['module'])+'" data-result="'+html.escape(row['result'])+'">'+cells+'</tr>')
    template=(DATA/'template.html').read_text(encoding='utf8')
    page=template.replace('__ROWS__',''.join(table)).replace('__HEADER__',html.escape(f'รายงาน local · อัปเดต {now} · {status.get("state","RECOVERED")} · {len(rows)} เคส')).replace('__SUMMARY__',html.escape(summary)).replace('__NOTICE__','กู้รายการและผลเก่าจาก HTML ที่เหลืออยู่ หลักฐาน trace เก่าที่ถูกลบยังไม่ได้กู้คืน ผลใหม่เก็บใน report testcase update/runs; ไม่เปลี่ยน flow ของ testcase')
    atomic(DATA/'short-results.json',json.dumps({'updatedAt':now,'state':status.get('state'),'scope':len(rows),'stats':stats,'rows':rows},ensure_ascii=False,indent=2))
    atomic(REPORT/'TESTCASES_ALL_SHORT_20261030.html',page)
    print(json.dumps({'state':status.get('state'),'rows':len(rows),'pass':sum(r['result']=='ผ่าน' for r in rows),'fail':sum(r['result']=='ไม่ผ่าน' for r in rows),'skip':sum(r['result']=='ข้าม' for r in rows)}))
if __name__=='__main__':main()
