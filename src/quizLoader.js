const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Excelファイルからクイズデータを読み込む
 */
class QuizLoader {
  /**
   * @param {string} filePath - Excelファイルのパス
   */
  constructor(filePath) {
    this.filePath = filePath;
  }

  /**
   * Excelファイルを読み込んでクイズデータを返す
   * @returns {Array} クイズデータの配列
   */
  load() {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`ファイルが見つかりません: ${this.filePath}`);
    }

    try {
      const workbook = XLSX.readFile(this.filePath);
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        throw new Error('Excelファイルにシートがありません');
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const quizzes = [];

      // ヘッダー行をスキップ（インデックス0）、データ行を処理
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];

        // 空行をスキップ
        if (!row || row.length === 0 || !row[0]) {
          continue;
        }

        try {
          const quiz = this._parseRow(row, i + 1);
          if (quiz) {
            quizzes.push(quiz);
          }
        } catch (error) {
          console.warn(`行 ${i + 1} の解析に失敗しました:`, error.message);
        }
      }

      if (quizzes.length === 0) {
        throw new Error('有効なクイズデータが見つかりません');
      }

      return quizzes;
    } catch (error) {
      throw new Error(`Excelファイルの読み込みエラー: ${error.message}`);
    }
  }

  /**
   * 行データをクイズオブジェクトにパースする
   * @private
   * @param {Array} row - 行データ
   * @param {number} rowIndex - 行番号（エラーメッセージ用）
   * @returns {Object|null} パースされたクイズオブジェクト
   */
  _parseRow(row, rowIndex) {
    const [id, question, option1, option2, option3, option4, correctAnswer, explanation, difficulty] = row;

    // 必須フィールドの検証
    if (!id || !question || !option1 || !option2 || !option3 || !option4 || !correctAnswer || !difficulty) {
      throw new Error('必須フィールドが不足しています');
    }

    // 正解番号の検証
    const correctNum = parseInt(correctAnswer);
    if (isNaN(correctNum) || correctNum < 1 || correctNum > 4) {
      throw new Error(`正解番号が無効です（1-4の数値である必要があります: ${correctAnswer}）`);
    }

    // 難易度の検証
    const validDifficulties = ['易しい', '普通', '難しい'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error(`難易度が無効です（易しい、普通、難しい のいずれかである必要があります: ${difficulty}）`);
    }

    return {
      id: String(id).trim(),
      question: String(question).trim(),
      options: [
        String(option1).trim(),
        String(option2).trim(),
        String(option3).trim(),
        String(option4).trim()
      ],
      correctAnswer: correctNum,
      explanation: String(explanation || '').trim(),
      difficulty: difficulty.trim()
    };
  }
}

module.exports = QuizLoader;
