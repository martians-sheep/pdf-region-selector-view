# PDF Region Selector

PDF上で矩形ドラッグ選択を行い、PDFページ座標（points）で矩形データを取得するReactアプリケーション。

## 機能

- **PDF表示**: ファイル選択でPDFを表示
- **ズーム対応**: 50%〜300%の範囲でズームイン/アウト可能
- **矩形選択**: ドラッグ操作でPDF上の任意の領域を選択
- **座標取得**: 選択した領域のPDF座標（points）を取得
- **JSON出力**: 選択領域データをJSON形式で表示・コピー
- **削除機能**: 個別削除・全削除に対応

## セットアップ

```bash
npm install
npm run dev
```

## 技術スタック

- Vite + React (TypeScript)
- react-pdf (PDF.js)

## 座標系の方針

本アプリケーションでは、以下の座標変換方針を採用しています：

### DOM座標 → PDF座標

1. **ユーザー操作はDOM座標で取得**
   - ドラッグ操作はoverlay上のローカル座標（CSS px）として取得
   - `getBoundingClientRect()`を基準に計算

2. **保存時はPDF座標へ変換**
   - `pageProxy.getViewport({ scale })`からviewportを取得
   - `viewport.convertToPdfPoint(x, y)`で2点（左上・右下）を変換
   - min/maxで正規化してPDF座標の矩形を生成

3. **PDF座標のみを保存**
   - ズーム倍率に依存しない絶対座標として保存
   - `pageWidth`/`pageHeight`も併せて保存（scale=1のviewportから取得）

### PDF座標 → DOM座標

表示時は保存されたPDF座標をDOM座標へ逆変換：

- `viewport.convertToViewportPoint(x, y)`で2点を変換
- min/maxで正規化してDOM矩形を生成

## ズーム対応の考え方

- **座標保存**: PDF座標（points）で保存するため、ズーム倍率に依存しない
- **表示時変換**: ズーム変更時は`scale`に応じたviewportを再生成し、PDF座標→DOM座標変換を再実行
- **既存選択の追従**: ズームを変更しても、既存の選択領域は同じPDF上の位置に正しく表示される

```
ズームイン/アウト
      ↓
viewport再生成 (pageProxy.getViewport({ scale: newScale }))
      ↓
保存済みPDF座標 → 新しいDOM座標へ変換
      ↓
正しい位置に再描画
```

## データ構造

```typescript
type PdfSelection = {
  id: string;
  pageNumber: number;

  // PDF points (ズームに依存しない絶対座標)
  x: number;
  y: number;
  width: number;
  height: number;

  // ページサイズ (PDF points)
  pageWidth: number;
  pageHeight: number;

  createdAt: string;
};
```

## Limitations（制限事項）

- **回転非対応**: rotation=0固定。回転されたPDFは正しく処理できません
- **単一ページ表示**: 現時点では1ページ目のみ表示・選択可能
- **永続化なし**: 選択データはブラウザリロードでクリアされます（JSON出力でエクスポート可能）
- **テキスト抽出なし**: 選択領域のテキスト抽出機能はスコープ外

## 実装上の重要ポイント

### Overlay設計

```css
.overlay {
  position: absolute;
  inset: 0;
  touch-action: none;  /* モバイルスクロール干渉を防止 */
}
```

- Pageを`position: relative`なwrapperで包む
- overlayは`inset: 0`でPageと完全一致
- padding/border/transformは禁止（座標ズレの原因）

### Pointer Events

- `pointerdown`/`pointermove`/`pointerup`を使用（mouse eventsは不使用）
- `setPointerCapture`でドラッグ中のoverlay外追従を確保
- 極小サイズ（3px未満）は無効として破棄

## ライセンス

MIT
