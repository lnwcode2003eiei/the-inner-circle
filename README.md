# The Inner Circle

เกมเจรจาธุรกิจออนไลน์ 3–6 คน: React, TypeScript, Vite, Tailwind, Framer Motion, Express, Socket.IO และ PostgreSQL ชื่อเกม โลโก้ กติกาย่อยและการ์ดสร้างใหม่ ไม่ใช้ทรัพย์สินเกมต้นฉบับ

## เริ่มเล่นในเครื่อง

ใช้ Node.js 22.12+ และ npm (ทดสอบบน Node 24)

```sh
npm install
cp .env.example .env
cp server/.env.example server/.env
npm run dev
```

PowerShell ใช้ Copy-Item แทน cp ได้ เปิด http://localhost:5173 เซิร์ฟเวอร์อยู่ http://localhost:3001 หาก environment จำกัดการ watch ให้รัน `npm run build:server` และ `npm run start:server` ใน terminal หนึ่ง และ `npm run dev:client` อีก terminal

Create a room แล้วแชร์รหัสให้เพื่อน 2–5 คน ทุกคน ready แล้ว host กด start ส่วน Practice room เล่นครบ 15 deals กับคู่แข่งจำลองสามคนได้ทันที บอทเสนอส่วนแบ่งเท่ากันและรับข้อเสนอที่ผ่าน validation

ทดสอบหลายตัวตนด้วยคนละ browser profile/private window เพราะ localStorage ใช้ตัวตนร่วมกันใน origin เดียว เล่นผ่าน LAN ต้องตั้ง VITE_SERVER_URL เป็น LAN URL ของ backend และเพิ่ม frontend origin ใน CLIENT_URL (comma-separated)

## กติกา

15 deals ดีลละ 90 วินาที Investor A–F แจกครบแบบวนลำดับ ผู้ถือ investor ที่จำเป็นและผู้นำเข้าร่วมแบ่งเงิน ต้องแบ่งครบมูลค่าดีล เงินเป็นจำนวนเต็มบาท ห้ามยอดติดลบ ทศนิยม ผู้รับที่ไม่เกี่ยวข้อง หรือยอดรวมผิด ทุกคนที่เกี่ยวข้องต้องยอมรับ การแก้ข้อเสนอหรือเล่นการ์ดล้าง approvals เดิม Server จ่ายแล้วเปลี่ยนดีลทันทีเพื่อป้องกันจ่ายซ้ำ

- Take Control: เปลี่ยนผู้นำ
- Replace Investor / Wild Investor: เป็นตัวแทน investor ที่จำเป็นหนึ่งประเภทในดีลปัจจุบัน
- Block: กีดกันคู่แข่ง ผู้ใช้แทน investor ของผู้ถูกบล็อกที่ดีลต้องใช้ และรับตำแหน่งผู้นำหากบล็อกผู้นำ
- Counter: ยกเลิกการ์ดล่าสุด สามารถ counter ซ้อนได้ มีหน้าต่างตอบโต้ 5 วินาทีทุกครั้งและ resolve ย้อนลำดับ
- Steal Deal: เพิ่มตัวเองเป็นผู้เข้าร่วมบังคับ

ทุก effect หมดเมื่อขึ้นดีลใหม่ แจกการ์ดเพิ่มหนึ่งใบต่อดีล (สูงสุด 8 ใบ) ผู้นำ pass ได้เมื่อ stack ว่าง หมดเวลาถือว่าดีลล้มเหลว เงินมากที่สุดเมื่อจบชนะ เงินเท่ากันถือว่าเสมอ

## โครงสร้าง

- `src/`: React frontend ใน Vite workspace เดิม มี lobby, board, negotiation, cards, chat, records, rules
- `src/services/socket.ts`: typed Socket.IO singleton
- `shared/`: types, events, constants และ deal deck
- `server/src/index.ts`: HTTP/Socket transport, session และ rate limits
- `server/src/game/engine.ts`: กติกา clocks stack และ private views แยกจาก Socket layer
- `server/src/database/store.ts`: schema, match persistence, history และ leaderboard
- `public/sounds/`: เสียง local ที่สร้างสำหรับโปรเจกต์
- `render.yaml`, `vercel.json`: deployment configuration

game:state ส่ง snapshot เฉพาะผู้รับ ไม่เปิด hand ของคู่แข่งหรือ reconnect token ใช้ random opaque bearer token 256-bit เก็บใน localStorage และ mapping ฝั่ง server (ไม่ใช้ JWT จึงไม่ใช้ JWT_SECRET ใน implementation นี้)

Events: room:create, room:join, player:reconnect, player:action, game:sync, game:state, system:error เหตุการณ์ย่อยรวมผ่าน discriminated Action union และ authoritative snapshot Chat จำกัด 5 ข้อความ/5 วินาที มี limit รวมต่อ socket, packet size, room capacity และ message length

## ตรวจสอบ

```sh
npm test
npm run build
npm run build:server
npm run lint
```

Tests ครอบคลุมข้อเสนอผิดสิทธิ์/ผิดกติกา การ reset approvals การจ่ายเพียงครั้งเดียว counter chain private-hand projection การหมดเวลา และการเล่นครบ 15 deals

## Deploy: PostgreSQL → Render → Vercel

### 1. PostgreSQL

สร้าง Render PostgreSQL ใน region เดียวกับ backend หรือใช้ Supabase PostgreSQL ตั้ง connection string ใน DATABASE_URL ฝั่ง Render เท่านั้น Server สร้างตาราง matches อัตโนมัติ (ต้องมีสิทธิ์ CREATE TABLE) และบันทึกผลแบบ idempotent JSONB หากตั้ง URL แล้วเชื่อมไม่ได้ server จะไม่เริ่ม

ไม่ตั้ง DATABASE_URL ยังเล่นได้ แต่ history/leaderboard ว่าง ผู้เล่นเป็น guest identity ยังไม่มีบัญชีถาวร leaderboard รวมตาม display name และใช้เงินสูงสุดต่อเกม จึงไม่เหมาะสำหรับการแข่งขันยืนยันตัวตน

### 2. Render backend

1. Push repository ไป Git provider ของคุณ
2. Render → New → Web Service → เชื่อม repository หรือใช้ Blueprint render.yaml
3. Runtime Node, Root Directory เว้นว่างเพราะต้องใช้ shared/
4. Build: `npm ci && npm run build:server`
5. Start: `npm run start:server`
6. Health Check Path: `/health`
7. ตั้ง NODE_ENV=production, CLIENT_URL=https://YOUR-FRONTEND.vercel.app, DATABASE_URL=postgresql://...
8. JWT_SECRET เป็นค่าที่สำรองไว้สำหรับต่อยอด auth ปัจจุบันใช้ opaque token
9. Deploy และตรวจ /health ต้องได้ {"status":"ok"}

HTTP และ Socket.IO ใช้ server เดียว รับ process.env.PORT และ bind 0.0.0.0 Render จัดการ HTTPS/WSS ไม่เปิดพอร์ต Socket แยกและไม่ใช้ Vercel serverless เป็น Socket server

### 3. Vercel frontend

1. Add New Project → repository เดียวกัน
2. Framework Vite, Root Directory เว้นว่าง
3. Install: npm ci, Build: npm run build, Output: dist
4. ตั้ง VITE_SERVER_URL=https://YOUR-SERVER.onrender.com
5. Deploy แล้วนำ frontend origin ที่ได้ไปตั้ง CLIENT_URL บน Render และ redeploy backend
6. เปิด /game/ABCDE ตรง ๆ และ refresh ต้องไม่เป็น 404 (vercel.json มี SPA rewrite)
7. ทดสอบคนละเครื่อง: create, join, ready, offer, chat, cards แล้ว refresh ผู้เล่นหนึ่งคนตรวจ reconnect

Frontend มีเฉพาะ public server URL ห้ามใส่ DATABASE_URL หรือ secret ใน VITE_ variables

อ้างอิง: [Render Express](https://render.com/docs/deploy-node-express-app), [Render WebSockets](https://render.com/docs/websocket), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

## ขอบเขตการใช้งานจริง

Active rooms, tokens และ clocks อยู่ใน memory ของ process เดียว Refresh browser กู้สถานะได้ แต่ backend restart/deploy ทำให้ห้องหมดอายุ UI แจ้งให้สร้าง/เข้าห้องใหม่ ใช้ instance ที่ไม่ sleep เพื่อความต่อเนื่อง ก่อนขยายหลาย instance ต้องย้าย room/session store ไป Redis เพิ่ม Socket.IO Redis adapter และ atomic action serialization

ยังไม่ได้เชื่อมบัญชี hosting หรือฐานข้อมูลจริงใน workspace นี้ ต้องตั้งค่าบริการข้างต้นก่อนเล่นผ่านอินเทอร์เน็ต ภาพสถาปัตยกรรม/portraits จาก Unsplash ฟอนต์ Google Fonts โลโก้ SVG และเสียงสร้างสำหรับโปรเจกต์นี้

## ภาษาและธีม

หน้าเกม กติกา การ์ด ข้อความแจ้งเตือน และบันทึกเหตุการณ์ใช้ภาษาไทย แสดงเงินเป็นหน่วยล้านบาทและวันที่/เวลารูปแบบไทย ธีมใช้พื้นขาว เมนูน้ำเงิน ปุ่มหลักสีแดง และรายละเอียดสีทอง ฟอนต์ Noto Sans Thai / Noto Serif Thai ชื่อแบรนด์ The Inner Circle และรหัสนักลงทุน A–F คงเดิม โดยรหัส Socket และกติกาไม่เปลี่ยน


## Deploy แบบไม่ใช้ฐานข้อมูล

Blueprint ปัจจุบันสร้างเฉพาะ Render Web Service แผน Free ไม่สร้าง PostgreSQL และไม่ต้องตั้ง DATABASE_URL หรือ JWT_SECRET ตั้งเพียง CLIENT_URL เป็น origin ของ Vercel และ VITE_SERVER_URL บน Vercel ให้ชี้ไป Render ประวัติและอันดับถาวรจะไม่ถูกบันทึก ห้องที่กำลังเล่นหายเมื่อเซิร์ฟเวอร์รีสตาร์ต

