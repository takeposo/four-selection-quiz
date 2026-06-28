const QuizLoader = require('./quizLoader');
const fs = require('fs');
const path = require('path');

/**
 * クイズの管理と配信を行う
 */
class QuizManager {
  /**
   * @param {string} excelPath - Excelファイルのパス
   */
  constructor(excelPath, stateFilePath) {
    const loader = new QuizLoader(excelPath);
    const allQuizzes = loader.load();

    // 状態保存ファイルパス（デフォルトはプロジェクトルートの quiz_state.json）
    this.stateFilePath = stateFilePath || path.join(process.cwd(), 'quiz_state.json');

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

    // クイズの分類が終わった後で状態ファイルから復元する
    this._loadState();
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
   * 未表示のクイズ一覧を取得
   * @param {string|null} difficulty - 難易度（省略時は全件）
   * @returns {Array} クイズオブジェクト配列
   */
  getRemainingQuizzes(difficulty = null) {
    const source = difficulty
      ? this.quizzesByDifficulty[difficulty] || []
      : Object.values(this.quizzesByDifficulty).flat();

    return source
      .filter(quiz => !this.shownQuizIds.has(quiz.id))
      .map(quiz => ({
        id: quiz.id,
        question: quiz.question,
        options: quiz.options,
        difficulty: quiz.difficulty
      }))
      .sort((a, b) => {
        const idA = Number(a.id);
        const idB = Number(b.id);
        if (!Number.isNaN(idA) && !Number.isNaN(idB)) {
          return idA - idB;
        }
        return String(a.id).localeCompare(String(b.id), 'ja', { numeric: true });
      });
  }

  /**
   * 指定されたIDの未表示クイズを取得
   * @param {string} quizId - クイズID
   * @returns {Object|null} クイズオブジェクトまたはnull
   */
  getQuizById(quizId) {
    const quiz = this.getRemainingQuizzes().find(item => item.id === quizId);
    if (!quiz) {
      return null;
    }

    if (!this.shownQuizIds.has(quizId)) {
      this.shownQuizIds.add(quizId);
      try {
        this._saveState();
      } catch (e) {
        console.warn('状態の保存に失敗しました:', e.message);
      }
    }

    return quiz;
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

        // 状態を保存
        try {
          this._saveState();
        } catch (e) {
          // ログにとどめて処理を継続
          console.warn('状態の保存に失敗しました:', e.message);
        }

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
   * shownQuizIds を状態ファイルに保存する
   * @private
   */
  _saveState() {
    const state = {
      shownQuizIds: Array.from(this.shownQuizIds)
    };

    fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  }

  /**
   * 状態ファイルから shownQuizIds を復元する
   * @private
   */
  _loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const raw = fs.readFileSync(this.stateFilePath, 'utf8');
        const obj = JSON.parse(raw || '{}');
        if (obj && Array.isArray(obj.shownQuizIds)) {
          // 存在するクイズIDのみを復元する
          const validIds = new Set();
          for (const difficulty in this.quizzesByDifficulty) {
            for (const q of this.quizzesByDifficulty[difficulty]) {
              validIds.add(q.id);
            }
          }

          for (const id of obj.shownQuizIds) {
            if (validIds.has(id)) {
              this.shownQuizIds.add(id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('状態の読み込みに失敗しました:', e.message);
    }
  }

  /**
   * shownQuizIds をクリアして状態ファイルを削除/更新する
   */
  resetState() {
    this.shownQuizIds.clear();
    try {
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
      }
    } catch (e) {
      // 削除に失敗しても処理は継続
      console.warn('状態ファイルの削除に失敗しました:', e.message);
    }
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
