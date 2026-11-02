# ผลรันซ้ำและ debug GCL — 30 ตุลาคม 2026

ลบ TC-GCL-183, TC-GCL-154 และ TC-GCL-156 ตามคำสั่งผู้ใช้ ออกจากสคริปต์ รายงาน เมนู และแผนรันต่อ; exclusions ป้องกันนำกลับจาก snapshot เก่า ปัจจุบันรวม257เคส Import84/Export68/GCL105

รอบรันทวนเดิม8เคส: `runs/valid-local-20261030-131927655-01` รอบตรวจการแก้wait: `runs/valid-local-20261030-133949621-01`

| ID | ผลล่าสุด | หลักฐาน/การ debug |
|---|---|---|
| TC-GCL-081 | PASS | เตรียม owned Export Source และเพิ่ม source1ใบ เปิดซ้ำแล้วค่าตรง |
| TC-GCL-082 | PASS | หน้า Add Detail มี createBTN แต่โหลดช้ากว่า5s ปรับเวลารอเป็น45s ตามรูปแบบwaitของเคสที่ผ่าน แล้วรันซ้ำผ่าน |
| TC-GCL-083 | PASS | ไม่เลือกsource มีdialogใหม่และข้อมูลเดิมคงอยู่ |
| TC-GCL-101 | PASS | tree/source/จำนวนตรง Detail ในรอบใหม่ |
| TC-GCL-086 | FAIL | ค่าว่างเพิ่ม1เป็น2แถว; abcเพิ่ม1เป็น75แถว จากนั้นรอdetailfrmพร้อมไม่สำเร็จ เก็บtraceแล้วและไม่รันabcซ้ำเพื่อป้องกันข้อมูลเพิ่มจำนวนมาก |
| TC-GCL-104 | FAIL | Package -1 และ Gross Weight -1.000 บันทึกได้จริง; abcแปลงเป็น0/0.000 ตรวจครบและคืนค่าเดิมแล้ว |

แก้ GclCsvPage.submit ให้รอ document ใหม่โหลดเสร็จและvalidation/redirectทำงานก่อนค้นinventory ตามwaitForReloadที่ใช้ในเคสผ่าน รันทวน154/156หลังแก้แล้วข้อผิดพลาดข้อมูลยังเกิดจริง ก่อนผู้ใช้สั่งลบทั้งสองเคส

ไม่ปรับexpectedให้ยอมรับค่าติดลบหรือข้อมูลผิดเพื่อแสดงPASS Repositoryนี้เป็นชุดautomation ไม่ได้มีโค้ดPHPฝั่งSPNที่ต้องแก้validation

TC-GCL-086 cleanup fixture ไม่สำเร็จและรายงาน retained Draft HQVM400001917 ไว้ในหลักฐาน sourceExportทดสอบยังเก็บเป็นACCEPT fixture ตามflowเดิม

ผลรวมGCLล่าสุด: PASS98 / FAIL2 / SKIP5 รวม105เคส ผลใหม่อยู่ในHTMLเดิม
