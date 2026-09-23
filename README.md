# 最新AI系ニュースまとめアプリ (AI Daily News)

> このアプリは親リポジトリの `apps/ai_daily_news/` で管理します。ここで `git init` は実行しません。公開時はこのアプリだけを既存のGitHub Pagesリポジトリへ分離して送ります。

> APIキーはローカル専用の `.env` に設定します。実キーを含む設定ファイルはコミットしません。

> GitHub Pagesの更新と毎朝5:30（JST）の更新は [`.github/workflows/daily_update.yml`](.github/workflows/daily_update.yml) が行います。GitHub Secretsの `GEMINI_API_KEY` は既存リポジトリ側で管理します。

毎朝自動更新され、通勤中や隙間時間にスマホからサクッと読める自分専用のAIニュースまとめアプリです。

---

## 🌟 主な機能

- **完全無料運用**: GitHub Actions（自動実行）+ GitHub Pages（Webホスティング）+ Google Gemini API（無料枠）で完全0円。
- **毎朝自動更新**: 毎朝 JST 5:30 に自動で国内外のAIニュースを収集・要約・公開。PCの電源はオフでOK。
- **インテリジェント要約**: 海外記事の日本語翻訳、3行箇条書き要約、注目度（★1〜★5）の判定、本日の注目10選の自動選定。
- **スマホ最適化 PWA**: iPhone / Android の「ホーム画面に追加」で本物のネイティブアプリのようにワンタップ起動。
- **パスコードロック機能**: 初期パスコード `1234`（自分だけが閲覧できる安心セキュリティ）。
- **未読・既読管理**: タップした記事は自動で既読になり、未読一覧から整理。

---

## 🚀 初期設定・利用手順

### 1. Gemini APIキーの取得（完全無料）
1. [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/app/apikey) にアクセスし、Googleアカウントでログインします。
2. 「**Create API key**」ボタンをクリックします。
3. プロジェクトを選択（または新規作成）し、「**Create API key in existing project**」をクリックします。
4. 表示された `AIza...` で始まる文字列（APIキー）をコピーします。

### 2. ローカルでのテスト実行
1. `apps/ai_daily_news/` で依存関係を復元します：
   ```powershell
   npm.cmd ci
   ```
2. 必要な場合だけ、プロジェクトルートに `.env` ファイルを作成し、以下のようにAPIキーを記載します：
   ```env
   GEMINI_API_KEY=取得したAPIキー
   ```
3. ビルドコマンドを実行します。APIキーがない場合も、RSS取得結果をフォールバック表示して確認できます：
   ```bash
   npm.cmd run build
   ```
4. ローカル閲覧サーバーを起動し、表示されたURLをブラウザで開きます：
   ```powershell
   npm.cmd run serve
   ```

`public/index.html` が生成されます。既定のURLは `http://127.0.0.1:4173` です。

---

## 🌐 GitHubへの公開と毎朝の自動更新設定

### ステップ 1: GitHubで空のリポジトリを作成
1. [GitHub](https://github.com/) にログインし、「**New repository**」をクリック。
2. Repository name に `ai-news-app`（任意）と入力し、「**Public**」を選択して作成（READMEや.gitignoreの追加チェックは外したまま）。

### ステップ 2: コードをGitHubへプッシュ
ターミナル（PowerShell等）で以下のコマンドを実行します：
```bash
git init
git add .
git commit -m "feat: AIニュースアプリ初期作成"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

### ステップ 3: Gemini APIキーをGitHub Secretsに登録
1. GitHubのリポジトリページを開き、「**Settings**」タブをクリック。
2. 左メニューの「**Secrets and variables**」→「**Actions**」をクリック。
3. 「**New repository secret**」ボタンをクリック。
4. 以下の通り入力して保存：
   - Name: `GEMINI_API_KEY`
   - Secret: コピーしたGemini APIキー

### ステップ 4: GitHub Pagesの公開設定
1. リポジトリの「**Settings**」タブを開く。
2. 左メニューの「**Pages**」をクリック。
3. **Build and deployment** の **Source** を「**GitHub Actions**」に変更します。

### ステップ 5: 初回実行
1. リポジトリの「**Actions**」タブを開く。
2. 左側の「**Daily AI News Update & Deploy**」をクリック。
3. 右側の「**Run workflow**」ボタンをクリックして実行します。
4. 数分で完了し、発行された公開URL（例: `https://<username>.github.io/<repo>/`）が表示されます。

---

## 📱 スマホ（iPhone / Android）への追加

1. スマホのブラウザ（Safari / Chrome）で発行されたURLを開きます。
2. **iPhoneの場合**:
   - Safari下部の「共有（四角に上矢印）」アイコンをタップ。
   - 「**ホーム画面に追加**」をタップし、右上の「追加」を押します。
3. **Androidの場合**:
   - Chrome右上のメニュー（縦3点リーダー）をタップ。
   - 「**ホーム画面に追加**」または「**アプリをインストール**」をタップします。
4. ホーム画面にアイコンが配置され、アプリ感覚で毎朝チェックできます！
