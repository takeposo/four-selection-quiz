# Four Selection Quiz

Excelファイルから四択クイズを読み込んで出題するWebアプリケーションです。

## 機能

- Excelファイルから問題を読み込み
- 難易度別（易しい、普通、難しい）にクイズをキャッシュ
- 難易度ボタンの表示/グレイアウト制御
- 正解表示と解説表示
- 同じクイズは2度表示しない
- すべてのクイズ終了時に終了画面を表示

## セットアップ

### 必要なもの
- Node.js (v14以上)
- npm

### インストール

```bash
npm install
```

## 使い方

### 1. Excelファイルの準備

プロジェクトのルートディレクトリに `quizzes.xlsx` というファイルを配置してください。

形式：
| 列 | 内容 | 例 |
|----|------|----|
| A | 識別番号 | 1 |
| B | 問題文 | 日本の首都は？ |
| C | 選択肢１ | 大阪 |
| D | 選択肢２ | 京都 |
| E | 選択肢３ | 東京 |
| F | 選択肢４ | 神戸 |
| G | 正解の選択肢番号 | 3 |
| H | この問題の解説 | 東京は日本の首都です。 |
| I | 問題の難易度 | 易しい |

### 2. サーバーの起動

```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **バックエンド**: Node.js, Express.js
- **データ処理**: xlsx (Excel読み込み)

## ファイル構成

```
four-selection-quiz/
├── package.json
├── README.md
├── src/
│   ├── server.js          # Express サーバー
│   ├── quizLoader.js      # Excel ファイル読み込み
│   ├── quizManager.js     # クイズ管理
│   └── public/
│       ├── index.html     # メインページ
│       ├── style.css      # スタイルシート
│       └── app.js         # クライアント JavaScript
└── quizzes.xlsx           # Excelクイズファイル（ユーザー準備）
```
