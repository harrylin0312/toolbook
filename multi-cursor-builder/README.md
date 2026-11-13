# 多游標建立網頁 · Multi Cursor Builder

版本 **1.0.0**。多個彩色游標在可見視窗內分工：依序出動、一次拉出元素方格、直接輸入文字，做完後平滑回到右側，稍微重疊休息。

## 先讀這些檔案

- [AGENTS.md](AGENTS.md)：接手順序與不可自行更改的行為。
- [docs/SPEC.md](docs/SPEC.md)：精確的動作、時間與狀態規格。
- [docs/INTEGRATION.md](docs/INTEGRATION.md)：套到其他網站的方法。
- [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)：驗收項目與已知驗證限制。
- [config/defaults.json](config/defaults.json)：可查閱的預設設定。

## 內容

| 路徑 | 說明 |
| --- | --- |
| `src/` | 可套用版：動畫引擎、動作計算、獨立 CSS、啟動與設定檔；不依賴新聞站版型 |
| `examples/index.html` | 不需要 npm 的離線示範頁，使用示範資料而非真實新聞 |
| `reference/daily-brief/` | 已部署的原站原始碼快照；新聞資料、篩選、詳細頁對話框與刊期功能均保留 |
| `reference/original-inspiration.mov` | 使用者提供的最初影片，僅作動作語彙參考；不是目前實作的驗收錄影 |
| `reference/manifest.json` | 參考來源 commit 與檔案 SHA-256，供比對重現 |
| `tests/` | 動作計算與可套用版本的 DOM 測試 |

## 跑示範

```sh
cd multi-cursor-builder
python3 -m http.server 8000 --bind 127.0.0.1
```

開啟 `http://127.0.0.1:8000/examples/`。如只用檔案瀏覽，示範本身沒有 fetch，也可直接打開 `examples/index.html`。

## 最小使用方式

```html
<!-- 放在 head，順序保留。config.js 可以改設定。 -->
<script src="/cursor-builder/config.js"></script>
<script src="/cursor-builder/boot.js"></script>
<link rel="stylesheet" href="/cursor-builder/builder.css">
<script src="/cursor-builder/motion.js" defer></script>
<script src="/cursor-builder/builder.js" defer></script>

<section id="intro" data-build-zone>
  <h1 data-build="heading">你的標題</h1>
  <p data-build="body">你的介紹文字</p>
</section>
```

動態新增或改動內容後，呼叫 `window.CursorBuilder.scan()`。已完成且內容未改變的元素不重播。

## 設定檔的關係

`src/config.js` 是瀏覽器實際使用的設定；`config/defaults.json` 是同值的機器可讀文件，瀏覽器不會自動 fetch 它。修改預設值時要同步兩份設定。

## 重現的範圍

可套用版保留目前版本的動畫邏輯與時間參數；目標元素由 `data-build` 指定。不同網站的字型、內容、元素大小與版面會改變軌跡，並不保證不同版面產生相同像素。需要原站完整外觀時，請使用 `reference/daily-brief/`。

目前以文字與含文字的簡單元素為主。圖片、Canvas、影片、iframe、可編輯文字與複雜表單不屬於這一版的自動套用範圍；不要直接把大段父容器和其子元素一起標記。

## 測試

```sh
node tests/static.cjs
node tests/motion.cjs
npm install --prefix /tmp/toolbook-test linkedom --no-audit --no-fund
NODE_PATH=/tmp/toolbook-test/node_modules node tests/builder-dom.cjs
```

網站執行不需要 npm 或 linkedom；它只供 DOM 測試使用。這些測試採用模擬幾何，不能代替真正的瀏覽器視覺驗收。完整驗收流程見 docs/ACCEPTANCE.md。
