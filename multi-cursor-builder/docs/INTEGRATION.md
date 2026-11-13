# 套用到其他網站

## 1. 複製程式

將 src/ 的全部檔案放進目標網站自己的靜態資產目錄。不要從私人 GitHub raw 網址當作正式 CDN，也不要連同 reference/ 的新聞版面與資料一起套入。

## 2. 載入順序

在 head 放 config.js、boot.js、builder.css，接著用 defer 載入 motion.js 和 builder.js，參考 examples/index.html。boot.js 在第一個畫面前隱藏指定元素，避免文字先出現又被清掉；如果引擎沒有載入，它會在 3 秒後解除啟動遮罩。

## 3. 標記元素

```html
<section id="services" data-build-zone>
  <h2 data-build="heading" data-build-id="services-title">服務內容</h2>
  <p data-build="body" data-build-id="services-intro">服務介紹。</p>
  <a href="/contact" data-build="action">聯絡我們</a>
</section>
```

同樣 data-build 值視為同類，可用來模擬複製；data-build-family 可獨立指定類別。data-build-id 可用於相同文字、不同身分的元素。優先選擇文字葉節點，不同時標記父容器和裡面每個子元素。

## 4. 使用自訂選擇器

可以在 config.js 修改 selectors，例如 `["main h1", "main h2", "main p"]`。設定必須在 boot.js 前載入，才能防止第一幀閃爍。明確指定作用範圍，避免把導覽、表單或隱藏副本全選進去。

## 5. 資料更新

先比較新資料和現有資料；內容相同時不要重建 DOM。真正改動或新增內容後，呼叫 CursorBuilder.scan()。引擎會移除已斷線目標的工作並登記新元素。

## 6. 部署與驗證

不需要打包、不需要 runtime npm 套件、不需要 API key。使用目標網站既有的部署方式。此工具不包含網站發布權限或任何帳號憑證。

先跑測試，再用真正瀏覽器驗證大螢幕、手機與快速捲動。部署成功不代表視覺驗收已完成。

## 已知範圍

此版是可讀、可改的 vanilla JS 起點，不是完整的所有框架 SDK。沒有宣稱提供 destroy()、任意多 modal、圖片自動拖放或所有 SPA 生命週期支援。React/Vue 等框架應讓真實內容維持原生渲染，資料穩定後再 scan；卸載整個網站工具時需另做清理整合。
