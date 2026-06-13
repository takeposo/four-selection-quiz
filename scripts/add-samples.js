const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.resolve(__dirname, '..', 'sample-quizzes.xlsx');

function readWorkbook(file) {
  if (fs.existsSync(file)) {
    return XLSX.readFile(file);
  }
  const wb = XLSX.utils.book_new();
  const headers = [
    'id', 'question', 'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'explanation', 'difficulty'
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return wb;
}

function getNextId(rows) {
  let max = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = Number(row[0]);
    if (!Number.isNaN(id) && id > max) max = id;
  }
  return max + 1;
}

const samples = [
  {
    question: '日本の首都は？',
    choices: ['大阪', '京都', '東京', '神戸'],
    answer: 3,
    explanation: '東京は日本の首都です。',
    difficulty: '易しい'
  },
  {
    question: '富士山の高さ（おおよそ）は何メートル？',
    choices: ['3776m', '3600m', '4000m', '3500m'],
    answer: 1,
    explanation: '富士山の標高は約3776メートルです。',
    difficulty: '普通'
  },
  {
    question: 'JavaScriptで標準出力に出す関数はどれ？',
    choices: ['print()', 'console.log()', 'System.out.println()', 'printf()'],
    answer: 2,
    explanation: 'ブラウザやNode.jsではconsole.log()を使います。',
    difficulty: '易しい'
  },
  {
    question: '太陽系で最も大きい惑星はどれ？',
    choices: ['地球', '火星', '木星', '金星'],
    answer: 3,
    explanation: '木星が太陽系で最大の惑星です。',
    difficulty: '普通'
  },
  {
    question: 'HTMLの見出しタグはどれ？',
    choices: ['<head>', '<h1>', '<title>', '<div>'],
    answer: 2,
    explanation: '<h1>は最上位の見出しタグです。',
    difficulty: '易しい'
  }
];

function appendSamples() {
  const wb = readWorkbook(filePath);
  const sheetName = wb.SheetNames[0] || 'Sheet1';
  const ws = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rows.length === 0) {
    rows.push(['id','question','choice1','choice2','choice3','choice4','answer','explanation','difficulty']);
  }

  let nextId = getNextId(rows);

  for (const s of samples) {
    const row = [nextId, s.question, ...s.choices, s.answer, s.explanation, s.difficulty];
    rows.push(row);
    console.log('Adding id', nextId, s.question);
    nextId++;
  }

  const newWs = XLSX.utils.aoa_to_sheet(rows);
  wb.Sheets[sheetName] = newWs;

  XLSX.writeFile(wb, filePath);
  console.log('Wrote', filePath);
}

appendSamples();
