const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
require('dotenv').config();

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI News Aggregator'
  }
});

const FEEDS_FILE = path.join(__dirname, '..', 'data', 'feeds.json');
const TEMPLATE_FILE = path.join(__dirname, 'template.html');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'index.html');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function fetchAllFeeds() {
  const feeds = JSON.parse(fs.readFileSync(FEEDS_FILE, 'utf8'));
  const allArticles = [];

  console.log(`[RSS] ${feeds.length} 件のフィードから最新ニュースを取得中...`);

  for (const feed of feeds) {
    try {
      console.log(`- 取得中: ${feed.name} (${feed.url})`);
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 4); // 各メディア最新4件

      for (const item of items) {
        const pubDateObj = item.pubDate ? new Date(item.pubDate) : new Date();
        const pubDateFormatted = `${pubDateObj.getMonth() + 1}/${pubDateObj.getDate()} ${pubDateObj.getHours().toString().padStart(2, '0')}:${pubDateObj.getMinutes().toString().padStart(2, '0')}`;

        // ユニークID生成
        const id = Buffer.from(item.link || item.title || Math.random().toString()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

        allArticles.push({
          id,
          sourceId: feed.id,
          sourceName: feed.name,
          category: feed.category,
          title: item.title || 'No title',
          link: item.link || '',
          contentSnippet: (item.contentSnippet || item.content || '').slice(0, 300),
          pubDate: pubDateFormatted,
          timestamp: pubDateObj.getTime()
        });
      }
    } catch (err) {
      console.warn(`! [スキップ] ${feed.name} の取得失敗: ${err.message}`);
    }
  }

  // 新しい順にソート
  allArticles.sort((a, b) => b.timestamp - a.timestamp);
  console.log(`[RSS] 合計 ${allArticles.length} 件の記事を取得完了`);
  return allArticles;
}

// Gemini APIによる要約・翻訳・注目度判定
async function processWithGemini(articles) {
  if (!GEMINI_API_KEY) {
    console.log('[Gemini] GEMINI_API_KEY が未設定です。ローカル用のフォールバックデータで生成します。');
    return fallbackProcess(articles);
  }

  console.log('[Gemini] Gemini API で記事の日本語翻訳・3行要約・注目度評価を実行中...');

  // 1回のリクエストでまとめて処理
  const articlesForPrompt = articles.slice(0, 30).map((a, idx) => ({
    index: idx,
    id: a.id,
    source: a.sourceName,
    title: a.title,
    snippet: a.contentSnippet
  }));

  const prompt = `
あなたはプロのAI・ITテックニュース編集長です。
以下の${articlesForPrompt.length}件のニュース記事を分析し、JSON形式で返答してください。

【各記事に対する処理内容】
1. titleJa: 日本語タイトル（海外記事は分かりやすく魅力的な日本語に翻訳、国内記事はそのままかより洗練）
2. points: サクッと読める重要なポイント・要約を3点（箇条書き、各行50文字以内）
3. stars: ニュースの重要度・注目度（1〜5の数値。画期的な発表や大型モデル発表は5、一般的なニュースは3〜4）
4. isTop10: 本日の全記事の中から特に通勤中・朝に読むべき「超注目ニュース10選」に該当する場合はtrue、それ以外はfalse（trueは全体で必ず10件選定してください）

【入力記事一覧】
${JSON.stringify(articlesForPrompt, null, 2)}

【返答フォーマット（JSON配列のみを出力してください。マークダウンの\`\`\`json等の記号は含めないでください）】
[
  {
    "index": 0,
    "titleJa": "日本語タイトル",
    "points": ["要点1", "要点2", "要点3"],
    "stars": 4,
    "isTop10": true
  }
]
`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Gemini API Error] Status: ${res.status}, Message: ${errText}`);
      console.log('[Gemini] フォールバック処理に切り替えます。');
      return fallbackProcess(articles);
    }

    const data = await res.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const analyzed = JSON.parse(cleanedOutput);

    const resultMap = new Map(analyzed.map(item => [item.index, item]));

    const processed = articles.map((a, idx) => {
      const info = resultMap.get(idx);
      if (info) {
        return {
          ...a,
          titleJa: info.titleJa || a.title,
          points: info.points || [a.contentSnippet || '最新記事'],
          stars: info.stars || 3,
          isTop10: !!info.isTop10
        };
      }
      return {
        ...a,
        titleJa: a.title,
        points: [a.contentSnippet || '記事内容を参照してください'],
        stars: 3,
        isTop10: idx < 10
      };
    });

    console.log('[Gemini] 要約と注目度判定が完了しました！');
    return processed;

  } catch (e) {
    console.warn(`[Gemini API 呼び出しエラー]: ${e.message}`);
    return fallbackProcess(articles);
  }
}

// フォールバック処理（APIキー未設定またはエラー時）
function fallbackProcess(articles) {
  return articles.map((a, idx) => ({
    ...a,
    titleJa: a.title,
    points: [
      a.contentSnippet ? a.contentSnippet.slice(0, 60) + '...' : '新着記事です',
      `${a.sourceName} からの最新アップデート`,
      '詳細は元記事リンクよりご確認ください'
    ],
    stars: idx < 5 ? 5 : (idx < 15 ? 4 : 3),
    isTop10: idx < 10
  }));
}

async function build() {
  console.log('=== AIニュースまとめアプリ ビルド開始 ===');

  // アイコン生成（存在しない場合）
  if (!fs.existsSync(path.join(PUBLIC_DIR, 'icon-192.png'))) {
    require('./generate_icons');
  }

  // 1. RSS取得
  const articles = await fetchAllFeeds();

  // 2. Gemini要約・加工
  const processedArticles = await processWithGemini(articles);

  // 3. HTMLテンプレート生成
  const now = new Date();
  const jstTime = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(now);

  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const newsData = {
    updatedAt: jstTime,
    articles: processedArticles
  };

  const finalHtml = template
    .replace('{{UPDATED_AT}}', jstTime)
    .replace('{{NEWS_DATA_JSON}}', JSON.stringify(newsData));

  fs.writeFileSync(OUTPUT_FILE, finalHtml, 'utf8');
  console.log(`[Build] ビルド完了！ 出力先: ${OUTPUT_FILE}`);
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
