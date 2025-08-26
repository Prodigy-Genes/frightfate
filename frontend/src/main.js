import './style.css'

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://localhost:8000';
const QUESTION_TIME_LIMIT = 120; // 2 minutes per question
const WARNING_TIME = 30; // Show warning at 30 seconds remaining

// ============================================================================
// ADVANCED FEATURE CONSTANTS
// ============================================================================

const MIN_TIME_LIMIT = 120;   // Minimum time allowed per question
const MAX_TIME_LIMIT = 500;  // Maximum time allowed per question
const WORDS_PER_MINUTE = 350; // Average reading speed for complexity calculation

// ============================================================================
// GLOBAL GAME STATE
// ============================================================================

let gameState = {
  sessionCode: '',
  playerId: '',
  playerName: '',
  currentTheme: 'haunted_house',
  currentQuestion: 0,
  totalQuestions: 5,
  scenarios: [],
  isGameHost: false,
  isEliminated: false,
  eliminationReason: '',
  storyContext: '',
  playerChoices: [],
  questionTimer: null,
  timeRemaining: QUESTION_TIME_LIMIT
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateTimeLimit(scenario) {
  if (!scenario) return QUESTION_TIME_LIMIT;
  
  // Calculate time based on scenario complexity (word count)
  const wordCount = scenario.description.split(/\s+/).length;
  const baseTime = Math.max(MIN_TIME_LIMIT, Math.min(MAX_TIME_LIMIT, 
                    Math.floor(wordCount / (WORDS_PER_MINUTE / 60))));
  
  // Adjust based on risk level
  const riskMultipliers = {
    low: 0.8,
    medium: 1.0,
    high: 1.2,
    extreme: 1.5
  };
  
  const riskLevel = scenario.death_risk_level || 'medium';
  return Math.floor(baseTime * (riskMultipliers[riskLevel] || 1.0));
}

function showScenarioComplexityInfo(scenario, timeLimit) {
  const wordCount = scenario.description.split(/\s+/).length;
  const minutes = Math.floor(timeLimit / 60);
  const seconds = timeLimit % 60;
  
  const complexityInfo = document.getElementById('complexityInfo') || createComplexityInfo();
  
  let difficultyText = 'Standard';
  let difficultyClass = 'standard';
  
  if (timeLimit >= 240) {
    difficultyText = 'Very Complex';
    difficultyClass = 'very-complex';
  } else if (timeLimit >= 180) {
    difficultyText = 'Complex';
    difficultyClass = 'complex';
  } else if (timeLimit <= 120) {
    difficultyText = 'Quick Decision';
    difficultyClass = 'quick';
  }
  
  complexityInfo.className = `complexity-info ${difficultyClass}`;
  complexityInfo.innerHTML = `
    <div class="complexity-header">
      <span class="complexity-label">Scenario Complexity:</span>
      <span class="complexity-level">${difficultyText}</span>
    </div>
    <div class="complexity-details">
      <span>${wordCount} words</span>
      <span>•</span>
      <span>${minutes}:${seconds.toString().padStart(2, '0')} allocated</span>
      <span>•</span>
      <span>Risk Level: ${scenario.death_risk_level || 'medium'}</span>
    </div>
  `;
}

function createComplexityInfo() {
  const complexityInfo = document.createElement('div');
  complexityInfo.id = 'complexityInfo';
  
  const scenarioElement = document.getElementById('currentScenario');
  if (scenarioElement) {
    scenarioElement.appendChild(complexityInfo);
  }
  
  return complexityInfo;
}

function calculateAdaptiveTimeLimit(scenario, playerHistory = []) {
  const baseTime = calculateTimeLimit(scenario);
  
  if (playerHistory.length === 0) return baseTime;
  
  // Analyze player's historical performance
  const avgScore = playerHistory.reduce((sum, choice) => sum + (choice.score || 50), 0) / playerHistory.length;
  const hasRushedAnswers = playerHistory.some(choice => choice.was_rushed);
  const hasTimeoutIssues = playerHistory.some(choice => choice.timed_out);
  
  let timeModifier = 1.0;
  
  // Players with good scores get slightly less time (they're efficient)
  if (avgScore >= 75) timeModifier -= 0.1;
  else if (avgScore <= 35) timeModifier += 0.15; // Struggling players get more time
  
  // Players who have rushed or timed out get extra time
  if (hasRushedAnswers) timeModifier += 0.2;
  if (hasTimeoutIssues) timeModifier += 0.3;
  
  // Players in later questions who are doing poorly get compassion time
  if (scenario.question_number >= 4 && avgScore < 50) timeModifier += 0.25;
  
  const adaptiveTime = Math.round(baseTime * timeModifier);
  
  // Still respect min/max bounds
  return Math.max(MIN_TIME_LIMIT, Math.min(MAX_TIME_LIMIT, adaptiveTime));
}


function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

function showNotification(message, type = 'info') {
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  notification.querySelector('.notification-close').onclick = () => notification.remove();
}

function showLoadingButton(buttonId, loadingText = 'Loading...') {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span>${loadingText}`;
  }
}

function hideLoadingButton(buttonId, originalText) {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function selectTheme(theme) {
  gameState.currentTheme = theme;
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`[data-theme="${theme}"]`).classList.add('selected');
}

// ============================================================================
// TIMER MANAGEMENT
// ============================================================================

function startQuestionTimer() {
  clearQuestionTimer();
  
  // Use adaptive time limit if available, otherwise fallback to default
  gameState.timeRemaining = gameState.currentTimeLimit || QUESTION_TIME_LIMIT;
  updateTimerDisplay();
  
  gameState.questionTimer = setInterval(() => {
    gameState.timeRemaining--;
    updateTimerDisplay();
    
    if (gameState.timeRemaining === WARNING_TIME) {
      showNotification('Only 30 seconds remaining! Answer quickly or face elimination!', 'warning');
      const timerElement = document.getElementById('timerDisplay');
      if (timerElement) timerElement.classList.add('warning');
    }
    
    if (gameState.timeRemaining === 10) {
      showNotification('10 seconds left! Answer NOW or be eliminated!', 'error');
      const timerElement = document.getElementById('timerDisplay');
      if (timerElement) timerElement.classList.add('critical');
    }
    
    if (gameState.timeRemaining <= 0) {
      handleTimeUp();
    }
  }, 1000);
}

function clearQuestionTimer() {
  if (gameState.questionTimer) {
    clearInterval(gameState.questionTimer);
    gameState.questionTimer = null;
  }
}

function updateTimerDisplay() {
  const timerElement = document.getElementById('timerDisplay');
  if (timerElement) {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (gameState.timeRemaining <= 10) {
      timerElement.className = 'timer-display critical';
    } else if (gameState.timeRemaining <= WARNING_TIME) {
      timerElement.className = 'timer-display warning';
    } else {
      timerElement.className = 'timer-display';
    }
  }
}

async function handleTimeUp() {
  clearQuestionTimer();
  
  const answer = document.getElementById('playerAnswer').value.trim();
  
  if (!answer) {
    console.log('Time up with no answer - instant elimination');
    await forceElimination('Failed to provide any answer within time limit');
  } else if (answer.length < 10) {
    console.log('Time up with insufficient answer - instant elimination');
    await forceElimination('Answer too brief and rushed - shows poor survival instincts');
  } else {
    console.log('Time up - submitting rushed answer');
    await submitRushedAnswer(answer);
  }
}

// ============================================================================
// LOADING OVERLAY MANAGEMENT
// ============================================================================

function showLoadingOverlay(message = 'Loading...', showProgress = false) {
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">${message}</div>
      ${showProgress ? '<div class="loading-progress" id="loadingProgress"></div>' : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  
  if (showProgress) {
    startProgressiveLoading(message);
  }
  
  console.log('Loading overlay shown with message:', message);
}

function startProgressiveLoading(baseMessage) {
  const messages = [
    `${baseMessage}`,
    `Analyzing your previous choices...`,
    `Crafting narrative consequences...`,
    `Determining danger levels...`,
    `Finalizing your personalized scenario...`,
    `Almost ready...`
  ];
  
  let currentIndex = 0;
  
  const progressInterval = setInterval(() => {
    const messageElement = document.getElementById('loadingMessage');
    const progressElement = document.getElementById('loadingProgress');
    
    if (messageElement && currentIndex < messages.length) {
      messageElement.textContent = messages[currentIndex];
      
      if (progressElement) {
        const progress = ((currentIndex + 1) / messages.length) * 100;
        progressElement.innerHTML = `
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${Math.round(progress)}% complete</div>
        `;
      }
      
      currentIndex++;
    } else {
      clearInterval(progressInterval);
    }
  }, 2000);
  
  window.loadingProgressInterval = progressInterval;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    console.log('Removing loading overlay');
    overlay.remove();
  }
  
  const intervals = [
    'loadingProgressInterval', 'meterInterval', 'tipInterval', 
    'timerInterval', 'calcInterval', 'suspenseInterval'
  ];
  
  intervals.forEach(intervalName => {
    if (window[intervalName]) {
      clearInterval(window[intervalName]);
      window[intervalName] = null;
    }
  });
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateAnswer(answer) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (!answer || answer.trim().length === 0) {
    validation.isValid = false;
    validation.errors.push('No answer provided');
    return validation;
  }
  
  if (answer.trim().length < 10) {
    validation.isValid = false;
    validation.errors.push('Answer too short - provide more detail');
    return validation;
  }
  
  if (answer.trim().length < 20) {
    validation.warnings.push('Very brief answer - consider adding more detail');
  }
  
  const lowEffortPatterns = [
    /^(run|hide|scream|panic|die|quit|give up)\.?$/i,
    /^(i don\'t know|idk|nothing|whatever)\.?$/i,
    /^.{1,15}$/,
    /^(ok|okay|yes|no|maybe|sure)\.?$/i
  ];
  
  const isLowEffort = lowEffortPatterns.some(pattern => pattern.test(answer.trim()));
  if (isLowEffort) {
    validation.isValid = false;
    validation.errors.push('Answer appears to be low-effort or insufficient for survival analysis');
    return validation;
  }
  
  const hasSpam = /(.)\1{4,}/.test(answer);
  if (hasSpam) {
    validation.isValid = false;
    validation.errors.push('Answer contains spam or repeated characters');
    return validation;
  }
  
  return validation;
}

// ============================================================================
// GAME SESSION MANAGEMENT
// ============================================================================

async function createGameSession() {
  showLoadingButton('createGameBtn', 'Creating...');
  
  try {
    const response = await apiCall('/api/game/create-session', {
      method: 'POST',
      body: JSON.stringify({ theme: gameState.currentTheme })
    });
    
    gameState.sessionCode = response.session_code;
    gameState.isGameHost = true;
    
    const playerName = prompt('Enter your name:');
    if (playerName && playerName.trim()) {
      await joinGameSession(response.session_code, playerName.trim());
    } else {
      throw new Error('Player name is required');
    }
    
    hideLoadingButton('createGameBtn', 'Create New Game');
    showNotification('Game session created successfully!', 'success');
    
  } catch (error) {
    hideLoadingButton('createGameBtn', 'Create New Game');
    showNotification(`Failed to create game session: ${error.message}`, 'error');
  }
}

async function joinGameSession(sessionCode = null, playerName = null) {
  const code = sessionCode || document.getElementById('sessionCode').value.toUpperCase().trim();
  const name = playerName || document.getElementById('playerName').value.trim();
  
  if (!code || !name) {
    showNotification('Please enter both session code and your name.', 'warning');
    return;
  }

  if (code.length !== 6) {
    showNotification('Session code must be 6 characters long.', 'warning');
    return;
  }

  showLoadingButton('joinSessionBtn', 'Joining...');

  try {
    const response = await apiCall(`/api/game/join-session/${code}?player_name=${encodeURIComponent(name)}`, {
      method: 'POST'
    });
    
    gameState.sessionCode = code;
    gameState.playerId = response.player_id;
    gameState.playerName = name;
    
    await loadLobby();
    
    hideLoadingButton('joinSessionBtn', 'Join Session');
    showNotification('Successfully joined the game!', 'success');
    
  } catch (error) {
    hideLoadingButton('joinSessionBtn', 'Join Session');
    showNotification(`Failed to join session: ${error.message}`, 'error');
  }
}

async function loadLobby() {
  try {
    const session = await apiCall(`/api/game/session/${gameState.sessionCode}`);
    
    document.getElementById('displaySessionCode').textContent = gameState.sessionCode;
    
    const activePlayersList = document.getElementById('activePlayersList');
    activePlayersList.innerHTML = '';
    
    if (session.active_players && session.active_players.length > 0) {
      session.active_players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.innerHTML = `
          <span>${player.name}</span>
          <span class="player-status ${player.is_ready ? 'ready' : 'waiting'}">
            ${player.is_ready ? 'Ready' : 'Waiting'}
          </span>
        `;
        activePlayersList.appendChild(playerDiv);
      });
    } else {
      activePlayersList.innerHTML = '<div class="no-players">No active players</div>';
    }
    
    const eliminatedSection = document.getElementById('eliminatedSection');
    const eliminatedPlayersList = document.getElementById('eliminatedPlayersList');
    
    if (session.eliminated_players && session.eliminated_players.length > 0) {
      eliminatedSection.style.display = 'block';
      eliminatedPlayersList.innerHTML = '';
      
      session.eliminated_players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.innerHTML = `
          <span>${player.name}</span>
          <span style="color: #ff6b6b;">Eliminated: ${player.elimination_reason}</span>
        `;
        eliminatedPlayersList.appendChild(playerDiv);
      });
    } else {
      eliminatedSection.style.display = 'none';
    }
    
    showScreen('lobbyScreen');
  } catch (error) {
    showNotification('Failed to load lobby information.', 'error');
  }
}

// ============================================================================
// GAME FLOW FUNCTIONS
// ============================================================================

function trackReadingProgress() {
  const scenarioDescription = document.getElementById('scenarioDescription');
  const answerTextarea = document.getElementById('playerAnswer');
  
  if (!scenarioDescription || !answerTextarea) return;
  
  let hasStartedReading = false;
  let hasStartedTyping = false;
  let readingStartTime = null;
  let typingStartTime = null;
  
  // Track when user starts reading (scroll or focus on scenario)
  scenarioDescription.addEventListener('focus', () => {
    if (!hasStartedReading) {
      hasStartedReading = true;
      readingStartTime = Date.now();
      console.log('Player started reading scenario');
    }
  });
  
  // Track when user starts typing
  answerTextarea.addEventListener('focus', () => {
    if (!hasStartedTyping && hasStartedReading) {
      hasStartedTyping = true;
      typingStartTime = Date.now();
      const readingTime = (Date.now() - readingStartTime) / 1000;
      console.log(`Player took ${readingTime}s to read scenario`);
      
      // Show encouragement based on reading speed
      showReadingFeedback(readingTime);
    }
  });
  
  answerTextarea.addEventListener('input', () => {
    if (!hasStartedTyping) {
      hasStartedTyping = true;
      typingStartTime = Date.now();
    }
  });
}

function showReadingFeedback(readingTime) {
  const wordCount = document.getElementById('scenarioDescription').textContent.split(/\s+/).length;
  const expectedReadingTime = (wordCount / WORDS_PER_MINUTE) * 60;
  
  if (readingTime < expectedReadingTime * 0.5) {
    showNotification('Speed reading detected! Make sure you caught all the important details.', 'warning');
  } else if (readingTime > expectedReadingTime * 2) {
    showNotification('Taking your time to understand the scenario - wise approach!', 'success');
  }
}

async function checkPlayerElimination() {
  try {
    const result = await apiCall(`/api/game/check-elimination/${gameState.sessionCode}/${gameState.playerId}`);
    
    if (result.is_eliminated) {
      gameState.isEliminated = true;
      gameState.eliminationReason = result.elimination_reason;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking elimination:', error);
    return false;
  }
}

async function loadDynamicScenario(questionNumber) {
  try {
    console.log(`Loading dynamic scenario ${questionNumber} for player ${gameState.playerId}`);
    
    if (questionNumber === 1) {
      showLoadingOverlay('Crafting your opening horror scenario...', true);
    } else {
      showLoadingOverlay(`Analyzing your ${questionNumber - 1} previous choices to craft scenario ${questionNumber}...`, true);
    }
    
    const scenario = await apiCall(
      `/api/game/scenario/${gameState.sessionCode}/${questionNumber}?player_id=${gameState.playerId}`
    );
    
    hideLoadingOverlay();
    
    if (scenario) {
      gameState.scenarios[questionNumber - 1] = scenario;
      return scenario;
    } else {
      throw new Error('No scenario received');
    }
    
  } catch (error) {
    console.error('Failed to load dynamic scenario:', error);
    hideLoadingOverlay();
    
    const fallbackScenario = {
      question_number: questionNumber,
      title: `Horror Challenge ${questionNumber}`,
      description: `You face escalating danger in this ${gameState.currentTheme.replace('_', ' ')} scenario. The situation grows more desperate with each passing moment. Your previous choices have led you here. What do you do?`,
      survival_factors: ["logical_thinking", "survival_instinct"],
      story_context: `Question ${questionNumber} of your terrifying journey`,
      death_risk_level: questionNumber > 3 ? "high" : "medium"
    };
    
    gameState.scenarios[questionNumber - 1] = fallbackScenario;
    showNotification('Using backup scenario - some features may be limited', 'warning');
    return fallbackScenario;
  }
}

async function startGame() {
  showLoadingButton('startGameBtn', 'Starting Game...');
  
  try {
    if (await checkPlayerElimination()) {
      showEliminationScreen();
      hideLoadingButton('startGameBtn', 'Start Game');
      return;
    }
    
    gameState.currentQuestion = 1;
    gameState.playerChoices = [];
    
    await displayCurrentScenario();
    showScreen('gameScreen');
    
    startQuestionTimer();
    
    hideLoadingButton('startGameBtn', 'Start Game');
  } catch (error) {
    hideLoadingButton('startGameBtn', 'Start Game');
    showNotification(`Failed to start game: ${error.message}`, 'error');
  }
}

async function displayCurrentScenario() {
  try {
    console.log('Displaying scenario:', gameState.currentQuestion);
    
    const scenario = await loadDynamicScenario(gameState.currentQuestion);
    
    if (scenario) {
      document.getElementById('scenarioNumber').textContent = gameState.currentQuestion;
      document.getElementById('scenarioTitle').textContent = scenario.title;
      document.getElementById('scenarioDescription').textContent = scenario.description;
      
      const storyContextElement = document.getElementById('storyContext');
      if (scenario.story_context) {
        storyContextElement.textContent = scenario.story_context;
        gameState.storyContext = scenario.story_context;
      }
      
      if (gameState.currentQuestion > 1 && scenario.narrative_consequences) {
        const consequenceElement = document.getElementById('narrativeConsequence');
        const consequenceText = document.getElementById('consequenceText');
        consequenceText.textContent = scenario.narrative_consequences;
        consequenceElement.style.display = 'block';
      } else {
        document.getElementById('narrativeConsequence').style.display = 'none';
      }
      
      const progress = (gameState.currentQuestion / gameState.totalQuestions) * 100;
      document.getElementById('progressFill').style.width = `${progress}%`;
      document.getElementById('progressText').textContent = `Question ${gameState.currentQuestion} of ${gameState.totalQuestions}`;
      
      // NEW: Calculate and show dynamic time information
      const timeLimit = calculateAdaptiveTimeLimit(scenario, gameState.playerChoices);
      gameState.currentTimeLimit = timeLimit;
      
      // NEW: Show scenario complexity information
      showScenarioComplexityInfo(scenario, timeLimit);
      
      // NEW: Start reading progress tracking
      setTimeout(trackReadingProgress, 500);
      
      console.log('Scenario displayed successfully');
    } else {
      throw new Error('No scenario available');
    }
  } catch (error) {
    console.error('Error displaying scenario:', error);
    showNotification('Error loading scenario. Please try again.', 'error');
  }
}

// ============================================================================
// ANSWER SUBMISSION AND PROCESSING
// ============================================================================

async function submitAnswer() {
  const answer = document.getElementById('playerAnswer').value.trim();
  
  const validation = validateAnswer(answer);
  
  if (!validation.isValid) {
    validation.errors.forEach(error => {
      showNotification(error, 'error');
    });
    
    if (validation.errors.some(error => 
      error.includes('No answer provided') || 
      error.includes('low-effort') ||
      error.includes('spam')
    )) {
      await forceElimination('Provided invalid or inappropriate answer');
      return;
    }
    return;
  }
  
  validation.warnings.forEach(warning => {
    showNotification(warning, 'warning');
  });
  
  clearQuestionTimer();
  
  showLoadingButton('submitAnswerBtn', 'Analyzing...');
  
  showInteractiveLoading('AI analyzing your survival choices...', answer);

  try {
    const response = await apiCall('/api/game/submit-answer', {
      method: 'POST',
      body: JSON.stringify({
        session_code: gameState.sessionCode,
        player_id: gameState.playerId,
        question_number: gameState.currentQuestion,
        answer_text: answer
      })
    });
    
    await processAnswerResponse(response);
    
  } catch (error) {
    console.error('Failed to submit answer:', error);
    hideLoadingOverlay();
    hideLoadingButton('submitAnswerBtn', 'Submit Answer');
    showNotification(`Failed to submit answer: ${error.message}`, 'error');
    
    startQuestionTimer();
  }
}

async function submitRushedAnswer(answer) {
  showLoadingButton('submitAnswerBtn', 'Processing Rushed Answer...');
  showLoadingOverlay('Analyzing your last-second desperate attempt...');

  try {
    const response = await apiCall('/api/game/submit-answer', {
      method: 'POST',
      body: JSON.stringify({
        session_code: gameState.sessionCode,
        player_id: gameState.playerId,
        question_number: gameState.currentQuestion,
        answer_text: answer,
        is_rushed: true
      })
    });
    
    hideLoadingOverlay();
    
    const rushedPenalty = Math.max(0, (response.score || 50) - 30);
    response.score = rushedPenalty;
    response.analysis = `RUSHED ANSWER: ${response.analysis || 'Your panicked, last-second response shows poor decision-making under pressure.'}`;
    
    if (rushedPenalty < 25 || Math.random() < 0.7) {
      response.instant_death = true;
      response.death_reason = 'Rushed decision-making under time pressure led to fatal mistake';
    }
    
    await processAnswerResponse(response);
    
  } catch (error) {
    console.error('Failed to submit rushed answer:', error);
    hideLoadingOverlay();
    await forceElimination('Failed to submit answer in time due to technical issues');
  }
}

async function processAnswerResponse(response) {
  console.log('Answer submitted:', response);
  hideLoadingOverlay();
  
  gameState.playerChoices.push({
    question_number: gameState.currentQuestion,
    answer_text: response.answer_text || document.getElementById('playerAnswer').value.trim(),
    score: response.score,
    analysis: response.analysis,
    choice_classification: response.choice_classification
  });
  
  await showScoreReveal(response);
  
  if (response.instant_death) {
    console.log('Player has been eliminated');
    gameState.isEliminated = true;
    gameState.eliminationReason = response.elimination_reason;
    
    hideLoadingButton('submitAnswerBtn', 'Submit Answer');
    
    await showEliminationScreen(response.death_narrative);
    return;
  }
  
  document.getElementById('playerAnswer').value = '';
  
  if (gameState.currentQuestion < gameState.totalQuestions) {
    gameState.currentQuestion++;
    console.log('Moving to question:', gameState.currentQuestion);
    
    showLoadingOverlay(`Preparing scenario ${gameState.currentQuestion} based on your choices...`, true);
    
    setTimeout(async () => {
      hideLoadingOverlay();
      await displayCurrentScenario();
      hideLoadingButton('submitAnswerBtn', 'Submit Answer');
      
      startQuestionTimer();
    }, 2000);
    
  } else {
    console.log('Game completed, showing results');
    hideLoadingButton('submitAnswerBtn', 'Submit Answer');
    await showResults();
  }
}

async function forceElimination(reason) {
  gameState.isEliminated = true;
  gameState.eliminationReason = reason;
  
  showNotification('Time expired! You have been eliminated!', 'error');
  
  const eliminationNarrative = {
    player_name: gameState.playerName,
    eliminated: true,
    death_narrative: `Time ran out and panic set in. ${reason}. In horror scenarios, hesitation and poor time management are often fatal mistakes.`,
    death_analysis: 'Your inability to make timely decisions under pressure led to your elimination. Survival requires quick thinking and decisive action.',
    fate_title: 'ELIMINATED - TIME EXPIRED',
    elimination_reason: reason
  };
  
  await showEliminationScreen(eliminationNarrative);
}

// ============================================================================
// INTERACTIVE LOADING AND ANIMATIONS
// ============================================================================

function showInteractiveLoading(message, playerAnswer) {
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay interactive';
  
  const analysisWords = extractKeyWords(playerAnswer);
  
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">${message}</div>
      
      <div class="analysis-preview" id="analysisPreview">
        <h4>AI is analyzing your choice...</h4>
        <div class="key-words">
          <span>Detected keywords:</span>
          <div class="word-tags" id="wordTags"></div>
        </div>
        <div class="survival-meter">
          <div class="meter-label">Survival Probability</div>
          <div class="meter-bar">
            <div class="meter-fill" id="meterFill"></div>
          </div>
          <div class="meter-text" id="meterText">Calculating...</div>
        </div>
      </div>
      
      <div class="entertainment-section" id="entertainmentSection">
        <div class="horror-facts">
          <h4>While you wait... Horror Survival Tip:</h4>
          <p id="horrorTip">Loading...</p>
        </div>
      </div>
      
      <div class="loading-time">
        <span id="loadingTimer">00:00</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  startWordAnimation(analysisWords);
  startSurvivalMeterAnimation();
  startHorrorTips();
  startLoadingTimer();
}

function extractKeyWords(answer) {
  const cautious = ['carefully', 'slowly', 'quietly', 'observe', 'listen', 'plan', 'strategy', 'safe', 'caution', 'think'];
  const aggressive = ['run', 'charge', 'attack', 'rush', 'fast', 'immediately', 'grab', 'fight'];
  const reckless = ['scream', 'panic', 'ignore', 'foolish', 'stupid'];
  
  const words = answer.toLowerCase().split(/\W+/);
  const detected = [];
  
  words.forEach(word => {
    if (cautious.includes(word)) detected.push({word, type: 'cautious'});
    else if (aggressive.includes(word)) detected.push({word, type: 'aggressive'});
    else if (reckless.includes(word)) detected.push({word, type: 'reckless'});
  });
  
  return detected.slice(0, 6);
}

function startWordAnimation(words) {
  const container = document.getElementById('wordTags');
  if (!container) return;
  
  words.forEach((wordObj, index) => {
    setTimeout(() => {
      const tag = document.createElement('span');
      tag.className = `word-tag ${wordObj.type}`;
      tag.textContent = wordObj.word;
      container.appendChild(tag);
    }, index * 500);
  });
}

function startSurvivalMeterAnimation() {
  const meterFill = document.getElementById('meterFill');
  const meterText = document.getElementById('meterText');
  if (!meterFill || !meterText) return;
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 100) progress = 100;
    
    meterFill.style.width = `${progress}%`;
    meterText.textContent = `${Math.round(progress)}%`;
    
    if (progress >= 100) {
      clearInterval(interval);
      meterText.textContent = 'Analysis complete!';
    }
  }, 800);
  
  window.meterInterval = interval;
}

function startHorrorTips() {
  const tips = [
    "In horror scenarios, the first person to investigate strange sounds usually dies first.",
    "Running blindly is often worse than standing your ground and thinking.",
    "Trust your instincts - if something feels wrong, it usually is.",
    "In group scenarios, staying together increases survival odds by 60%.",
    "The most dangerous time in any horror scenario is when you think you're safe.",
    "Panicking reduces your decision-making ability by up to 70%.",
    "Most horror movie deaths could be avoided with basic communication skills."
  ];
  
  const tipElement = document.getElementById('horrorTip');
  if (!tipElement) return;
  
  let currentTip = 0;
  tipElement.textContent = tips[currentTip];
  
  const tipInterval = setInterval(() => {
    currentTip = (currentTip + 1) % tips.length;
    tipElement.textContent = tips[currentTip];
  }, 4000);
  
  window.tipInterval = tipInterval;
}

function startLoadingTimer() {
  const timerElement = document.getElementById('loadingTimer');
  if (!timerElement) return;
  
  let seconds = 0;
  const timerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerElement.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
  
  window.timerInterval = timerInterval;
}

// ============================================================================
// SCORE REVEAL AND ELIMINATION HANDLING
// ============================================================================

async function showScoreReveal(response) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'score-reveal-overlay';
    overlay.innerHTML = `
      <div class="score-reveal-content">
        <div class="score-animation">
          <div class="score-number" id="animatedScore">0</div>
          <div class="score-label">Survival Score</div>
        </div>
        <div class="score-classification ${response.choice_classification}" id="scoreClass">
          ${response.choice_classification?.toUpperCase() || 'ANALYZING...'}
        </div>
        <div class="score-analysis" id="scoreAnalysisText">
          ${response.analysis || 'Analyzing your decision...'}
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    let currentScore = 0;
    const targetScore = response.score || 50;
    const increment = targetScore / 30;
    
    const scoreInterval = setInterval(() => {
      currentScore += increment;
      if (currentScore >= targetScore) {
        currentScore = targetScore;
        clearInterval(scoreInterval);
        
        const scoreElement = document.getElementById('animatedScore');
        if (scoreElement) {
          scoreElement.className = `score-number ${getScoreClass(targetScore)}`;
        }
        
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 3000);
      }
      
      const scoreElement = document.getElementById('animatedScore');
      if (scoreElement) {
        scoreElement.textContent = Math.round(currentScore);
      }
    }, 33);
  });
}

function getScoreClass(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'poor';
}

async function showEliminationScreen(deathNarrative = null) {
  clearQuestionTimer();
  
  try {
    const narrativeElement = document.getElementById('deathNarrative');
    const analysisElement = document.getElementById('eliminationAnalysis');
    
    if (deathNarrative) {
      narrativeElement.innerHTML = `
        <h3>${deathNarrative.fate_title || 'ELIMINATED'}</h3>
        <p><strong>${deathNarrative.death_narrative}</strong></p>
      `;
      
      analysisElement.innerHTML = `
        <h4>Analysis:</h4>
        <p>${deathNarrative.death_analysis || deathNarrative.survival_analysis || 'Your choices led to elimination.'}</p>
      `;
    } else {
      narrativeElement.innerHTML = `
        <h3>ELIMINATED</h3>
        <p><strong>Your poor decisions have caught up with you, leading to your untimely elimination from the game.</strong></p>
      `;
      
      analysisElement.innerHTML = `
        <h4>Analysis:</h4>
        <p>Your survival instincts were not enough to keep you alive in this horror scenario.</p>
      `;
    }
    
    showScreen('eliminationScreen');
    showNotification('You have been eliminated from the game', 'error');
    
  } catch (error) {
    console.error('Error showing elimination screen:', error);
    showNotification('You have been eliminated from the game', 'error');
    showScreen('eliminationScreen');
  }
}

// ============================================================================
// RESULTS MANAGEMENT
// ============================================================================

async function showResults() {
  try {
    showInteractiveResultsLoading();
    
    const response = await apiCall(`/api/game/results/${gameState.sessionCode}`);
    
    hideLoadingOverlay();
    
    const resultsContainer = document.getElementById('resultsContainer');
    const summaryElement = document.getElementById('resultsSummary');
    
    resultsContainer.innerHTML = '';
    
    if (response.survivors !== undefined && response.eliminated !== undefined) {
      summaryElement.innerHTML = `
        <p><strong>Final Statistics:</strong></p>
        <p>Survivors: ${response.survivors} | Eliminated: ${response.eliminated} | Total Players: ${response.total_players}</p>
      `;
    }
    
    if (!response.results || response.results.length === 0) {
      console.warn('No results received from API');
      showMockResults();
      showNotification('No results available - showing placeholder', 'warning');
      return;
    }
    
    response.results.forEach((result, index) => {
      setTimeout(() => {
        const resultDiv = document.createElement('div');
        const isEliminated = result.eliminated || false;
        const survived = result.survived || false;
        
        resultDiv.className = `result-card ${survived ? 'survivor' : 'victim'} animate-in`;
        
        if (isEliminated) {
          resultDiv.innerHTML = `
            <div class="result-name">${result.player_name}</div>
            <div class="result-fate">${result.fate_title || 'ELIMINATED'}</div>
            <div class="result-narrative">${result.death_narrative || result.narrative || 'Eliminated from the game'}</div>
            <div class="result-analysis">${result.death_analysis || result.survival_analysis || 'Poor survival choices led to elimination'}</div>
          `;
        } else {
          resultDiv.innerHTML = `
            <div class="rank-number">${result.rank || index + 1}</div>
            <div class="result-name">${result.player_name}</div>
            <div class="result-fate">${result.fate_title || 'Unknown Fate'}</div>
            <div class="result-narrative">${result.narrative || 'No story available'}</div>
            <div class="result-analysis">${result.survival_analysis || result.analysis || 'No analysis available'}</div>
          `;
        }
        
        resultsContainer.appendChild(resultDiv);
      }, index * 800);
    });
    
    showScreen('resultsScreen');
    showNotification('Final results revealed!', 'success');
    
  } catch (error) {
    console.error('Failed to load results:', error);
    hideLoadingOverlay();
    
    showMockResults();
    showNotification('Using backup results - some features may be limited', 'warning');
  }
}

function showInteractiveResultsLoading() {
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay results-loading';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message" id="loadingMessage">Generating final results...</div>
      
      <div class="results-preview">
        <h4>Determining Final Fates...</h4>
        <div class="fate-calculator">
          <div class="calculating-item" id="calc1">Analyzing survival scores...</div>
          <div class="calculating-item" id="calc2">Ranking players...</div>
          <div class="calculating-item" id="calc3">Crafting death narratives...</div>
          <div class="calculating-item" id="calc4">Writing final verdicts...</div>
        </div>
        
        <div class="suspense-build">
          <div class="suspense-text" id="suspenseText">Who will survive?</div>
        </div>
      </div>
      
      <div class="loading-time">
        <span id="loadingTimer">00:00</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  startResultsAnimation();
  startLoadingTimer();
}

function startResultsAnimation() {
  const items = ['calc1', 'calc2', 'calc3', 'calc4'];
  const suspenseTexts = [
    "Who will survive?",
    "Who made the fatal mistake?",
    "The final verdict approaches...",
    "Your fate has been decided..."
  ];
  
  let currentItem = 0;
  let currentSuspense = 0;
  
  const calcInterval = setInterval(() => {
    const element = document.getElementById(items[currentItem]);
    if (element) {
      element.classList.add('completed');
    }
    
    currentItem++;
    if (currentItem >= items.length) {
      clearInterval(calcInterval);
    }
  }, 2000);
  
  const suspenseInterval = setInterval(() => {
    const suspenseElement = document.getElementById('suspenseText');
    if (suspenseElement) {
      suspenseElement.textContent = suspenseTexts[currentSuspense];
      currentSuspense = (currentSuspense + 1) % suspenseTexts.length;
    }
  }, 3000);
  
  window.calcInterval = calcInterval;
  window.suspenseInterval = suspenseInterval;
}

function showMockResults() {
  const resultsContainer = document.getElementById('resultsContainer');
  const summaryElement = document.getElementById('resultsSummary');
  
  summaryElement.innerHTML = `
    <p><strong>Final Statistics:</strong></p>
    <p>Survivors: 1 | Eliminated: 0 | Total Players: 1</p>
  `;
  
  resultsContainer.innerHTML = `
    <div class="result-card survivor">
      <div class="rank-number">1</div>
      <div class="result-name">${gameState.playerName}</div>
      <div class="result-fate">SOLE SURVIVOR</div>
      <div class="result-narrative">Your cautious and logical approach kept you alive when others might have perished. You avoided unnecessary risks and made smart decisions under pressure.</div>
      <div class="result-analysis">Your survival instincts and decision-making skills proved superior in this horror scenario.</div>
    </div>
  `;
  showScreen('resultsScreen');
}

// ============================================================================
// EVENT LISTENERS AND INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Home screen buttons
  document.getElementById('createGameBtn').addEventListener('click', createGameSession);
  document.getElementById('joinGameBtn').addEventListener('click', () => showScreen('joinScreen'));
  
  // Join screen buttons
  document.getElementById('joinSessionBtn').addEventListener('click', () => joinGameSession());
  document.getElementById('backToHomeBtn').addEventListener('click', () => showScreen('homeScreen'));
  
  // Lobby screen buttons
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('leaveLobbyBtn').addEventListener('click', () => showScreen('homeScreen'));
  
  // Game screen buttons
  document.getElementById('submitAnswerBtn').addEventListener('click', submitAnswer);
  
  // Elimination screen buttons
  document.getElementById('watchOthersBtn').addEventListener('click', () => showScreen('lobbyScreen'));
  document.getElementById('returnToLobbyBtn').addEventListener('click', () => showScreen('homeScreen'));
  
  // Results screen buttons
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('newSessionBtn').addEventListener('click', () => showScreen('homeScreen'));
  
  // Theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      selectTheme(option.dataset.theme);
    });
  });
  
  // Character counter for answer textarea
  const answerTextarea = document.getElementById('playerAnswer');
  if (answerTextarea) {
    const counterDiv = document.createElement('div');
    counterDiv.className = 'character-counter';
    counterDiv.id = 'characterCounter';
    answerTextarea.parentNode.appendChild(counterDiv);

    answerTextarea.addEventListener('input', function() {
      const length = this.value.length;
      const counter = document.getElementById('characterCounter');
      counter.textContent = `${length} characters`;
      
      if (length > 500) {
        counter.className = 'character-counter warning';
      } else {
        counter.className = 'character-counter';
      }
    });
  }
  
  // Enter key handlers
  document.getElementById('sessionCode').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      joinGameSession();
    }
  });
  
  document.getElementById('playerName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      joinGameSession();
    }
  });
  
  document.getElementById('playerAnswer').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      submitAnswer();
    }
  });
});