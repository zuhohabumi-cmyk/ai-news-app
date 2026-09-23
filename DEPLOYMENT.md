# GitHub Pagesへの公開

このアプリは、親リポジトリの `apps/ai_daily_news/` だけを既存の公開リポジトリ `zuhohabumi-cmyk/ai-news-app` へ送る。親リポジトリのPKB、チケット、`01_private/` は公開しない。

## 自動更新

- GitHub Actions: `.github/workflows/daily_update.yml`
- 定時実行: 毎日5:30 JST（UTC 20:30）
- APIキー: GitHub Secretsの `GEMINI_API_KEY`
- 公開物: `public/`

ローカル側では [Publish-AiDailyNews.ps1](../../scripts/Publish-AiDailyNews.ps1) を使い、アプリのサブツリーだけを公開リポジトリの `main` へ反映する。
