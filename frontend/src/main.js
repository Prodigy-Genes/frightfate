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
  totalQuestions: 10,
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
  } catch (error) {
    alert('Failed to create game session. Please try again.');
  }
}

// Join an existing game session
async function joinGameSession(sessionCode = null, playerName = null) {
  const code = sessionCode || document.getElementById('sessionCode').value.toUpperCase();
  const name = playerName || document.getElementById('playerName').value;
  
  if (!code || !name) {
    alert('Please enter both session code and your name.');
    return;
  }

  try {
    const response = await apiCall(`/api/game/join-session/${code}?player_name=${encodeURIComponent(name)}`, {
      method: 'POST'
    });
    
    gameState.sessionCode = code;
    gameState.playerId = response.player_id;
    gameState.playerName = name;
    
    await loadLobby();
  } catch (error) {
    alert('Failed to join session. Please check the session code and try again.');
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
    const scenarios = await apiCall(`/api/game/scenarios/${gameState.currentTheme}`);
    gameState.scenarios = scenarios;
    console.log('Loaded scenarios:', scenarios);
  } catch (error) {
    console.error('Failed to load scenarios from API:', error);
    // Fall back to mock scenarios
    console.log('Using mock scenarios as fallback');
    gameState.scenarios = mockScenarios;
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
  await loadScenarios();
  gameState.currentQuestion = 1;
  displayCurrentScenario();
  showScreen('gameScreen');
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
    alert('Please provide an answer before submitting.');
    return;
  }

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
    
    // Clear the answer field
    document.getElementById('playerAnswer').value = '';
    
    // Move to next question or finish game
    if (gameState.currentQuestion < gameState.scenarios.length) {
      gameState.currentQuestion++;
      console.log('Moving to question:', gameState.currentQuestion);
      displayCurrentScenario();
    } else {
      console.log('Game completed, showing results');
      await showResults();
    }
  } catch (error) {
    console.error('Failed to submit answer:', error);
    alert('Failed to submit answer. Please try again.');
  }
}

// Show final results
async function showResults() {
  try {
    const results = await apiCall(`/api/game/results/${gameState.sessionCode}`);
    
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.innerHTML = '';
    
    results.forEach((result, index) => {
      const resultDiv = document.createElement('div');
      resultDiv.className = `result-card ${result.survived ? 'survivor' : 'victim'}`;
      resultDiv.innerHTML = `
        <div class="rank-number">${index + 1}</div>
        <div class="result-name">${result.player_name}</div>
        <div class="result-fate">${result.fate}</div>
        <div class="result-analysis">${result.analysis}</div>
      `;
      resultsContainer.appendChild(resultDiv);
    });
    
    showScreen('resultsScreen');
  } catch (error) {
    console.error('Failed to load results:', error);
    // Show mock results for testing
    showMockResults();
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
  });
  
  // Enter key handlers
  document.getElementById('playerAnswer').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
      submitAnswer();
    }
  });
});