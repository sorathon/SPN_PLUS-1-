# ข้อมูลให้ Dev ตรวจ Detail ลอย / เพิ่มจำนวนผิดปกติ

หลักฐานจาก TC-GCL-086 วันที่30ตุลาคม2026 (ไม่รันทดสอบซ้ำ)

- GCL Ref HQVM400001917, parent gtcid1101
- Export ต้นทาง HQVM200002190, ExDclCtrl1958
- 20:29:29.249 น. เวลาไทย ส่ง POST goodstransitiondetail / ACTION=update / rowDetail=abc
- Requestดังกล่าวมี status=-1 และ time=-1 ในtrace ซึ่งหมายถึงไม่มีresponseจบที่เครื่องมือบันทึกเห็น ไม่ใช่รหัสHTTPจากserver
- หลังส่งพบแถวในหน้าจอเพิ่มจาก1เป็น75แถว แล้วรอdetailfrmพร้อมไม่สำเร็จ
- 20:30:00.492 น. มีrequest Delete ในบริการgoodstransitiondetailตามflowคืนข้อมูลของเคส
- จบเคส20:32:36.528 น. พร้อมcleanup-warning: Own GCL draft retained HQVM400001917

ข้อสันนิษฐานที่ต้องตรวจฝั่งserver: หาก New Row ไม่แปลง/ตรวจจำนวนและไม่จำกัดลูป ค่าabcอาจทำให้insertจำนวนมาก และการยกเลิกrequest/timeoutฝั่งbrowserอาจไม่ได้หยุดงานserver หากinsertยังทำงานขณะcleanupลบข้อมูลหรือมีparentไม่ถูกต้อง อาจเหลือDetailลอยได้ ยังไม่มีหลักฐานDBยืนยันจำนวนล้านหรือความเป็นparentของแถวที่Devพบ

ให้เทียบaccess/application logช่วง20:29–20:33 น., parentgtcid1101, rowDetailabc, created timestampของDetailจำนวนมาก และแถวparentว่าง/0/ไม่พบparent ห้ามลบข้อมูลจำนวนมากจากการคาดเดาเพียงอย่างเดียว

การตรวจqaauto003 RefHQVM400001853พบ10Detailจริง แต่ไม่ใช่การตรวจตารางDetailทั้งระบบ จึงตัดประเด็นDetailลอยในRefอื่นหรือแถวที่ไม่มีparentไม่ได้

ปิดTC-GCL-086ด้วยtest.skip/เอาbodyอันตรายออกแล้ว จำกัดตัวช่วยNewRow1–3แถว นี่เป็นการป้องกันฝั่งautomation ไม่ใช่การแก้validationหรือข้อมูลค้างฝั่งserver

Trace เดิม: report testcase update/runs/valid-local-20261030-131927655-01/artifacts/functional-gcl-detail-GCL--3673b--not-create-rows-regression-gcl/trace.zip
