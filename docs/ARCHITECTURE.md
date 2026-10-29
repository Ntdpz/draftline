# โครงสร้างและจุดเริ่มอ่านโค้ด

Draftline ใช้ PHP แบบ page-based และ Vanilla JavaScript โดยแยกไฟล์ตามหน้าที่ โครงสร้างนี้ช่วยให้หาโค้ดได้โดยไม่เพิ่ม framework หรือชั้น MVC ที่แอปยังไม่จำเป็นต้องใช้

## โฟลเดอร์หลัก

| ตำแหน่ง | หน้าที่ | เมื่อไหร่ควรเปิด |
| --- | --- | --- |
| `public/` | Document root และ entry points ของหน้าเว็บ | เพิ่มหน้าใหม่หรือแก้จุดเรียก shared layout |
| `public/assets/css/` | Layout, typography, tokens และ responsive | แก้หน้าตาและขนาดหน้าจอ |
| `public/assets/js/` | Model, storage, renderer และ interaction | แก้พฤติกรรมหรือข้อมูล |
| `public/assets/fonts/` | ฟอนต์ที่ใช้จริงและ licenses | เปลี่ยน typography หรือแก้ export font |
| `public/assets/images/` | ภาพและไอคอนที่เว็บเรียกใช้ | เพิ่ม static visual assets |
| `app/views/` | PHP สำหรับ layout และส่วนประกอบร่วม | แก้ head, navigation, editor markup หรือ dialog |
| `design/` | ต้นฉบับ Pencil และภาพอ้างอิง | ตรวจหรือแก้แบบก่อน implement |
| `docs/` | เอกสารสำหรับผู้พัฒนาและภาพประกอบพอร์ต | ทำความเข้าใจระบบและดีไซน์ |
| `tests/browser/` | Functional และ responsive browser tests | ตรวจว่า workflow ยังทำงานหลังแก้โค้ด |
| `tests/run.cjs` | ตัวเรียกชุดทดสอบ | เพิ่มหรือเปลี่ยนชุดทดสอบ |
| `compose.yaml` | Local PHP container configuration | เปลี่ยน runtime หรือ port |

Root เก็บ README และไฟล์ตั้งค่าเป็นหลัก ส่วน `test-results/` และ `node_modules/` เกิดเฉพาะเมื่อใช้งานเครื่องมือทดสอบและถูกละไว้ใน `.gitignore`

## เริ่มอ่านจากตรงไหน

### ดูการทำงานของหน้าเว็บ

1. เปิด `public/workspace.php` เพื่อดู entry point ของหน้า My Workspace
2. ตามไป `app/views/layout.php` เพื่อดู shared shell และ navigation
3. เปิด `app/views/components.php` เพื่อดู `head()`, icons, editor และ dialogs
4. ดู `public/assets/js/pages.js` เพื่ออ่าน controller ของแต่ละหน้า
5. ตามฟังก์ชันข้อมูลและ rendering ไป `public/assets/js/core.js`

### แก้ Flow Editor

- `public/canvas.php` เรียกโครงหน้า editor
- `app/views/components.php` มี markup สำหรับ canvas, tools และ dialogs
- `public/assets/js/app.js` จัดการเลือก แก้ ลาก Undo และบันทึก
- `public/assets/js/core.js` ตรวจ model วัดข้อความ วาดรูปทรงและเส้นเชื่อม
- `public/assets/css/styles.css` เป็นสไตล์หลักของ landing และ editor

### แก้หน้าแอปและ responsive

- `public/assets/js/pages.js` สร้าง UI และจัดการ action ของหน้าใหม่
- `public/assets/css/workspace.css` เป็นสไตล์ของหน้าจัดการงาน
- [DESIGN.md](DESIGN.md) ระบุ design tokens และข้อควรรักษา

## กติกาเส้นทางไฟล์

### เส้นทาง PHP

Entry points อยู่ใน `public/` และเรียก layout ด้วย filesystem path:

```php
require dirname(__DIR__).'/app/views/layout.php';
```

Layout เรียก components ในโฟลเดอร์เดียวกัน:

```php
require_once __DIR__.'/components.php';
```

`app/` อยู่นอก document root จึงไม่ได้เป็น URL สำหรับเปิดโดยตรงจากเว็บ

### เส้นทาง assets

หน้าเว็บเรียก CSS และ JavaScript ผ่าน `assets/css/` และ `assets/js/` ฟอนต์ใน CSS ใช้ `../fonts/` เพราะเริ่มอ้างอิงจากตำแหน่งของไฟล์ CSS

การโหลดฟอนต์เพื่อ export ใน JavaScript ใช้ `assets/fonts/` ซึ่งอ้างอิงจาก URL ของหน้าเว็บ ไม่ใช่ตำแหน่งไฟล์ JavaScript

### URL และข้อมูลเดิม

ตั้ง document root เป็น `public/` แล้ว URL ยังคงเป็น `/workspace.php`, `/canvas.php` และหน้าเดิมทั้งหมด ไม่ต้องเติม `/public/` ใน URL

คง protocol, hostname และ port เดิม เช่น `http://localhost:8096/` เพื่อให้ Web Storage ยังอ่านข้อมูลชุดเดิม การเปลี่ยนโครงสร้างไฟล์ไม่ได้เปลี่ยน storage keys หรือ migrate ข้อมูลผู้ใช้

## การรันและทดสอบ

จาก root ของโปรเจกต์:

```powershell
php -S 127.0.0.1:8096 -t public
```

หรือใช้ Compose เมื่อมี local image ตาม [README](../README.md):

```powershell
docker compose -p draftline up -d
```

Compose ตั้ง `-t /app/public` ให้แล้ว หากมี container เดิมให้รันคำสั่ง up อีกครั้งเพื่ออัปเดต configuration

```powershell
npm test
```

Test runner เรียก `tests/browser/functional.cjs` และ `tests/browser/responsive.cjs` ตามลำดับ Default output ยังคงเป็น `test-results/` ที่ root

## เมื่อต้องเพิ่มหรือแก้ฟีเจอร์

- เพิ่มหน้า PHP ใน `public/` ใช้ shared layout เดิมและเพิ่ม controller ใน `pages.js` ตามรูปแบบที่มี
- เก็บกติกา model, storage และ rendering ร่วมไว้ใน `core.js` เพื่อให้ editor, preview และ export ตรงกัน
- เก็บภาพสำหรับเว็บใน `public/assets/images/` ภาพสำหรับเอกสารไว้ใน `docs/images/`
- เปิดไฟล์ `design/draftline.pen` ผ่าน Pencil เมื่อต้องแก้ต้นฉบับดีไซน์
- เพิ่ม dependency ใน `package.json` เมื่อมีเหตุผลที่จำเป็น โดยแยกเครื่องมือทดสอบออกจาก runtime
- เมื่อเปลี่ยน URL หรือ asset path ให้ตรวจ workflow, responsive และการ export ซึ่งโหลดฟอนต์เพิ่มเติมด้วย

