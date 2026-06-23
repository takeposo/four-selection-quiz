// グローバル変数
let currentQuiz = null;
let currentQuizData = null;
function playJajan() {
  const audio = new Audio('quiz.mp3');
  audio.volume = 0.7;
  audio.play().catch(() => {
    // Audio playback may require a user gesture or browser permission
  });
}

function playPinPon() {
  const audio = new Audio('answer.mp3');
  audio.volume = 0.7;
  audio.play().catch(() => {
    // Audio playback may require a user gesture or browser permission
  });
}

/**
 * 指定時間でフェッチをタイムアウトさせる
 */
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * ページ読み込み時の初期化
 */
function setAppViewportHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const vh = height * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

document.addEventListener('DOMContentLoaded', async () => {
  setAppViewportHeight();
  window.addEventListener('resize', () => setTimeout(setAppViewportHeight, 100));
  window.addEventListener('orientationchange', () => setTimeout(setAppViewportHeight, 100));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => setTimeout(setAppViewportHeight, 100));
  }

  try {
    // クイズマネージャーを初期化
    const response = await fetchWithTimeout('/api/initialize', {}, 8000);
    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'クイズの読み込みに失敗しました');
      return;
    }

    // 統計情報を表示
    updateStats(data.stats);

    // 難易度選択画面を表示
    showScreen('difficultyScreen');
  } catch (error) {
    if (error.name === 'AbortError') {
      showError('サーバーへの接続がタイムアウトしました。サーバーが起動し、同じネットワークに接続されていることを確認してください。');
    } else {
      showError(`エラーが発生しました: ${error.message}`);
    }
  }
});

/**
 * 画面表示を切り替える
 */
function showScreen(screenId) {
  // すべての画面を非表示
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.remove('active'));

  // 指定された画面を表示
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showScreen('errorScreen');
}

/**
 * 統計情報を更新
 */
async function updateStats(stats) {
  document.getElementById('easyCount').textContent = stats['易しい'] || 0;
  document.getElementById('normalCount').textContent = stats['普通'] || 0;
  document.getElementById('hardCount').textContent = stats['難しい'] || 0;

  // ボタンの有効/無効を切り替え
  updateDifficultyButtons(stats);
  // すべてのクイズが無くなったら終了画面へ
  const easy = Number(stats['易しい'] || 0);
  const normal = Number(stats['普通'] || 0);
  const hard = Number(stats['難しい'] || 0);
  if (easy === 0 && normal === 0 && hard === 0) {
    showScreen('finishScreen');
  }
}

/**
 * サーバー側のキャッシュをクリアして初期化する（リセットボタン用）
 */
async function resetQuizzes() {
  try {
    // reset=true を付与してサーバー側の永続状態もクリア
    const response = await fetch('/api/initialize?reset=true');
    const data = await response.json();

    if (!data.success) {
      showError(data.error || '初期化に失敗しました');
      return;
    }

    // クライアント側の状態クリア
    currentQuiz = null;
    currentQuizData = null;

    // 統計を更新して難易度選択画面に戻す
    await updateStats(data.stats);
    showScreen('difficultyScreen');
  } catch (error) {
    showError(`エラーが発生しました: ${error.message}`);
  }
}

/**
 * 難易度ボタンの有効/無効を更新
 */
function updateDifficultyButtons(stats) {
  const buttons = {
    'easyBtn': stats['易しい'],
    'normalBtn': stats['普通'],
    'hardBtn': stats['難しい']
  };

  for (const [buttonId, count] of Object.entries(buttons)) {
    const btn = document.getElementById(buttonId);
    btn.disabled = count === 0;
  }
}

/**
 * 難易度を選択
 */
async function selectDifficulty(difficulty) {
  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ difficulty })
    });

    const data = await response.json();

    if (!data.success) {
      // すべてのクイズが終了した場合
      if (data.error === 'この難易度のクイズがありません') {
        // 統計情報を更新して再度チェック
        const statsResponse = await fetch('/api/stats');
        const statsData = await statsResponse.json();
        await updateStats(statsData.stats);

        // すべての難易度でクイズがなくなったか確認
        const stats = statsData.stats;
        if (stats['易しい'] === 0 && stats['普通'] === 0 && stats['難しい'] === 0) {
          showScreen('finishScreen');
          return;
        }
      }
      showError(data.error);
      return;
    }

    // クイズデータを保存して表示
    currentQuizData = data.quiz;
    displayQuiz(data.quiz);
  } catch (error) {
    showError(`エラーが発生しました: ${error.message}`);
  }
}

/**
 * クイズを表示
 */
function displayQuiz(quiz) {
  currentQuiz = quiz;
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.style.display = '';

    // Ensure options are laid out TL,TR,BL,BR by grid — generation order is correct

  // ヘッダー情報を更新
  document.getElementById('quizDifficulty').textContent = quiz.difficulty;
  document.getElementById('quizId').textContent = `問題ID: ${quiz.id}`;

  // 問題文を表示
  document.getElementById('question').textContent = quiz.question;

  // 選択肢を生成
  optionsContainer.innerHTML = '';

  quiz.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'option-btn';

    // 番号を上、テキストを下に表示（ピリオドは付けない）
    const num = document.createElement('div');
    num.className = 'option-number';
    num.textContent = String(index + 1);

    const txt = document.createElement('div');
    txt.className = 'option-text';
    txt.textContent = option;

    button.appendChild(num);
    button.appendChild(txt);

    button.onclick = () => selectOption(index + 1, button);
    optionsContainer.appendChild(button);
  });

  // 回答セクションを非表示
  document.getElementById('answerSection').classList.add('hidden');
  document.getElementById('quizButtonSection').style.display = 'block';

  // Play question sound
  try { playJajan(); } catch (e) { /* ignore */ }

  // クイズ画面を表示
  showScreen('quizScreen');
}

/**
 * 選択肢を選択
 */
function selectOption(optionNumber, buttonElement) {
  // 他のボタンの選択を解除
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.remove('selected');
  });

  // クリックされたボタンを選択状態に
  buttonElement.classList.add('selected');
  currentQuiz.selectedAnswer = optionNumber;
}

/**
 * 正解を表示
 */
async function showAnswer() {
  if (!currentQuiz) {
    return;
  }

  // サーバーから正解と解説を取得
  try {
    // 実装簡略化のため、クライアント側で管理
    // サーバーから正解を取得する場合は、以下のようにします
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quizId: currentQuiz.id, action: 'getAnswer' })
    });

    const data = await response.json();

    if (data.success) {
      // 正解情報を表示
      const correctAnswerNum = data.answer.correctAnswer;
      const explanation = data.answer.explanation;

      displayAnswer(correctAnswerNum, explanation);
    }
  } catch (error) {
    // フォールバック：サーバーから正解を取得できない場合は、エラーを表示
    console.error('正解取得エラー:', error);
  }
}

/**
 * 正解と解説を表示
 */
function displayAnswer(correctAnswerNum, explanation) {
  const correctOptionText = currentQuiz.options[correctAnswerNum - 1];
  // 表示要素に番号とテキストを分けて挿入（ピリオドなし）
  document.getElementById('correctAnswerDisplay').innerHTML =
    `<div class="answer-number">${correctAnswerNum}</div><div class="answer-text">${escapeHtml(correctOptionText)}</div>`;
  document.getElementById('explanationText').textContent = explanation || '（解説はありません）';

  // 回答セクションを表示
  // Hide options and quiz buttons, show only answer+explanation
  document.getElementById('optionsContainer').style.display = 'none';
  document.getElementById('quizButtonSection').style.display = 'none';
  document.getElementById('answerSection').classList.remove('hidden');

  try { playPinPon(); } catch (e) { /* ignore */ }
}

// 単純なエスケープ（HTML挿入防止）
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 次の問題へ
 */
async function nextQuestion() {
  try {
    // 統計情報を更新
    const statsResponse = await fetch('/api/stats');
    const statsData = await statsResponse.json();
    await updateStats(statsData.stats);

    // すべてのクイズが無くなっていれば終了画面へ、そうでなければ難易度選択へ
    const stats = statsData.stats;
    const easy = Number(stats['易しい'] || 0);
    const normal = Number(stats['普通'] || 0);
    const hard = Number(stats['難しい'] || 0);
    if (easy === 0 && normal === 0 && hard === 0) {
      showScreen('finishScreen');
      return;
    }

    showScreen('difficultyScreen');
  } catch (error) {
    showError(`エラーが発生しました: ${error.message}`);
  }
}
