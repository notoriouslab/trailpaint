# 投稿照片：同意書與收錄步驟

給故事頁收錄別人拍的照片用。照片在故事裡標「投稿」並署名，授權 CC BY 4.0。

## 同意書（請投稿人回覆）

把下面這段傳給投稿人（Email、LINE 都可以），請對方填好署名後整段回覆：

> 我同意把以下照片提供給 TrailPaint（trailpaint.org）使用：
>
> - 照片：（檔名或說明，例如「公館水岸廣場，2026 年 10 月拍」）
> - 這些照片是我本人拍攝，我有權授權。
> - 我同意以 CC BY 4.0 授權：任何人可以使用、修改、轉載，只要標出我的署名。
> - 署名請寫：（例如本名、暱稱，或「匿名」）
> - 照片裡如有可辨識的人，我已取得他們同意。
>
> （日期）

CC BY 4.0 授權一旦給出無法撤回；之後投稿人想下架，TrailPaint 仍會盡量配合從故事移除，但已被轉載的副本無法收回。傳同意書時請一併說明。

## 收錄步驟

1. 保存對方的回覆（信件或對話截圖）在維護者自己的紀錄，不放進 repo，因為裡面有聯絡方式。
2. 照片縮到長邊 1600px 以內、存成 JPEG、清掉 EXIF（含 GPS），放到 `data/places/photos/<TOWNCODE>/`。單檔要在 1 MB 以內。
3. 資料池那一筆的 `photo` 寫：

   ```json
   "photo": {
     "local": "data/places/photos/63000030/gongguan-riverside.jpg",
     "kind": "contributor",
     "author": "署名"
   }
   ```

4. 重建故事：`node online/scripts/build-taiwan-story.mjs <id>`。builder 會把照片寫成故事目錄下的 `spot-photos/<hash>.jpg`，CREDITS 標「投稿」。
5. `cd online && npm run check:stories` 通過後再提交。
