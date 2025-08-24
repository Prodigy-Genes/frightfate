import './style.css'

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Global state
let gameState = {
  sessionCode: '',
  playerId: '',
  playerName: '',
  currentTheme: 'haunted_house',
  currentQuestion: 0,
  totalQuestions: 5,
  scenarios: [],
  isGameHost: false
};

// Screen management
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// API calls
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Create a new game session
async function createGameSession() {
  showLoadingButton('createGameBtn', 'Creating...');
  
  try {
    const response = await apiCall('/api/game/create-session', {
      method: 'POST',
      body: JSON.stringify({ theme: gameState.currentTheme })
    });
    
    gameState.sessionCode = response.session_code;
    gameState.isGameHost = true;
    
    // Auto-join as the host
    const playerName = prompt('Enter your name:');
    if (playerName) {
      await joinGameSession(response.session_code, playerName);
    }
    
    hideLoadingButton('createGameBtn', 'Create New Game');
    showNotification('✅ Game session created successfully!', 'success');
    
  } catch (error) {
    hideLoadingButton('createGameBtn', 'Create New Game');
    showNotification('❌ Failed to create game session. Please try again.', 'error');
  }
}

// Join an existing game session
async function joinGameSession(sessionCode = null, playerName = null) {
  const code = sessionCode || document.getElementById('sessionCode').value.toUpperCase();
  const name = playerName || document.getElementById('playerName').value;
  
  if (!code || !name) {
    showNotification('⚠️ Please enter both session code and your name.', 'warning');
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
    showNotification('✅ Successfully joined the game!', 'success');
    
  } catch (error) {
    hideLoadingButton('joinSessionBtn', 'Join Session');
    showNotification('❌ Failed to join session. Please check the session code and try again.', 'error');
  }
}

// Load lobby and display players
async function loadLobby() {
  try {
    const session = await apiCall(`/api/game/session/${gameState.sessionCode}`);
    
    document.getElementById('displaySessionCode').textContent = gameState.sessionCode;
    
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    
    session.players.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-item';
      playerDiv.innerHTML = `
        <span>${player.name}</span>
        <span>${player.is_ready ? '✅ Ready' : '⏳ Waiting'}</span>
      `;
      playersList.appendChild(playerDiv);
    });
    
    showScreen('lobbyScreen');
  } catch (error) {
    alert('Failed to load lobby information.');
  }
}

// Load scenarios for the current theme
async function loadScenarios() {
  try {
    console.log('Loading scenarios for theme:', gameState.currentTheme);
    showLoadingOverlay('🎭 Crafting terrifying scenarios...');
    
    const scenarios = await apiCall(`/api/game/scenarios/${gameState.currentTheme}`);
    gameState.scenarios = scenarios;
    console.log('Loaded scenarios:', scenarios);
    
    hideLoadingOverlay();
    showNotification('✅ Scenarios loaded successfully!', 'success');
    
  } catch (error) {
    console.error('Failed to load scenarios from API:', error);
    hideLoadingOverlay();
    
    // Fall back to mock scenarios
    console.log('Using mock scenarios as fallback');
    gameState.scenarios = mockScenarios;
    
    showNotification('⚠️ Using backup scenarios - some features may be limited', 'warning');
  }
}


// Mock scenarios for testing (until we implement the API endpoint)
const mockScenarios = [
  {
    question_number: 1,
    title: "The Creaking Door",
    description: "You've just inherited an old Victorian mansion from your great aunt. As you step inside for the first time, the heavy wooden door slams shut behind you with a resounding BANG. The key that worked moments ago now refuses to turn. Through the dusty windows, you see your car in the driveway, but the door won't budge. What do you do?"
  },
  {
    question_number: 2,
    title: "Whispers in the Walls",
    description: "As you explore the mansion's grand foyer, you hear faint whispers coming from within the walls themselves. The voices seem to be having a conversation, but you can't make out the words. The whispers grow louder as you approach the ornate staircase leading to the second floor. Suddenly, you hear your name being called from upstairs, but you came here alone. What do you do?"
  }
];

// Start the game
async function startGame() {
  showLoadingButton('startGameBtn', 'Starting Game...');
  
  try {
    await loadScenarios();
    gameState.currentQuestion = 1;
    displayCurrentScenario();
    showScreen('gameScreen');
    
    hideLoadingButton('startGameBtn', 'Start Game');
  } catch (error) {
    hideLoadingButton('startGameBtn', 'Start Game');
    showNotification('❌ Failed to start game. Please try again.', 'error');
  }
}


// Display current scenario
function displayCurrentScenario() {
  console.log('Displaying scenario:', gameState.currentQuestion, 'Total scenarios:', gameState.scenarios.length);
  
  const scenario = gameState.scenarios.find(s => s.question_number === gameState.currentQuestion);
  
  if (scenario) {
    document.getElementById('scenarioNumber').textContent = gameState.currentQuestion;
    document.getElementById('scenarioTitle').textContent = scenario.title;
    document.getElementById('scenarioDescription').textContent = scenario.description;
    
    // Update progress bar
    const progress = (gameState.currentQuestion / gameState.scenarios.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    console.log('Scenario displayed successfully');
  } else {
    console.error('Scenario not found for question:', gameState.currentQuestion);
    console.log('Available scenarios:', gameState.scenarios);
  }
}

// Submit player answer
async function submitAnswer() {
  const answer = document.getElementById('playerAnswer').value.trim();
  
  if (!answer) {
    showNotification('⚠️ Please provide an answer before submitting.', 'warning');
    return;
  }

  if (answer.length < 10) {
    showNotification('⚠️ Please provide a more detailed answer.', 'warning');
    return;
  }

  showLoadingButton('submitAnswerBtn', 'Analyzing...');
  showLoadingOverlay('🧠 AI analyzing your survival choices...');

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
    
    console.log('Answer submitted:', response);
    hideLoadingOverlay();
    
    // Show score feedback if available
    if (response.score) {
      const scoreColor = response.score >= 70 ? 'success' : response.score >= 40 ? 'warning' : 'error';
      showNotification(`📊 Survival Score: ${response.score}/100`, scoreColor);
    }
    
    // Clear the answer field
    document.getElementById('playerAnswer').value = '';
    
    // Move to next question or finish game
    if (gameState.currentQuestion < gameState.scenarios.length) {
      gameState.currentQuestion++;
      console.log('Moving to question:', gameState.currentQuestion);
      
      // Show loading for next scenario
      showLoadingOverlay('🎬 Preparing next scenario...');
      
      // Small delay for dramatic effect
      setTimeout(() => {
        hideLoadingOverlay();
        displayCurrentScenario();
        hideLoadingButton('submitAnswerBtn', 'Submit Answer');
      }, 1500);
      
    } else {
      console.log('Game completed, showing results');
      hideLoadingButton('submitAnswerBtn', 'Submit Answer');
      
      // Don't show another overlay here since showResults() will show its own
      await showResults();
    }
    
  } catch (error) {
    console.error('Failed to submit answer:', error);
    hideLoadingOverlay();
    hideLoadingButton('submitAnswerBtn', 'Submit Answer');
    showNotification('❌ Failed to submit answer. Please try again.', 'error');
  }
}


// Show final results
async function showResults() {
  try {
    showLoadingOverlay('📊 Generating final results...');
    
    const results = await apiCall(`/api/game/results/${gameState.sessionCode}`);
    
    // Ensure overlay is hidden before proceeding
    hideLoadingOverlay();
    
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';
    
    // Check if results exist and have data
    if (!results || results.length === 0) {
      console.warn('No results received from API');
      showMockResults();
      showNotification('⚠️ No results available - showing placeholder', 'warning');
      return;
    }
    
    results.forEach((result, index) => {
      const resultDiv = document.createElement('div');
      resultDiv.className = `result-card ${result.survived ? 'survivor' : 'victim'}`;
      resultDiv.innerHTML = `
        <div class="rank-number">${index + 1}</div>
        <div class="result-name">${result.player_name}</div>
        <div class="result-fate">${result.fate_title || 'Unknown Fate'}</div>
        <div class="result-narrative">${result.narrative || 'No story available'}</div>
        <div class="result-analysis">${result.survival_analysis || result.analysis || 'No analysis available'}</div>
      `;
      resultsContainer.appendChild(resultDiv);
    });
    
    showScreen('resultsScreen');
    showNotification('🎭 Final results revealed!', 'success');
    
  } catch (error) {
    console.error('Failed to load results:', error);
    hideLoadingOverlay(); // Ensure overlay is hidden on error too
    
    // Show mock results for testing
    showMockResults();
    showNotification('⚠️ Using backup results - some features may be limited', 'warning');
  }
}


// Show mock results for testing
function showMockResults() {
  const resultsContainer = document.getElementById('resultsContainer');
  resultsContainer.innerHTML = `
    <div class="result-card survivor">
      <div class="rank-number">1</div>
      <div class="result-name">${gameState.playerName}</div>
      <div class="result-fate">🎉 SOLE SURVIVOR</div>
      <div class="result-analysis">Your cautious and logical approach kept you alive when others perished. You avoided unnecessary risks and made smart decisions under pressure.</div>
    </div>
  `;
  showScreen('resultsScreen');
}

// Add these utility functions for loading states and notifications
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

function showNotification(message, type = 'info') {
  // Remove existing notifications
  document.querySelectorAll('.notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  // Manual close
  notification.querySelector('.notification-close').onclick = () => notification.remove();
}

function showLoadingOverlay(message = 'Loading...') {
  // Remove any existing overlays first
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner large"></div>
      <div class="loading-message">${message}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  console.log('Loading overlay shown with message:', message);
}


function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    console.log('Removing loading overlay');
    overlay.remove();
  } else {
    console.warn('Loading overlay not found when trying to hide it');
  }
}

// Theme selection
function selectTheme(theme) {
  gameState.currentTheme = theme;
  document.querySelectorAll('.theme-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`[data-theme="${theme}"]`).classList.add('selected');
}

// Event listeners
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
  
  // Results screen buttons
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('newSessionBtn').addEventListener('click', () => showScreen('homeScreen'));
  
  // Theme selection
  document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      selectTheme(option.dataset.theme);
    });

    // Add character counter to answer textarea
  const answerTextarea = document.getElementById('playerAnswer');
  if (answerTextarea) {
    const counterDiv = document.createElement('div');
    counterDiv.className = 'character-counter';
    answerTextarea.parentNode.appendChild(counterDiv);

    answerTextarea.addEventListener('input', function() {
      const length = this.value.length;
      counterDiv.textContent = `${length} characters`;
      
      if (length > 500) {
        counterDiv.className = 'character-counter warning';
      } else {
        counterDiv.className = 'character-counter';
      }
    });
  } 
  });
  
  // Enter key handlers
  document.getElementById('playerAnswer').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      submitAnswer();
    }
  });
});