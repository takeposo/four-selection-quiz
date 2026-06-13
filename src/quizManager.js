const QuizLoader = require('./quizLoader');

/**
 * クイズの管理と配信を行う
 */
class QuizManager {
  /**
   * @param {string} excelPath - Excelファイルのパス
   */
  constructor(excelPath) {
    const loader = new QuizLoader(excelPath);
    const allQuizzes = loader.load();

    // 難易度別にクイズをグループ化
    this.quizzesByDifficulty = {
      '易しい': [],
      '普通': [],
      '難しい': []
    };

    // 既に表示したクイズのIDを追跡
    this.shownQuizIds = new Set();

    // クイズを難易度別に分類
    for (const quiz of allQuizzes) {
      this.quizzesByDifficulty[quiz.difficulty].push(quiz);
    }

    // 各難易度でシャッフル
    for (const difficulty in this.quizzesByDifficulty) {
      this.quizzesByDifficulty[difficulty] = this._shuffle(
        this.quizzesByDifficulty[difficulty]
      );
    }
  }

  /**
   * 難易度別のクイズ数を取得
   * @returns {Object} 難易度ごとのクイズ数
   */
  getStats() {
    return {
      '易しい': this.quizzesByDifficulty['易しい'].filter(
        q => !this.shownQuizIds.has(q.id)
      ).length,
      '普通': this.quizzesByDifficulty['普通'].filter(
        q => !this.shownQuizIds.has(q.id)
      ).length,
      '難しい': this.quizzesByDifficulty['難しい'].filter(
        q => !this.shownQuizIds.has(q.id)
      ).length
    };
  }

  /**
   * 指定された難易度の次のクイズを取得
   * @param {string} difficulty - 難易度（易しい、普通、難しい）
   * @returns {Object|null} クイズオブジェクトまたはnull
   */
  getQuiz(difficulty) {
    if (!this.quizzesByDifficulty[difficulty]) {
      return null;
    }

    // 未表示のクイズを見つける
    for (const quiz of this.quizzesByDifficulty[difficulty]) {
      if (!this.shownQuizIds.has(quiz.id)) {
        // このクイズを表示済みにマーク
        this.shownQuizIds.add(quiz.id);

        // クライアントに返すデータ（正解は含めない）
        return {
          id: quiz.id,
          question: quiz.question,
          options: quiz.options,
          difficulty: quiz.difficulty
        };
      }
    }

    return null;
  }

  /**
   * クイズの正解を取得
   * @param {string} quizId - クイズID
   * @returns {Object|null} {correctAnswer, explanation}
   */
  getAnswer(quizId) {
    for (const difficulty in this.quizzesByDifficulty) {
      for (const quiz of this.quizzesByDifficulty[difficulty]) {
        if (quiz.id === quizId) {
          return {
            correctAnswer: quiz.correctAnswer,
            explanation: quiz.explanation
          };
        }
      }
    }
    return null;
  }

  /**
   * 配列をシャッフルする（Fisher-Yatesアルゴリズム）
   * @private
   * @param {Array} array - シャッフル対象の配列
   * @returns {Array} シャッフルされた配列
   */
  _shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = QuizManager;
