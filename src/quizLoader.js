const XLSX = require('xlsx');
const fs = require('fs');

function isTimeLikeValue(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

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
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' });

      const quizzes = [];

      // 1行目はタイトル、2行目はヘッダーとして扱い、データ行は3行目（インデックス2）から処理
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];

        // 空行をスキップ
        if (!row || row.length === 0 || !row[0]) {
          continue;
        }

        try {
          const quiz = this._parseRow(row, i, worksheet);
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
  _parseRow(row, rowIndex, worksheet) {
    const [id, question, option1, option2, option3, option4, correctAnswer, explanation, difficulty] = row;

    // 必須フィールドの検証（難易度は空なら後でデフォルトを入れる）
    if (!id || !question || !option1 || !option2 || !option3 || !option4 || !correctAnswer) {
      throw new Error('必須フィールドが不足しています');
    }

    // 正解番号を全角->半角に正規化して検証
    const correctNum = parseInt(this._normalizeFullWidthDigits(correctAnswer));
    if (isNaN(correctNum) || correctNum < 1 || correctNum > 4) {
      throw new Error(`正解番号が無効です（1-4の数値である必要があります: ${correctAnswer}）`);
    }

    // 難易度が空の場合は '普通' をデフォルトとする
    const validDifficulties = ['易しい', '普通', '難しい'];
    const difficultyVal = String(difficulty || '普通').trim();
    if (!validDifficulties.includes(difficultyVal)) {
      throw new Error(`難易度が無効です（易しい、普通、難しい のいずれかである必要があります: ${difficultyVal}）`);
    }

    return {
      id: String(id).trim(),
      question: this._normalizeCellValue(question, worksheet, rowIndex, 1),
      options: [
        this._normalizeCellValue(option1, worksheet, rowIndex, 2),
        this._normalizeCellValue(option2, worksheet, rowIndex, 3),
        this._normalizeCellValue(option3, worksheet, rowIndex, 4),
        this._normalizeCellValue(option4, worksheet, rowIndex, 5)
      ],
      correctAnswer: correctNum,
      explanation: this._normalizeCellValue(explanation, worksheet, rowIndex, 7),
      difficulty: difficultyVal
    };
  }

  /**
   * 全角数字を半角数字に変換する
   * @private
   * @param {string|number} value
   * @returns {string}
   */
  _normalizeFullWidthDigits(value) {
    return String(value)
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  }

  /**
   * 選択肢の値を表示用テキストに正規化する
   * @private
   * @param {any} value
   * @returns {string}
   */
  _normalizeCellValue(rawValue, worksheet, rowIndex, colIndex) {
    const cell = this._getWorksheetCell(worksheet, rowIndex, colIndex);
    const formattedText = this._formatCellText(cell);
    if (formattedText !== null) {
      return formattedText;
    }
    return this._normalizeValue(rawValue);
  }

  _getWorksheetCell(worksheet, rowIndex, colIndex) {
    const address = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex });
    return worksheet[address] || null;
  }

  _formatCellText(cell) {
    if (!cell) {
      return null;
    }

    if (cell.w !== undefined && cell.w !== null && cell.w !== '') {
      return String(cell.w);
    }

    if (cell.t === 'n' && cell.z) {
      try {
        return String(XLSX.SSF.format(cell.z, cell.v));
      } catch (_) {
        // fall through
      }
    }

    return null;
  }

  _normalizeValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (isTimeLikeValue(value)) {
        const totalMinutes = Math.round(value * 24 * 60);
        const hours = String(Math.floor(totalMinutes / 60));
        const minutes = String(totalMinutes % 60).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return String(value);
    }

    if (typeof value === 'string') {
      return value.trim();
    }

    return String(value).trim();
  }
}

module.exports = QuizLoader;
