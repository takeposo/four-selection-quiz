const express = require('express');
const path = require('path');
const QuizManager = require('./quizManager');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// グローバルなクイズマネージャーインスタンス
let quizManager = null;

// クイズデータを初期化するエンドポイント
app.get('/api/initialize', (req, res) => {
  try {
    const excelPath = path.join(process.cwd(), 'quizzes.xlsx');
    quizManager = new QuizManager(excelPath);
    
    const stats = quizManager.getStats();
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('初期化エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 難易度別のクイズ数を取得
app.get('/api/stats', (req, res) => {
  if (!quizManager) {
    return res.status(400).json({
      success: false,
      error: 'クイズマネージャーが初期化されていません'
    });
  }
  
  res.json({
    success: true,
    stats: quizManager.getStats()
  });
});

// 難易度を指定してクイズを取得
app.post('/api/quiz', (req, res) => {
  try {
    if (!quizManager) {
      return res.status(400).json({
        success: false,
        error: 'クイズマネージャーが初期化されていません'
      });
    }
    const { difficulty, action, quizId } = req.body;

    // クライアントが正解を要求する場合の処理
    if (action === 'getAnswer') {
      if (!quizId) {
        return res.status(400).json({ success: false, error: 'quizIdが指定されていません' });
      }

      const answer = quizManager.getAnswer(String(quizId));
      if (!answer) {
        return res.status(404).json({ success: false, error: '指定されたクイズが見つかりません' });
      }

      return res.json({ success: true, answer });
    }

    // 通常のクイズ取得（難易度指定）
    if (!difficulty) {
      return res.status(400).json({
        success: false,
        error: '難易度が指定されていません'
      });
    }

    const quiz = quizManager.getQuiz(difficulty);

    if (!quiz) {
      return res.json({
        success: false,
        error: 'この難易度のクイズがありません'
      });
    }

    res.json({
      success: true,
      quiz: quiz
    });
  } catch (error) {
    console.error('クイズ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  console.log('クイズを読み込むには、プロジェクトルートに quizzes.xlsx を配置してください。');
});
