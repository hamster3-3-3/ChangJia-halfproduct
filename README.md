# 長家半成品：自動轉換 JSON

將本專案內容解壓縮後放在 GitHub Repository 根目錄，包含 `.github/workflows`、`scripts`、`package.json` 和 `package-lock.json`。

## 後續只要上傳 Excel

1. 新增或覆蓋 `data/年份/月份/` 中的 Excel，保持既有報表名稱與格式（`.xlsx`，不分大小寫）。
2. 提交到 GitHub 的 main 或 master 分支。
3. Actions 自動掃描資料夾、重建 manifest.json、轉換有異動的 Excel，並提交 JSON。

不需自行編輯 manifest.json。暫存檔 `~$` 會略過。移除 Excel 後清單也會同步移除；請勿把同一報表的新舊副本都留在 data 中，以免重複讀取。其他種類的 Excel 會在執行記錄中列出並略過。

網站優先讀取 JSON，無 JSON 或讀取失敗時改用 Excel。保留長家原本的日別明細、半成品展開明細及 JFM 原因資料解析規則。

每份半成品 JSON 只保留該 Excel 所在 `data/年份/月份/` 的資料。例如放在 `data/2026/08/` 的 Excel，產生的 `summary`、`details` 與 `halfDetails` 只會包含 `2026-08`；即使活頁簿內殘留其他月份的工作表或公式結果，也不會寫入 JSON。轉檔時亦會自動移除已無對應 Excel 的舊 JSON。

## 第一次設定

在 Settings → Actions → General → Workflow permissions 選擇 Read and write permissions。Actions 中可手動執行 Convert Excel to dashboard JSON。

此流程負責轉檔與提交；網站發佈沿用原本的 GitHub Pages 設定。若自動提交後 Pages 沒有更新，請重新執行原本的 Pages 發佈流程。

## 本機轉檔

安裝 Node.js 20 後執行：

```sh
npm ci --ignore-scripts
npm run convert:data
npm run check:data
```
