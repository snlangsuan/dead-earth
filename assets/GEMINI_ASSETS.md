# สร้างภาพเกมด้วย Gemini — ก๊อปแล้ววางได้เลย

**วิธีใช้:** แต่ละหัวข้อมี 1 กล่อง → กดก๊อปทั้งกล่อง วางใน Gemini → บันทึกภาพลง `assets/gemini/` **ตั้งชื่อตามหัวข้อ** (เช่น `char_jake.png`)

**ภาพที่ 1 (`char_jake`) ไม่ต้องแนบอะไร** · ภาพอื่นทั้งหมด **แนบภาพ `char_jake.png` ไปด้วย** (ให้สไตล์เหมือนกัน)

ทำไม่ครบก็ได้ ชิ้นไหนยังไม่มี เกมใช้ภาพเดิมแทน · ทำได้กี่ชิ้นก็บอก Claude ให้ใส่เข้าเกมได้เลย


---
## ตัวละคร

### 1. `char_jake.png` — เจค (ทหาร)
```
A cute chibi soldier with green helmet, green uniform, tactical vest and brown backpack, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 2. `char_maya.png` — มายา (พยาบาล)
```
Same art style as the attached image. A cute chibi nurse with brown ponytail, white uniform with red cross, teal pants, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 3. `char_ton.png` — ต้น (ไรเดอร์)
```
Same art style as the attached image. A cute chibi delivery rider with green cap, orange jacket and jeans, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 4. `char_chan.png` — ลุงชาญ (นักมวย)
```
Same art style as the attached image. A cute chibi old Thai boxer, bald, gray beard, red shirt, black pants, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 5. `char_kenji.png` — เคนจิ (นักดาบ)
```
Same art style as the attached image. A cute chibi Japanese swordsman with top knot hair, dark blue outfit, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 6. `char_sofia.png` — โซเฟีย (นักแม่นปืน)
```
Same art style as the attached image. A cute chibi woman sniper with long blonde hair, purple jacket, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 7. `char_joe.png` — บิ๊กโจ (คนงานเหมือง)
```
Same art style as the attached image. A cute chibi big bearded miner with yellow helmet and orange vest, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 8. `char_lina.png` — ลีน่า (วิศวกร)
```
Same art style as the attached image. A cute chibi woman engineer with black bob hair and goggles, teal jacket, full body, side view facing right, standing straight, arms down, empty hands. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```


---
## ซอมบี้

### 9. `zombie_walker0.png` — ซอมบี้ธรรมดา 1
```
Same art style as the attached image. A cartoon zombie with green skin and torn brown shirt, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 10. `zombie_walker1.png` — ซอมบี้ธรรมดา 2
```
Same art style as the attached image. A cartoon zombie with pale skin and torn blue office shirt, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 11. `zombie_runner.png` — ซอมบี้วิ่ง
```
Same art style as the attached image. A cartoon thin fast zombie in torn sport clothes, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 12. `zombie_brute.png` — ซอมบี้ยักษ์
```
Same art style as the attached image. A cartoon huge muscular zombie with big arms, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 13. `zombie_spitter.png` — ซอมบี้พ่นกรด
```
Same art style as the attached image. A cartoon zombie with a swollen yellow-green head, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 14. `zombie_boss.png` — บอส
```
Same art style as the attached image. A cartoon giant red mutant zombie boss with bone spikes, full body, side view facing right, arms reaching forward. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```


---
## เฟอร์นิเจอร์

### 15. `furn_bed.png` — เตียง
```
Same art style as the attached image. A single bed with pillow and blanket, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 16. `furn_bunk.png` — เตียงสองชั้น
```
Same art style as the attached image. A metal bunk bed, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 17. `furn_sofa.png` — โซฟา
```
Same art style as the attached image. A old sofa, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 18. `furn_wardrobe.png` — ตู้เสื้อผ้า
```
Same art style as the attached image. A wooden wardrobe, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 19. `furn_desk.png` — โต๊ะทำงาน
```
Same art style as the attached image. A office desk with an old computer, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 20. `furn_bookshelf.png` — ชั้นหนังสือ
```
Same art style as the attached image. A tall bookshelf with books, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 21. `furn_fridge.png` — ตู้เย็น
```
Same art style as the attached image. A refrigerator, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 22. `furn_counter.png` — เคาน์เตอร์ครัว
```
Same art style as the attached image. A kitchen counter with cabinets, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 23. `furn_medcab.png` — ตู้ยา
```
Same art style as the attached image. A white medicine cabinet with a red cross, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 24. `furn_hospbed.png` — เตียงผู้ป่วย
```
Same art style as the attached image. A hospital bed, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 25. `furn_locker.png` — ล็อกเกอร์
```
Same art style as the attached image. A three metal lockers side by side, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 26. `furn_crate.png` — ลังไม้
```
Same art style as the attached image. A wooden crate, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 27. `furn_shelfunit.png` — ชั้นวางสินค้า
```
Same art style as the attached image. A store shelf with products, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 28. `furn_register.png` — เคาน์เตอร์คิดเงิน
```
Same art style as the attached image. A cash register counter, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 29. `furn_toolbench.png` — โต๊ะช่าง
```
Same art style as the attached image. A workbench with tools, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 30. `furn_car.png` — รถยนต์ร้าง
```
Same art style as the attached image. A abandoned car, side view, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 31. `furn_dumpster.png` — ถังขยะใหญ่
```
Same art style as the attached image. A green dumpster, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 32. `furn_safe.png` — ตู้เซฟ
```
Same art style as the attached image. A steel safe, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 33. `furn_filecab.png` — ตู้เอกสาร
```
Same art style as the attached image. A metal filing cabinet, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 34. `furn_tvstand.png` — ชั้นวางทีวี
```
Same art style as the attached image. A TV stand with an old TV, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 35. `furn_stove.png` — เตาอบ
```
Same art style as the attached image. A kitchen stove oven, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 36. `furn_labtable.png` — โต๊ะแล็บ
```
Same art style as the attached image. A laboratory table with glass beakers, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 37. `furn_server.png` — ตู้เซิร์ฟเวอร์
```
Same art style as the attached image. A server rack with blinking lights, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 38. `furn_stallcart.png` — แผงขายของ
```
Same art style as the attached image. A market stall cart with striped awning and fruits, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 39. `furn_weaponrack.png` — ชั้นวางอาวุธ
```
Same art style as the attached image. A military weapon rack with rifles, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 40. `furn_rack.png` — ราวเสื้อผ้า
```
Same art style as the attached image. A clothes rack with shirts, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 41. `furn_supply.png` — กล่องเสบียงทิ้งร่ม
```
Same art style as the attached image. A blue supply crate with a parachute, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 42. `furn_generator.png` — เครื่องปั่นไฟ
```
Same art style as the attached image. A yellow electric generator, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 43. `furn_body.png` — ศพ
```
Same art style as the attached image. A dead body lying on the floor, cartoon, not gory, front view, slightly dirty and old. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```


---
## อาวุธ

### 44. `wpn_knife.png` — มีด
```
Same art style as the attached image. A cartoon combat knife, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 45. `wpn_bat.png` — ไม้เบสบอล
```
Same art style as the attached image. A cartoon wooden baseball bat, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 46. `wpn_machete.png` — มีดมาเชเต้
```
Same art style as the attached image. A cartoon machete, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 47. `wpn_fireaxe.png` — ขวานดับเพลิง
```
Same art style as the attached image. A cartoon red fire axe, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 48. `wpn_katana.png` — คาตานะ
```
Same art style as the attached image. A cartoon katana sword, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 49. `wpn_pistol.png` — ปืนพก
```
Same art style as the attached image. A cartoon 9mm pistol, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 50. `wpn_revolver.png` — ลูกโม่
```
Same art style as the attached image. A cartoon revolver, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 51. `wpn_smg.png` — ปืนกลมือ
```
Same art style as the attached image. A cartoon submachine gun, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 52. `wpn_shotgun.png` — ลูกซอง
```
Same art style as the attached image. A cartoon pump shotgun, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 53. `wpn_rifle.png` — ไรเฟิลจู่โจม
```
Same art style as the attached image. A cartoon assault rifle, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 54. `wpn_sniper.png` — ปืนซุ่มยิง
```
Same art style as the attached image. A cartoon sniper rifle with scope, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 55. `wpn_crossbow.png` — หน้าไม้
```
Same art style as the attached image. A cartoon crossbow, side view pointing right. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```


---
## ไอคอนของ

### 56. `icon_canned.png` — อาหารกระป๋อง
```
Same art style as the attached image. A game item icon of a can of food, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 57. `icon_water.png` — ขวดน้ำ
```
Same art style as the attached image. A game item icon of a plastic water bottle, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 58. `icon_bar.png` — ช็อกโกแลต
```
Same art style as the attached image. A game item icon of a chocolate bar, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 59. `icon_mre.png` — เสบียงทหาร
```
Same art style as the attached image. A game item icon of a military ration pack, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 60. `icon_stew.png` — สตูว์
```
Same art style as the attached image. A game item icon of a bowl of hot stew, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 61. `icon_bandage.png` — ผ้าพันแผล
```
Same art style as the attached image. A game item icon of a rolled bandage, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 62. `icon_pills.png` — ขวดยา
```
Same art style as the attached image. A game item icon of a pill bottle, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 63. `icon_medkit.png` — ชุดปฐมพยาบาล
```
Same art style as the attached image. A game item icon of a red first aid kit, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 64. `icon_antiviral.png` — ยาต้านไวรัส
```
Same art style as the attached image. A game item icon of a syringe with blue liquid, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 65. `icon_adrenaline.png` — อะดรีนาลีน
```
Same art style as the attached image. A game item icon of a syringe with yellow liquid, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 66. `icon_a9.png` — กระสุน 9มม.
```
Same art style as the attached image. A game item icon of a box of pistol bullets, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 67. `icon_a44.png` — กระสุน .44
```
Same art style as the attached image. A game item icon of a box of revolver bullets, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 68. `icon_a12.png` — กระสุนลูกซอง
```
Same art style as the attached image. A game item icon of a box of red shotgun shells, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 69. `icon_a556.png` — กระสุนไรเฟิล
```
Same art style as the attached image. A game item icon of a box of rifle bullets, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 70. `icon_a762.png` — กระสุนซุ่มยิง
```
Same art style as the attached image. A game item icon of a box of long sniper bullets, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 71. `icon_bolt.png` — ลูกดอกหน้าไม้
```
Same art style as the attached image. A game item icon of a bundle of crossbow bolts, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 72. `icon_grenade.png` — ระเบิดมือ
```
Same art style as the attached image. A game item icon of a hand grenade, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 73. `icon_gunparts.png` — ชิ้นส่วนปืน
```
Same art style as the attached image. A game item icon of metal gears and gun parts, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 74. `icon_scope.png` — กล้องเล็ง
```
Same art style as the attached image. A game item icon of a rifle scope, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 75. `icon_extmag.png` — แม็กกาซีนขยาย
```
Same art style as the attached image. A game item icon of an extended gun magazine, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 76. `icon_silencer.png` — ท่อเก็บเสียง
```
Same art style as the attached image. A game item icon of a gun silencer, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 77. `icon_grip.png` — กริปจับ
```
Same art style as the attached image. A game item icon of a gun foregrip, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 78. `icon_scrap.png` — เศษเหล็ก
```
Same art style as the attached image. A game item icon of a pile of scrap metal, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 79. `icon_cloth.png` — ผ้า
```
Same art style as the attached image. A game item icon of a folded piece of cloth, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 80. `icon_chem.png` — สารเคมี
```
Same art style as the attached image. A game item icon of a flask of green chemical, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 81. `icon_elec.png` — อิเล็กทรอนิกส์
```
Same art style as the attached image. A game item icon of an electronic circuit board, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 82. `icon_watch.png` — นาฬิกาทอง
```
Same art style as the attached image. A game item icon of a gold wristwatch, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 83. `icon_jewelry.png` — เครื่องประดับ
```
Same art style as the attached image. A game item icon of a gold necklace with a gem, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 84. `icon_laptop.png` — แล็ปท็อป
```
Same art style as the attached image. A game item icon of a laptop, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 85. `icon_gold.png` — ทองคำแท่ง
```
Same art style as the attached image. A game item icon of a gold bar, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 86. `icon_fuse.png` — ฟิวส์
```
Same art style as the attached image. A game item icon of an electrical fuse, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 87. `icon_datadrive.png` — ไดรฟ์ข้อมูล
```
Same art style as the attached image. A game item icon of a data drive, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 88. `icon_sample.png` — ตัวอย่างไวรัส
```
Same art style as the attached image. A game item icon of a test tube with green virus sample, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 89. `icon_radio.png` — วิทยุ
```
Same art style as the attached image. A game item icon of a walkie-talkie radio, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```

### 90. `icon_cash.png` — เงินสด
```
Same art style as the attached image. A game item icon of a stack of green banknotes, centered. Cartoon 2D mobile game style, thick dark outline, soft shading, muted colors, plain white background, no text.
```


---
**แนะนำ:** ทำข้อ 1 (`char_jake`) กับข้อ 9 (`zombie_walker0`) แล้วส่งให้ Claude ลองใส่ในเกมดูก่อน
