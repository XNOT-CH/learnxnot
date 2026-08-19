# LearnXNot — แอปท่องศัพท์ภาษาอังกฤษ

เว็บแอปสำหรับจดคำศัพท์ภาษาอังกฤษ ทดสอบตัวเอง และติดตามความก้าวหน้า
ข้อมูลทั้งหมดเก็บไว้ใน `localStorage` ของเบราว์เซอร์ ไม่ต้องสมัครสมาชิกและไม่มีเซิร์ฟเวอร์

## ฟีเจอร์

- **หมวดหมู่คำศัพท์** — สร้าง/แก้ไข/ลบหมวด แล้วเก็บคำศัพท์ไว้ข้างใน ย้ายคำข้ามหมวดได้
- **ทดสอบ 2 โหมด** — อังกฤษ→ไทย และ ไทย→อังกฤษ เลือกหมวดและจำนวนข้อได้
- **สุ่มข้อแบบถ่วงน้ำหนัก** — คำที่เคยตอบผิดบ่อยจะถูกหยิบมาถามบ่อยขึ้น
- **อ่านออกเสียง** — ใช้ Web Speech API ของเบราว์เซอร์
- **สถิติรายคำ** — ความแม่นยำ คำที่เชี่ยวชาญแล้ว และคำที่ควรทบทวน
- **สำรอง / นำเข้าข้อมูล** — export เป็นไฟล์ JSON แล้วนำกลับเข้ามาได้

## เริ่มใช้งาน

```bash
npm install
npm run dev      # เปิด dev server ที่ http://localhost:5173
```

คำสั่งอื่น ๆ:

```bash
npm run build    # build ไปที่ dist/
npm run preview  # ดูผลลัพธ์ที่ build แล้ว
npm run lint     # ตรวจโค้ดด้วย oxlint
```

## เทคโนโลยีที่ใช้

React 19 · Vite · React Router · Tailwind CSS v4 · lucide-react · oxlint

## โครงสร้างโปรเจกต์

```
src/
├── main.jsx                  จุดเริ่มต้น (Router + ErrorBoundary)
├── App.jsx                   layout และ routing
├── index.css                 ธีมสี ตัวแปร CSS และ animation
├── components/
│   ├── Navbar.jsx            แถบนำทางด้านบน
│   └── ErrorBoundary.jsx     ดักข้อผิดพลาดไม่ให้จอขาว
├── pages/
│   ├── VocabularyPage.jsx    จัดการหมวดหมู่และคำศัพท์ + สำรองข้อมูล
│   ├── QuizPage.jsx          หน้าทดสอบ
│   └── StatsPage.jsx         สถิติและคำที่ควรทบทวน
└── utils/
    ├── storage.js            อ่าน/เขียน localStorage, migrate, ตรวจไฟล์สำรอง
    ├── quiz.js               สุ่มข้อถ่วงน้ำหนัก, ตรวจคำตอบ, สร้าง id
    └── speech.js             อ่านออกเสียงภาษาอังกฤษ
```

## การเก็บข้อมูล

ข้อมูลอยู่ใน `localStorage` 3 คีย์:

| คีย์ | เก็บอะไร |
| --- | --- |
| `learnxnot_vocabulary` | `[{ id, english, thai, categoryId }]` |
| `learnxnot_categories` | `[{ id, name, createdAt }]` |
| `learnxnot_stats` | `{ [wordId]: { correct, wrong } }` |

การล้างข้อมูลเบราว์เซอร์จะลบคำศัพท์ทั้งหมด — แนะนำให้กด "สำรองข้อมูล" เก็บไฟล์ JSON ไว้เป็นระยะ

## Deploy

ตั้งค่าไว้สำหรับ Vercel แล้ว (`vercel.json` มี SPA rewrite ให้เข้า URL ตรง ๆ ได้)
โฮสต์อื่นที่เสิร์ฟ static file ได้ก็ใช้ได้เหมือนกัน โดย build แล้ว deploy โฟลเดอร์ `dist/`
