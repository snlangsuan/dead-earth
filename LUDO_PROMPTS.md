# สร้าง animation ด้วย Ludo.ai (https://app.ludo.ai/sprite-generator)

ใช้รูปตัวละครเดิมจากเกม (สไตล์ Gemini) เป็น "เฟรมแรก" แล้วให้ Ludo ขยับให้ — สไตล์จะเหมือนเดิมทั้งเกม
และได้ 9–16 เฟรม (ลื่นกว่าเดิมที่มีแค่ 4 เฟรม)

## ตั้งค่า (ใช้แบบนี้ทุกตัว)
| ช่อง | ค่า |
|---|---|
| โหมด | **Animate** (อัปโหลดรูป) |
| First Frame | อัปโหลดไฟล์จาก `assets/gemini/<ชื่อ>.png` ตามตารางด้านล่าง |
| Sprite type | **Sprite** |
| Perspective | **Side-Scroll** |
| Model | **Hydra** |
| Art Style | ไม่ต้องเลือก pixel art (ปล่อยว่าง/Smooth) |
| Number of Frames | เดิน/วิ่ง = **16** · ยืน/โจมตี/ตาย = **9** |
| Sprite Size | **True Size** |
| Animation Margin | **Auto** |
| Loop Animation | **เปิด** (ยกเว้นท่าตาย = ปิด) |

**ดาวน์โหลด:** เลือก *individual frame PNGs (ZIP)* แล้วบันทึกไว้ที่
`~/Documents/workspace/zombie-survival-game/assets/ludo/` ตั้งชื่อไฟล์ตามคอลัมน์ "ชื่อไฟล์ ZIP"
(ถ้าได้เป็น PNG sprite sheet แทน ZIP ก็ได้ ตั้งชื่อเดียวกันแต่เป็น .png)

---

## ลำดับที่ 1 — สำคัญที่สุด: ท่าเดิน (14 อัน)

### ตัวละครผู้เล่น (8 ตัว) — Animation prompt (คัดลอกได้เลย):
```
steady walk cycle moving to the right, legs alternate clearly with full strides, arms swing opposite to the legs, body upright, empty hands, seamless loop
```
| First Frame | ชื่อไฟล์ ZIP |
|---|---|
| char_jake.png | char_jake_walk.zip |
| char_maya.png | char_maya_walk.zip |
| char_ton.png | char_ton_walk.zip |
| char_chan.png | char_chan_walk.zip |
| char_kenji.png | char_kenji_walk.zip |
| char_sofia.png | char_sofia_walk.zip |
| char_joe.png | char_joe_walk.zip |
| char_lina.png | char_lina_walk.zip |

### ซอมบี้ (6 ตัว) — ใช้ prompt ตามตัว
| First Frame | Animation prompt | ชื่อไฟล์ ZIP |
|---|---|---|
| zombie_walker0.png | `slow shambling zombie walk to the right, dragging one foot, limping, arms reaching forward, head lolling, seamless loop` | zombie_walker0_walk.zip |
| zombie_walker1.png | `slow shambling zombie walk to the right, dragging one foot, limping, arms reaching forward, head lolling, seamless loop` | zombie_walker1_walk.zip |
| zombie_runner.png | `frantic zombie sprint to the right, big leaping strides, leaning forward, arms flailing, seamless loop` | zombie_runner_walk.zip |
| zombie_brute.png | `heavy lumbering walk to the right, huge slow stomping steps, shoulders swaying, arms hanging, seamless loop` | zombie_brute_walk.zip |
| zombie_spitter.png | `hunched creeping walk to the right, short dragging steps, swollen head bobbing, seamless loop` | zombie_spitter_walk.zip |
| zombie_boss.png | `monstrous predatory stalk to the right, heavy clawed steps, spiked back rising and falling, seamless loop` | zombie_boss_walk.zip |

---

## ลำดับที่ 2 — ซอมบี้โจมตี + ตาย, ตัวละครยืนหายใจ (20 อัน)

### ซอมบี้โจมตี (9 เฟรม, Loop เปิด) — ทำทั้ง 6 ตัว ชื่อไฟล์ `zombie_<ชื่อ>_attack.zip`
```
zombie lunges forward to the right and claws and bites at someone in front of it, then pulls back, seamless loop
```

### ซอมบี้ตาย (9 เฟรม, **Loop ปิด**) — ทำทั้ง 6 ตัว ชื่อไฟล์ `zombie_<ชื่อ>_death.zip`
```
zombie is shot, staggers backward and collapses face down onto the ground, ends lying completely still
```

### ตัวละครยืน (9 เฟรม, Loop เปิด) — ทำทั้ง 8 ตัว ชื่อไฟล์ `char_<ชื่อ>_idle.zip`
```
subtle idle breathing while standing, chest and shoulders rise and fall gently, tiny weight shift, empty hands, seamless loop
```

---

## ลำดับที่ 3 — ถ้ามีเครดิตเหลือ (15 อัน)

### ตัวละครวิ่ง (16 เฟรม) — ทั้ง 8 ตัว ชื่อไฟล์ `char_<ชื่อ>_run.zip`
```
fast running cycle to the right, long strides with both feet leaving the ground, leaning forward, arms pumping, empty hands, seamless loop
```

### ผู้รอดชีวิต (16 เฟรม) — ใช้ prompt เดินของตัวละครด้านบน
First Frame: `surv_doctor.png`, `surv_engineer.png`, `surv_merchant.png`, `surv_cook.png`, `surv_tailor.png`, `surv_scout.png`, `surv_gen.png`
ชื่อไฟล์: `surv_<ชื่อ>_walk.zip`

---

## เคล็ดลับ
- ถ้าตัวละครหันผิดทาง หรือเดินถอยหลัง → กด Regenerate หรือใช้ "Change Pose" ให้หันขวาก่อน
- ถ้าผลลัพธ์ไม่ลูป (กระตุกตอนวน) → ใช้ "Adjust Sprite Sheet" ปรับโดยไม่ต้องสร้างใหม่
- ทำทีละไม่กี่อันแล้วบอก Claude ได้เลย ไม่ต้องรอครบทุกอัน
- เสร็จแล้วบอก Claude ว่า **"ludo เสร็จแล้ว"** — Claude จะตรวจ ตัดเฟรม จัดตำแหน่ง แล้วใส่เข้าเกมเอง
