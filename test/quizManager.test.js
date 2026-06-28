const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const XLSX = require('xlsx');
const QuizManager = require('../src/quizManager');

test('remaining quizzes can be listed and selected by quiz id', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-manager-'));
  const excelPath = path.join(tmpDir, 'sample.xlsx');
  const statePath = path.join(tmpDir, 'state.json');

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['q1', '問題1', 'A', 'B', 'C', 'D', '1', '解説1', '易しい'],
    ['q2', '問題2', 'A', 'B', 'C', 'D', '2', '解説2', '普通'],
    ['q3', '問題3', 'A', 'B', 'C', 'D', '3', '解説3', '難しい']
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, excelPath);

  const manager = new QuizManager(excelPath, statePath);

  const allRemaining = manager.getRemainingQuizzes();
  assert.equal(allRemaining.length, 3);
  assert.equal(allRemaining[0].id, 'q1');

  const byDifficulty = manager.getRemainingQuizzes('普通');
  assert.equal(byDifficulty.length, 1);
  assert.equal(byDifficulty[0].id, 'q2');

  const selected = manager.getQuizById('q3');
  assert.ok(selected);
  assert.equal(selected.id, 'q3');
  assert.equal(manager.getStats()['難しい'], 0);
});

test('time-formatted option values are preserved as text', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-manager-time-'));
  const excelPath = path.join(tmpDir, 'time.xlsx');
  const statePath = path.join(tmpDir, 'state.json');

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['q1', '問題1', '6:00', '7:30', '8:00', '9:30', '1', '解説1', '普通']
  ]);

  sheet['C3'].t = 'n';
  sheet['C3'].v = 0.25;
  sheet['C3'].z = 'h:mm';
  sheet['D3'].t = 'n';
  sheet['D3'].v = 0.3125;
  sheet['D3'].z = 'h:mm';
  sheet['E3'].t = 'n';
  sheet['E3'].v = 0.3333;
  sheet['E3'].z = 'h:mm';
  sheet['F3'].t = 'n';
  sheet['F3'].v = 0.3958;
  sheet['F3'].z = 'h:mm';

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, excelPath);

  const manager = new QuizManager(excelPath, statePath);
  const quizzes = manager.getRemainingQuizzes();

  assert.equal(quizzes[0].options[0], '6:00');
  assert.equal(quizzes[0].options[1], '7:30');
});

test('formatted date and percentage values are preserved using cell formatting', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-manager-format-'));
  const excelPath = path.join(tmpDir, 'format.xlsx');
  const statePath = path.join(tmpDir, 'state.json');

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['q1', '日付例', '2024/01/02', '12%', '1000', 'A', '1', '解説', '普通']
  ]);

  sheet['C3'].t = 'n';
  sheet['C3'].v = 45292;
  sheet['C3'].z = 'yyyy/mm/dd';
  sheet['D3'].t = 'n';
  sheet['D3'].v = 0.12;
  sheet['D3'].z = '0%';
  sheet['E3'].t = 'n';
  sheet['E3'].v = 1000;
  sheet['E3'].z = '#,##0';

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, excelPath);

  const manager = new QuizManager(excelPath, statePath);
  const quizzes = manager.getRemainingQuizzes();

  assert.equal(quizzes[0].options[0], '2024/01/01');
  assert.equal(quizzes[0].options[1], '12%');
  assert.equal(quizzes[0].options[2], '1,000');
});

test('custom formatted values are preserved using cell formatting', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-manager-custom-format-'));
  const excelPath = path.join(tmpDir, 'custom.xlsx');
  const statePath = path.join(tmpDir, 'state.json');

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['id', 'question', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation', 'difficulty'],
    ['q1', 'カスタム形式例', '2024/01/02', '1234', '0.075', 'A', '1', '解説', '普通']
  ]);

  sheet['C3'].t = 'n';
  sheet['C3'].v = 45293;
  sheet['C3'].z = 'yyyy"年"m"月"d"日"';
  sheet['D3'].t = 'n';
  sheet['D3'].v = 1234;
  sheet['D3'].z = '"¥"#,##0';
  sheet['E3'].t = 'n';
  sheet['E3'].v = 0.075;
  sheet['E3'].z = '0.0%';

  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, excelPath);

  const manager = new QuizManager(excelPath, statePath);
  const quizzes = manager.getRemainingQuizzes();

  assert.equal(quizzes[0].options[0], '2024年1月2日');
  assert.equal(quizzes[0].options[1], '¥1,234');
  assert.equal(quizzes[0].options[2], '7.5%');
});
