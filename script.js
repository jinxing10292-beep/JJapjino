// 게임 상태 관리
let balance = 1000;
let currentGame = null;

// Supabase 설정
const SUPABASE_URL = 'https://zspxwvruilxybxdcqrgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcHh3dnJ1aWx4eWJ4ZGNxcmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTYyNTcsImV4cCI6MjA4NjQ3MjI1N30.-BiO_yTdk70Rvi4izjJczC_kTJKppJyrn4VZFqFizyU';
let supabase = null;
let isOnline = false;
let currentUser = null;

// 랭킹 예측 베팅 시스템
let predictionBets = [];
let predictionTimer = 600; // 10분 = 600초
let predictionInterval = null;
let nextRankingUpdate = null;

// 블랙잭 게임 상태
let deck = [];
let playerCards = [];
let dealerCards = [];
let gameInProgress = false;

// 통계 데이터
let gameStats = {
    totalGames: 0,
    totalBet: 0,
    totalWon: 0,
    wins: 0,
    maxBalance: 1000,
    gameCount: {
        roulette: 0,
        blackjack: 0,
        slots: 0,
        poker: 0,
        baccarat: 0,
        dice: 0,
        coinflip: 0,
        rps: 0,
        racing: 0,
        wheel: 0,
        lottery: 0,
        crash: 0
    }
};

// 로컬 저장소 키
const SAVE_KEY = 'casino_game_save';

// 게임 상태 저장
function saveGame() {
    const gameState = {
        balance: balance,
        gameStats: gameStats,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

// 게임 상태 로드
function loadGame() {
    try {
        const savedGame = localStorage.getItem(SAVE_KEY);
        if (savedGame) {
            const gameState = JSON.parse(savedGame);
            balance = gameState.balance || 1000;
            gameStats = gameState.gameStats || {
        totalGames: 0,
        totalBet: 0,
        totalWon: 0,
        wins: 0,
        maxBalance: 1000,
        gameCount: {
            roulette: 0, blackjack: 0, slots: 0, poker: 0, baccarat: 0,
            dice: 0, coinflip: 0, rps: 0, racing: 0, wheel: 0, lottery: 0, crash: 0, sports: 0
        }
    };
            updateBalanceDisplay();
            
            // 저장된 시간 표시 (선택사항)
            if (gameState.timestamp) {
                const saveDate = new Date(gameState.timestamp);
                console.log(`게임 로드됨: ${saveDate.toLocaleString()}`);
            }
        }
    } catch (error) {
        console.error('게임 로드 실패:', error);
        balance = 1000;
        gameStats = {
            totalGames: 0,
            totalBet: 0,
            totalWon: 0,
            wins: 0,
            maxBalance: 1000,
            gameCount: {
                roulette: 0, blackjack: 0, slots: 0, poker: 0, baccarat: 0,
                dice: 0, coinflip: 0, rps: 0, racing: 0, wheel: 0, lottery: 0, crash: 0
            }
        };
        updateBalanceDisplay();
    }
}

// 게임 리셋
function resetGame() {
    if (confirm('정말로 게임을 초기화하시겠습니까? 모든 진행 상황과 통계가 삭제됩니다.')) {
        localStorage.removeItem(SAVE_KEY);
        balance = 1000;
        gameStats = {
            totalGames: 0,
            totalBet: 0,
            totalWon: 0,
            wins: 0,
            maxBalance: 1000,
            gameCount: {
                roulette: 0, blackjack: 0, slots: 0, poker: 0, baccarat: 0,
                dice: 0, coinflip: 0, rps: 0, racing: 0, wheel: 0, lottery: 0, crash: 0
            }
        };
        updateBalanceDisplay();
        showGameSelection();
        alert('게임이 초기화되었습니다!');
    }
}

// 잔액 표시 업데이트
function updateBalanceDisplay() {
    document.getElementById('balance').textContent = balance;
}

// 도움말 모달 표시
function showHelp() {
    document.getElementById('help-modal').style.display = 'block';
}

// 도움말 모달 닫기
function closeHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// 통계 모달 표시
function showStats() {
    updateStatsDisplay();
    document.getElementById('stats-modal').style.display = 'block';
}

// 통계 모달 닫기
function closeStats() {
    document.getElementById('stats-modal').style.display = 'none';
}

// 랭킹 모달 표시
function showRanking() {
    document.getElementById('ranking-modal').style.display = 'block';
    showRankingTab('balance');
    updateRanking();
}

// 랭킹 모달 닫기
function closeRanking() {
    document.getElementById('ranking-modal').style.display = 'none';
}

// 랭킹 탭 전환
function showRankingTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentRankingTab = tab;
    
    // 예측 베팅 섹션 표시/숨김
    const predictionSection = document.getElementById('prediction-section');
    const rankingList = document.getElementById('ranking-list');
    
    if (tab === 'prediction') {
        predictionSection.style.display = 'block';
        rankingList.style.display = 'none';
        initializePredictionBetting();
    } else {
        predictionSection.style.display = 'none';
        rankingList.style.display = 'block';
        updateRanking();
    }
}

let currentRankingTab = 'balance';
let mockRankingData = []; // 실제로는 서버에서 가져올 데이터

// Supabase 연결 함수
async function connectToSupabase() {
    try {
        if (!supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        
        // 연결 테스트
        const { data, error } = await supabase.from('players').select('count');
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        isOnline = true;
        updateOnlineStatus();
        await syncWithSupabase();
        alert('온라인 모드로 연결되었습니다!');
        
    } catch (error) {
        console.error('Supabase 연결 실패:', error);
        alert('온라인 연결에 실패했습니다. 오프라인 모드로 계속합니다.');
        isOnline = false;
        updateOnlineStatus();
    }
}

// 온라인 상태 표시 업데이트
function updateOnlineStatus() {
    const connectBtn = document.getElementById('connect-btn');
    const header = document.querySelector('header h1');
    
    // 기존 상태 표시 제거
    const existingStatus = document.querySelector('.online-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // 새 상태 표시 추가
    const statusElement = document.createElement('span');
    statusElement.className = `online-status ${isOnline ? 'connected' : 'disconnected'}`;
    statusElement.textContent = isOnline ? '🌐 온라인' : '📴 오프라인';
    header.appendChild(statusElement);
    
    // 버튼 텍스트 변경
    connectBtn.textContent = isOnline ? '🔌 연결 해제' : '🌐 온라인 연결';
    connectBtn.onclick = isOnline ? disconnectFromSupabase : connectToSupabase;
}

// Supabase 연결 해제
function disconnectFromSupabase() {
    isOnline = false;
    updateOnlineStatus();
    alert('오프라인 모드로 전환되었습니다.');
}

// Supabase와 데이터 동기화
async function syncWithSupabase() {
    if (!isOnline || !supabase) return;
    
    try {
        // 내 데이터를 Supabase에 업로드
        const playerData = {
            nickname: pvpGameState.myNickname || 'Player',
            balance: balance,
            wins: gameStats.wins,
            total_games: gameStats.totalGames,
            total_bet: gameStats.totalBet,
            total_won: gameStats.totalWon,
            max_balance: gameStats.maxBalance,
            last_updated: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('players')
            .upsert(playerData, { onConflict: 'nickname' });
            
        if (error) throw error;
        
        // 실시간 랭킹 데이터 가져오기
        await fetchRealRanking();
        
    } catch (error) {
        console.error('데이터 동기화 실패:', error);
    }
}

// 실제 랭킹 데이터 가져오기
async function fetchRealRanking() {
    if (!isOnline || !supabase) {
        generateMockRankingData();
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .order('balance', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        
        // Supabase 데이터를 로컬 형식으로 변환
        mockRankingData = data.map(player => ({
            nickname: player.nickname,
            balance: player.balance,
            wins: player.wins,
            totalGames: player.total_games,
            winRate: player.total_games > 0 ? Math.round((player.wins / player.total_games) * 100) : 0,
            isReal: true // 실제 플레이어 표시
        }));
        
    } catch (error) {
        console.error('랭킹 데이터 가져오기 실패:', error);
        generateMockRankingData();
    }
}

// 통계 표시 업데이트
function updateStatsDisplay() {
    document.getElementById('current-balance').textContent = `$${balance}`;
    document.getElementById('total-games').textContent = gameStats.totalGames;
    document.getElementById('total-bet').textContent = `$${gameStats.totalBet}`;
    document.getElementById('total-won').textContent = `$${gameStats.totalWon}`;
    document.getElementById('win-rate').textContent = 
        gameStats.totalGames > 0 ? `${Math.round((gameStats.wins / gameStats.totalGames) * 100)}%` : '0%';
    document.getElementById('max-balance').textContent = `$${gameStats.maxBalance}`;
    
    // 게임별 통계
    const gameNames = {
        roulette: '🎯 룰렛',
        blackjack: '🃏 블랙잭',
        slots: '🎰 슬롯머신',
        poker: '🃏 포커',
        baccarat: '🎴 바카라',
        dice: '🎲 주사위',
        coinflip: '🪙 동전던지기',
        rps: '✂️ 가위바위보',
        racing: '🐌 달팽이 레이싱',
        wheel: '🎡 행운의 바퀴',
        lottery: '🎫 복권',
        crash: '🚀 크래시',
        sports: '⚽ 스포츠 토토'
    };
    
    const gameStatsList = document.getElementById('game-stats-list');
    gameStatsList.innerHTML = '';
    
    Object.entries(gameStats.gameCount).forEach(([game, count]) => {
        if (count > 0) {
            const item = document.createElement('div');
            item.className = 'game-stat-item';
            item.innerHTML = `
                <span class="game-name">${gameNames[game]}</span>
                <span class="game-count">${count}회</span>
            `;
            gameStatsList.appendChild(item);
        }
    });
    
    if (gameStatsList.children.length === 0) {
        gameStatsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7);">아직 플레이한 게임이 없습니다.</p>';
    }
}

// 게임 통계 업데이트
function updateGameStats(gameName, betAmount, wonAmount) {
    gameStats.totalGames++;
    gameStats.totalBet += betAmount;
    gameStats.totalWon += wonAmount;
    gameStats.gameCount[gameName]++;
    
    if (wonAmount > betAmount) {
        gameStats.wins++;
    }
    
    if (balance > gameStats.maxBalance) {
        gameStats.maxBalance = balance;
    }
    
    saveGame();
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const helpModal = document.getElementById('help-modal');
    const statsModal = document.getElementById('stats-modal');
    const rankingModal = document.getElementById('ranking-modal');
    
    if (event.target === helpModal) {
        closeHelp();
    }
    if (event.target === statsModal) {
        closeStats();
    }
    if (event.target === rankingModal) {
        closeRanking();
    }
}

// 게임 선택 화면 표시
function showGameSelection() {
    document.querySelector('.game-selection').style.display = 'block';
    const games = ['roulette', 'blackjack', 'slots', 'poker', 'baccarat', 'dice', 'coinflip', 'rps', 'racing', 'wheel', 'lottery', 'crash', 'sports', 'pvp-blackjack', 'pvp-poker', 'pvp-rps'];
    games.forEach(game => {
        document.getElementById(game + '-game').style.display = 'none';
    });
    currentGame = null;
}

// 특정 게임 화면 표시
function showGame(game) {
    document.querySelector('.game-selection').style.display = 'none';
    const games = ['roulette', 'blackjack', 'slots', 'poker', 'baccarat', 'dice', 'coinflip', 'rps', 'racing', 'wheel', 'lottery', 'crash', 'sports', 'pvp-blackjack', 'pvp-poker', 'pvp-rps'];
    games.forEach(g => {
        document.getElementById(g + '-game').style.display = 'none';
    });
    
    document.getElementById(game + '-game').style.display = 'block';
    currentGame = game;
    
    // 게임별 초기화
    if (game === 'lottery') {
        initializeLottery();
    } else if (game === 'sports') {
        initializeSports();
    }
}

// 잔액 업데이트
function updateBalance(amount) {
    balance += amount;
    updateBalanceDisplay();
    saveGame(); // 잔액 변경 시 자동 저장
    
    if (balance <= 0) {
        alert('잔액이 부족합니다! 리셋 버튼을 눌러 게임을 다시 시작하세요.');
    }
}

// 룰렛 게임
let selectedBet = null;
let rouletteNumbers = {
    red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
    black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]
};

function placeBet(type, value) {
    selectedBet = { type, value };
    
    // 모든 선택 해제
    document.querySelectorAll('.bet-number, .bet-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    // 현재 선택 표시
    event.target.classList.add('selected');
    
    // 선택된 베팅 표시
    let betText = '';
    let odds = '';
    
    switch(type) {
        case 'number':
            betText = `숫자 ${value}`;
            odds = '36:1';
            break;
        case 'color':
            betText = value === 'red' ? '빨강' : '검정';
            odds = '2:1';
            break;
        case 'parity':
            betText = value === 'even' ? '짝수' : '홀수';
            odds = '2:1';
            break;
        case 'range':
            betText = value === 'low' ? '1-18' : '19-36';
            odds = '2:1';
            break;
    }
    
    document.getElementById('selected-bet').textContent = `${betText} (${odds})`;
    document.getElementById('spin-btn').disabled = false;
}

function spinRoulette() {
    const betAmount = parseInt(document.getElementById('roulette-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    if (!selectedBet) {
        alert('베팅을 선택해주세요!');
        return;
    }
    
    // 베팅 금액 차감
    updateBalance(-betAmount);
    
    // 룰렛 휠 회전
    const wheel = document.getElementById('wheel');
    const randomRotation = Math.random() * 360 + 1800;
    wheel.style.transform = `rotate(${randomRotation}deg)`;
    
    document.getElementById('spin-btn').disabled = true;
    
    setTimeout(() => {
        const resultNumber = Math.floor(Math.random() * 37); // 0-36
        
        let won = false;
        let winAmount = 0;
        let multiplier = 0;
        
        switch(selectedBet.type) {
            case 'number':
                if (resultNumber === selectedBet.value) {
                    won = true;
                    multiplier = 36;
                }
                break;
            case 'color':
                if (selectedBet.value === 'red' && rouletteNumbers.red.includes(resultNumber)) {
                    won = true;
                    multiplier = 2;
                } else if (selectedBet.value === 'black' && rouletteNumbers.black.includes(resultNumber)) {
                    won = true;
                    multiplier = 2;
                }
                break;
            case 'parity':
                if (resultNumber !== 0) {
                    if (selectedBet.value === 'even' && resultNumber % 2 === 0) {
                        won = true;
                        multiplier = 2;
                    } else if (selectedBet.value === 'odd' && resultNumber % 2 === 1) {
                        won = true;
                        multiplier = 2;
                    }
                }
                break;
            case 'range':
                if (selectedBet.value === 'low' && resultNumber >= 1 && resultNumber <= 18) {
                    won = true;
                    multiplier = 2;
                } else if (selectedBet.value === 'high' && resultNumber >= 19 && resultNumber <= 36) {
                    won = true;
                    multiplier = 2;
                }
                break;
        }
        
        if (won) {
            winAmount = betAmount * multiplier;
            updateBalance(winAmount);
            updateGameStats('roulette', betAmount, winAmount);
            alert(`축하합니다! ${resultNumber}번이 나왔습니다. $${winAmount}를 획득했습니다!`);
        } else {
            updateGameStats('roulette', betAmount, 0);
            alert(`아쉽습니다! ${resultNumber}번이 나왔습니다.`);
        }
        
        // 초기화
        selectedBet = null;
        document.querySelectorAll('.bet-number, .bet-option').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('selected-bet').textContent = '베팅을 선택하세요';
        document.getElementById('roulette-bet').value = '';
        document.getElementById('spin-btn').disabled = true;
    }, 3000);
}

// 카드 덱 생성
function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    deck = [];
    
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({
                suit: suit,
                rank: rank,
                value: getCardValue(rank)
            });
        }
    }
    
    // 덱 섞기
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 카드 값 계산
function getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(rank)) return 10;
    return parseInt(rank);
}

// 카드 뽑기
function drawCard() {
    return deck.pop();
}

// 점수 계산 (에이스 처리 포함)
function calculateScore(cards) {
    let score = 0;
    let aces = 0;
    
    for (let card of cards) {
        if (card.rank === 'A') {
            aces++;
        }
        score += card.value;
    }
    
    // 에이스를 1로 계산해야 하는 경우
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

// 카드 표시
function displayCard(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    if (card.suit === '♥' || card.suit === '♦') {
        cardElement.classList.add('red');
    }
    cardElement.textContent = `${card.rank}${card.suit}`;
    return cardElement;
}

// 카드들 화면에 표시
function displayCards(cards, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    for (let card of cards) {
        container.appendChild(displayCard(card));
    }
}

// 점수 업데이트
function updateScores() {
    const playerScore = calculateScore(playerCards);
    const dealerScore = calculateScore(dealerCards);
    
    document.getElementById('player-score').textContent = `점수: ${playerScore}`;
    document.getElementById('dealer-score').textContent = `점수: ${dealerScore}`;
    
    return { playerScore, dealerScore };
}

// 블랙잭 게임 시작
function startBlackjack() {
    const betAmount = parseInt(document.getElementById('blackjack-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    if (gameInProgress) {
        alert('게임이 이미 진행 중입니다!');
        return;
    }
    
    // 베팅 금액 차감
    updateBalance(-betAmount);
    gameInProgress = true;
    
    // 덱 생성 및 카드 초기화
    createDeck();
    playerCards = [];
    dealerCards = [];
    
    // 초기 카드 배분
    playerCards.push(drawCard());
    dealerCards.push(drawCard());
    playerCards.push(drawCard());
    dealerCards.push(drawCard());
    
    // 카드 표시
    displayCards(playerCards, 'player-cards');
    displayDealerCards(dealerCards, 'dealer-cards', true); // 첫 카드만 표시
    
    // 점수 업데이트
    updateScores();
    
    // 버튼 활성화
    document.getElementById('hit-btn').disabled = false;
    document.getElementById('stand-btn').disabled = false;
    
    // 블랙잭 체크
    const playerScore = calculateScore(playerCards);
    if (playerScore === 21) {
        stand(); // 자동으로 스탠드
    }
}

// 히트 (카드 한 장 더 받기)
function hit() {
    if (!gameInProgress) return;
    
    playerCards.push(drawCard());
    displayCards(playerCards, 'player-cards');
    
    const { playerScore } = updateScores();
    
    if (playerScore > 21) {
        // 버스트
        endGame('버스트! 딜러가 승리했습니다.');
    } else if (playerScore === 21) {
        stand(); // 21이면 자동으로 스탠드
    }
}

// 스탠드 (카드 받기 중단)
function stand() {
    if (!gameInProgress) return;
    
    // 딜러의 모든 카드 표시
    displayCards(dealerCards, 'dealer-cards');
    
    // 딜러가 17 이상이 될 때까지 카드 뽑기
    while (calculateScore(dealerCards) < 17) {
        dealerCards.push(drawCard());
        displayCards(dealerCards, 'dealer-cards');
    }
    
    const { playerScore, dealerScore } = updateScores();
    
    // 승부 판정
    let message = '';
    let winAmount = 0;
    const betAmount = parseInt(document.getElementById('blackjack-bet').value);
    
    if (dealerScore > 21) {
        message = '딜러 버스트! 플레이어 승리!';
        winAmount = betAmount * 2;
    } else if (playerScore > dealerScore) {
        message = '플레이어 승리!';
        winAmount = betAmount * 2;
    } else if (playerScore < dealerScore) {
        message = '딜러 승리!';
    } else {
        message = '무승부!';
        winAmount = betAmount; // 베팅 금액 반환
    }
    
    if (winAmount > 0) {
        updateBalance(winAmount);
    }
    
    endGame(message);
}

// 게임 종료
function endGame(message) {
    gameInProgress = false;
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;
    document.getElementById('blackjack-bet').value = '';
    
    setTimeout(() => {
        alert(message);
    }, 500);
}

// 슬롯머신 게임
function spinSlots() {
    const betAmount = parseInt(document.getElementById('slot-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    // 베팅 금액 차감
    updateBalance(-betAmount);
    
    const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
    const reels = ['reel1', 'reel2', 'reel3'];
    const results = [];
    
    // 각 릴 스핀 애니메이션
    reels.forEach((reelId, index) => {
        const reel = document.getElementById(reelId);
        let spins = 0;
        const maxSpins = 20 + index * 5; // 각 릴마다 다른 속도
        
        const spinInterval = setInterval(() => {
            reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            spins++;
            
            if (spins >= maxSpins) {
                clearInterval(spinInterval);
                const finalSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                reel.textContent = finalSymbol;
                results[index] = finalSymbol;
                
                // 모든 릴이 멈췄을 때 결과 확인
                if (results.length === 3) {
                    checkSlotResults(results, betAmount);
                }
            }
        }, 100);
    });
    
    // 입력 필드 초기화
    document.getElementById('slot-bet').value = '';
}

// 슬롯 결과 확인
function checkSlotResults(results, betAmount) {
    setTimeout(() => {
        let winAmount = 0;
        let message = '';
        
        // 3개 모두 같은 경우
        if (results[0] === results[1] && results[1] === results[2]) {
            if (results[0] === '💎') {
                winAmount = betAmount * 10;
                message = '잭팟! 다이아몬드 3개!';
            } else if (results[0] === '7️⃣') {
                winAmount = betAmount * 8;
                message = '대박! 7 3개!';
            } else {
                winAmount = betAmount * 5;
                message = '축하합니다! 3개 일치!';
            }
        }
        // 2개 같은 경우
        else if (results[0] === results[1] || results[1] === results[2] || results[0] === results[2]) {
            winAmount = betAmount * 2;
            message = '2개 일치! 소액 당첨!';
        }
        // 꽝
        else {
            message = '아쉽습니다! 다시 도전해보세요!';
        }
        
        if (winAmount > 0) {
            updateBalance(winAmount);
            alert(`${message} $${winAmount}를 획득했습니다!`);
        } else {
            alert(message);
        }
    }, 1000);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadGame(); // 저장된 게임 로드
    showGameSelection();
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeHelp();
            closeStats();
            closeRanking();
        }
    });
});

// 포커 게임
function startPoker() {
    const betAmount = parseInt(document.getElementById('poker-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    createDeck();
    const playerHand = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
    const computerHand = [drawCard(), drawCard(), drawCard(), drawCard(), drawCard()];
    
    displayCards(playerHand, 'poker-player-cards');
    displayCards(computerHand, 'poker-computer-cards');
    
    const playerRank = getPokerHandRank(playerHand);
    const computerRank = getPokerHandRank(computerHand);
    
    let result = '';
    let winAmount = 0;
    
    if (playerRank.rank > computerRank.rank) {
        result = `승리! ${playerRank.name} vs ${computerRank.name}`;
        winAmount = betAmount * 2;
    } else if (playerRank.rank < computerRank.rank) {
        result = `패배! ${playerRank.name} vs ${computerRank.name}`;
    } else {
        result = `무승부! ${playerRank.name}`;
        winAmount = betAmount;
    }
    
    if (winAmount > 0) {
        updateBalance(winAmount);
    }
    
    document.getElementById('poker-result').textContent = result;
    document.getElementById('poker-bet').value = '';
}

function getPokerHandRank(hand) {
    const ranks = hand.map(card => card.rank);
    const suits = hand.map(card => card.suit);
    
    // 간단한 포커 핸드 랭킹 (페어, 투페어, 트리플 등)
    const rankCounts = {};
    ranks.forEach(rank => {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (counts[0] === 4) return { rank: 7, name: '포카드' };
    if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: '풀하우스' };
    if (counts[0] === 3) return { rank: 3, name: '트리플' };
    if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: '투페어' };
    if (counts[0] === 2) return { rank: 1, name: '원페어' };
    return { rank: 0, name: '하이카드' };
}

// 바카라 게임
function startBaccarat() {
    const betAmount = parseInt(document.getElementById('baccarat-bet').value);
    const choice = document.getElementById('baccarat-choice').value;
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    createDeck();
    const playerCards = [drawCard(), drawCard()];
    const bankerCards = [drawCard(), drawCard()];
    
    displayCards(playerCards, 'baccarat-player-cards');
    displayCards(bankerCards, 'baccarat-banker-cards');
    
    const playerScore = getBaccaratScore(playerCards);
    const bankerScore = getBaccaratScore(bankerCards);
    
    document.getElementById('baccarat-player-score').textContent = `점수: ${playerScore}`;
    document.getElementById('baccarat-banker-score').textContent = `점수: ${bankerScore}`;
    
    let result = '';
    let winAmount = 0;
    
    if (playerScore > bankerScore && choice === 'player') {
        result = '플레이어 승리!';
        winAmount = betAmount * 2;
    } else if (bankerScore > playerScore && choice === 'banker') {
        result = '뱅커 승리!';
        winAmount = betAmount * 1.95; // 뱅커는 수수료 5%
    } else if (playerScore === bankerScore && choice === 'tie') {
        result = '타이!';
        winAmount = betAmount * 8;
    } else {
        result = '패배!';
    }
    
    if (winAmount > 0) {
        updateBalance(Math.floor(winAmount));
    }
    
    alert(result);
    document.getElementById('baccarat-bet').value = '';
}

function getBaccaratScore(cards) {
    let score = 0;
    for (let card of cards) {
        let value = card.value;
        if (value > 10) value = 0;
        if (value === 11) value = 1; // 에이스
        score += value;
    }
    return score % 10;
}

// 주사위 게임
function rollDice() {
    const betAmount = parseInt(document.getElementById('dice-bet').value);
    const choice = document.getElementById('dice-choice').value;
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    const dice1Element = document.getElementById('dice1');
    const dice2Element = document.getElementById('dice2');
    
    dice1Element.classList.add('rolling');
    dice2Element.classList.add('rolling');
    
    setTimeout(() => {
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const sum = dice1 + dice2;
        
        dice1Element.textContent = `⚀⚁⚂⚃⚄⚅`[dice1 - 1];
        dice2Element.textContent = `⚀⚁⚂⚃⚄⚅`[dice2 - 1];
        dice1Element.classList.remove('rolling');
        dice2Element.classList.remove('rolling');
        
        document.getElementById('dice-sum').textContent = `합계: ${sum}`;
        
        let won = false;
        let winAmount = 0;
        
        if (choice === 'big' && sum >= 8 && sum <= 12) {
            won = true;
            winAmount = betAmount * 2;
        } else if (choice === 'small' && sum >= 2 && sum <= 6) {
            won = true;
            winAmount = betAmount * 2;
        } else if (choice === 'seven' && sum === 7) {
            won = true;
            winAmount = betAmount * 5;
        }
        
        if (won) {
            updateBalance(winAmount);
            alert(`축하합니다! 합계 ${sum}. $${winAmount}를 획득했습니다!`);
        } else {
            alert(`아쉽습니다! 합계 ${sum}.`);
        }
        
        document.getElementById('dice-bet').value = '';
    }, 1000);
}

// 동전던지기 게임
function flipCoin() {
    const betAmount = parseInt(document.getElementById('coin-bet').value);
    const choice = document.getElementById('coin-choice').value;
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    const coinElement = document.getElementById('coin');
    coinElement.classList.add('flipping');
    
    setTimeout(() => {
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        coinElement.textContent = result === 'heads' ? '👑' : '🪙';
        coinElement.classList.remove('flipping');
        
        if (result === choice) {
            const winAmount = betAmount * 2;
            updateBalance(winAmount);
            alert(`축하합니다! ${result === 'heads' ? '앞면' : '뒷면'}이 나왔습니다! $${winAmount}를 획득했습니다!`);
        } else {
            alert(`아쉽습니다! ${result === 'heads' ? '앞면' : '뒷면'}이 나왔습니다.`);
        }
        
        document.getElementById('coin-bet').value = '';
    }, 1000);
}

// 가위바위보 게임
function playRPS(playerChoice) {
    const betAmount = parseInt(document.getElementById('rps-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    const computerChoice = choices[Math.floor(Math.random() * 3)];
    
    document.getElementById('player-rps').textContent = emojis[playerChoice];
    document.getElementById('computer-rps').textContent = emojis[computerChoice];
    
    let result = '';
    let winAmount = 0;
    
    if (playerChoice === computerChoice) {
        result = '무승부!';
        winAmount = betAmount;
    } else if (
        (playerChoice === 'rock' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'rock') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
        result = '승리!';
        winAmount = betAmount * 2;
    } else {
        result = '패배!';
    }
    
    if (winAmount > 0) {
        updateBalance(winAmount);
        alert(`${result} $${winAmount}를 획득했습니다!`);
    } else {
        alert(result);
    }
    
    document.getElementById('rps-bet').value = '';
}

// 달팽이 레이싱 게임
let raceInProgress = false;

function startRace() {
    if (raceInProgress) return;
    
    const betAmount = parseInt(document.getElementById('racing-bet').value);
    const chosenSnail = parseInt(document.getElementById('snail-choice').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    raceInProgress = true;
    
    // 달팽이들 초기 위치로 리셋
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`snail${i}`).style.left = '60px';
    }
    
    const raceInterval = setInterval(() => {
        let winner = null;
        
        for (let i = 1; i <= 4; i++) {
            const snail = document.getElementById(`snail${i}`);
            const currentLeft = parseInt(snail.style.left) || 60;
            const speed = Math.random() * 5 + 1; // 1-6px 랜덤 속도
            const newLeft = currentLeft + speed;
            
            snail.style.left = newLeft + 'px';
            
            // 결승선 체크 (대략 400px)
            if (newLeft >= 400 && !winner) {
                winner = i;
            }
        }
        
        if (winner) {
            clearInterval(raceInterval);
            raceInProgress = false;
            
            if (winner === chosenSnail) {
                const winAmount = betAmount * 4;
                updateBalance(winAmount);
                alert(`축하합니다! ${winner}번 달팽이가 승리했습니다! $${winAmount}를 획득했습니다!`);
            } else {
                alert(`아쉽습니다! ${winner}번 달팽이가 승리했습니다.`);
            }
            
            document.getElementById('racing-bet').value = '';
        }
    }, 100);
}

// 행운의 바퀴 게임
function spinWheel() {
    const betAmount = parseInt(document.getElementById('wheel-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    const wheel = document.getElementById('fortune-wheel');
    const prizes = [1000, 500, 100, 50, 10, 0];
    const randomRotation = Math.random() * 360 + 1800;
    
    wheel.style.transform = `rotate(${randomRotation}deg)`;
    
    setTimeout(() => {
        const prizeIndex = Math.floor(Math.random() * prizes.length);
        const prize = prizes[prizeIndex];
        
        if (prize > 0) {
            updateBalance(prize);
            alert(`축하합니다! $${prize}를 획득했습니다!`);
        } else {
            alert('아쉽습니다! 다음 기회에!');
        }
        
        document.getElementById('wheel-bet').value = '';
    }, 3000);
}

// 복권 게임
let selectedNumbers = [];

function initializeLottery() {
    const numbersContainer = document.getElementById('lottery-numbers');
    numbersContainer.innerHTML = '';
    selectedNumbers = [];
    
    for (let i = 1; i <= 20; i++) {
        const numberElement = document.createElement('div');
        numberElement.className = 'lottery-number';
        numberElement.textContent = i;
        numberElement.onclick = () => selectLotteryNumber(i, numberElement);
        numbersContainer.appendChild(numberElement);
    }
    
    updateSelectedNumbers();
}

function selectLotteryNumber(number, element) {
    if (selectedNumbers.includes(number)) {
        selectedNumbers = selectedNumbers.filter(n => n !== number);
        element.classList.remove('selected');
    } else if (selectedNumbers.length < 5) {
        selectedNumbers.push(number);
        element.classList.add('selected');
    } else {
        alert('최대 5개까지만 선택할 수 있습니다!');
    }
    
    updateSelectedNumbers();
}

function updateSelectedNumbers() {
    document.getElementById('selected-numbers').textContent = 
        selectedNumbers.length > 0 ? selectedNumbers.sort((a, b) => a - b).join(', ') : '번호를 선택하세요';
}

function clearLotterySelection() {
    selectedNumbers = [];
    document.querySelectorAll('.lottery-number').forEach(el => {
        el.classList.remove('selected');
    });
    updateSelectedNumbers();
}

function buyLottery() {
    const betAmount = parseInt(document.getElementById('lottery-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    if (selectedNumbers.length !== 5) {
        alert('정확히 5개의 번호를 선택해주세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    // 당첨 번호 생성
    const winningNumbers = [];
    while (winningNumbers.length < 5) {
        const num = Math.floor(Math.random() * 20) + 1;
        if (!winningNumbers.includes(num)) {
            winningNumbers.push(num);
        }
    }
    
    winningNumbers.sort((a, b) => a - b);
    const matches = selectedNumbers.filter(num => winningNumbers.includes(num)).length;
    
    let winAmount = 0;
    let message = `당첨 번호: ${winningNumbers.join(', ')}\n`;
    
    switch (matches) {
        case 5:
            winAmount = betAmount * 1000;
            message += '잭팟! 5개 일치!';
            break;
        case 4:
            winAmount = betAmount * 100;
            message += '4개 일치!';
            break;
        case 3:
            winAmount = betAmount * 10;
            message += '3개 일치!';
            break;
        case 2:
            winAmount = betAmount * 2;
            message += '2개 일치!';
            break;
        default:
            message += '아쉽습니다!';
    }
    
    if (winAmount > 0) {
        updateBalance(winAmount);
        message += ` $${winAmount}를 획득했습니다!`;
    }
    
    alert(message);
    document.getElementById('lottery-bet').value = '';
    clearLotterySelection();
}

// 크래시 게임
let crashGame = {
    inProgress: false,
    multiplier: 1.00,
    crashPoint: 0,
    betAmount: 0
};

function startCrash() {
    const betAmount = parseInt(document.getElementById('crash-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    if (crashGame.inProgress) return;
    
    updateBalance(-betAmount);
    crashGame.betAmount = betAmount;
    crashGame.inProgress = true;
    crashGame.multiplier = 1.00;
    crashGame.crashPoint = Math.random() * 10 + 1; // 1-11 사이에서 크래시
    
    document.getElementById('crash-start-btn').disabled = true;
    document.getElementById('crash-cashout-btn').disabled = false;
    document.getElementById('crash-result').textContent = '';
    document.getElementById('rocket').classList.add('flying');
    
    const crashInterval = setInterval(() => {
        crashGame.multiplier += 0.01;
        document.getElementById('multiplier').textContent = crashGame.multiplier.toFixed(2) + 'x';
        
        if (crashGame.multiplier >= crashGame.crashPoint) {
            clearInterval(crashInterval);
            crashGame.inProgress = false;
            document.getElementById('crash-start-btn').disabled = false;
            document.getElementById('crash-cashout-btn').disabled = true;
            document.getElementById('rocket').classList.remove('flying');
            document.getElementById('crash-result').textContent = '💥 크래시! 게임 종료!';
            document.getElementById('crash-bet').value = '';
        }
    }, 100);
    
    // 전역 변수에 저장하여 캐시아웃 시 정리 가능
    window.crashInterval = crashInterval;
}

function cashOut() {
    if (!crashGame.inProgress) return;
    
    crashGame.inProgress = false;
    const winAmount = Math.floor(crashGame.betAmount * crashGame.multiplier);
    
    updateBalance(winAmount);
    
    // 타이머 정리
    clearInterval(window.crashInterval);
    
    document.getElementById('crash-start-btn').disabled = false;
    document.getElementById('crash-cashout-btn').disabled = true;
    document.getElementById('rocket').classList.remove('flying');
    document.getElementById('crash-result').textContent = 
        `캐시아웃! ${crashGame.multiplier.toFixed(2)}x로 $${winAmount}를 획득했습니다!`;
    document.getElementById('crash-bet').value = '';
}
// 저장 알림 표시
function showSaveNotification() {
    // 기존 알림이 있으면 제거
    const existingNotification = document.querySelector('.save-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.textContent = '💾 게임이 저장되었습니다';
    document.body.appendChild(notification);
    
    // 3초 후 알림 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 주기적 자동 저장 (5분마다)
setInterval(() => {
    saveGame();
    showSaveNotification();
}, 300000); // 5분 = 300,000ms

// 페이지 종료 전 저장
window.addEventListener('beforeunload', function() {
    saveGame();
});
// 스포츠 토토 게임
let sportsMatches = [];
let selectedMatch = null;
let selectedOutcome = null;

function initializeSports() {
    generateMatches();
    displayMatches();
}

function generateMatches() {
    const teams = [
        '레알 마드리드', '바르셀로나', '맨체스터 유나이티드', '리버풀', '바이에른 뮌헨',
        '파리 생제르맹', '첼시', '맨체스터 시티', '유벤투스', '인터 밀란',
        '아틀레티코 마드리드', '토트넘', '아스널', '도르트문트', '라이프치히'
    ];
    
    const sports = ['⚽ 축구', '🏀 농구', '🎾 테니스', '🏐 배구'];
    
    sportsMatches = [];
    
    for (let i = 0; i < 6; i++) {
        const team1 = teams[Math.floor(Math.random() * teams.length)];
        let team2 = teams[Math.floor(Math.random() * teams.length)];
        while (team2 === team1) {
            team2 = teams[Math.floor(Math.random() * teams.length)];
        }
        
        const sport = sports[Math.floor(Math.random() * sports.length)];
        const startTime = new Date(Date.now() + Math.random() * 7200000); // 0-2시간 후
        
        // 배당률 생성 (합이 100%가 되도록 조정)
        const base1 = 1.5 + Math.random() * 2; // 1.5 - 3.5
        const base2 = 1.5 + Math.random() * 2;
        const base3 = 3 + Math.random() * 5; // 3 - 8 (무승부는 높게)
        
        sportsMatches.push({
            id: i,
            sport: sport,
            team1: team1,
            team2: team2,
            startTime: startTime,
            odds: {
                team1: base1.toFixed(2),
                draw: base3.toFixed(2),
                team2: base2.toFixed(2)
            }
        });
    }
}

function displayMatches() {
    const container = document.getElementById('sports-matches');
    container.innerHTML = '';
    
    sportsMatches.forEach(match => {
        const matchElement = document.createElement('div');
        matchElement.className = 'match-card';
        matchElement.innerHTML = `
            <div class="match-header">
                <div class="match-teams">${match.sport} ${match.team1} vs ${match.team2}</div>
                <div class="match-time">${match.startTime.toLocaleTimeString()}</div>
            </div>
            <div class="match-odds">
                <div class="odd-button" onclick="selectOutcome(${match.id}, 'team1', ${match.odds.team1})">
                    ${match.team1} 승<br>${match.odds.team1}배
                </div>
                <div class="odd-button" onclick="selectOutcome(${match.id}, 'draw', ${match.odds.draw})">
                    무승부<br>${match.odds.draw}배
                </div>
                <div class="odd-button" onclick="selectOutcome(${match.id}, 'team2', ${match.odds.team2})">
                    ${match.team2} 승<br>${match.odds.team2}배
                </div>
            </div>
        `;
        container.appendChild(matchElement);
    });
}

function selectOutcome(matchId, outcome, odds) {
    // 이전 선택 해제
    document.querySelectorAll('.odd-button').forEach(btn => btn.classList.remove('selected'));
    
    // 새 선택 표시
    event.target.classList.add('selected');
    
    selectedMatch = matchId;
    selectedOutcome = { type: outcome, odds: parseFloat(odds) };
}

function refreshMatches() {
    generateMatches();
    displayMatches();
    selectedMatch = null;
    selectedOutcome = null;
    alert('새로운 경기가 생성되었습니다!');
}

// 스포츠 베팅 실행 (간단한 시뮬레이션)
function placeSportsBet() {
    const betAmount = parseInt(document.getElementById('sports-bet').value);
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    if (!selectedMatch || !selectedOutcome) {
        alert('경기와 결과를 선택해주세요!');
        return;
    }
    
    updateBalance(-betAmount);
    
    // 랜덤 결과 생성 (33% 확률로 각각)
    const results = ['team1', 'draw', 'team2'];
    const actualResult = results[Math.floor(Math.random() * 3)];
    
    const match = sportsMatches[selectedMatch];
    let resultText = '';
    
    if (actualResult === 'team1') {
        resultText = `${match.team1} 승리!`;
    } else if (actualResult === 'draw') {
        resultText = '무승부!';
    } else {
        resultText = `${match.team2} 승리!`;
    }
    
    if (selectedOutcome.type === actualResult) {
        const winAmount = Math.floor(betAmount * selectedOutcome.odds);
        updateBalance(winAmount);
        updateGameStats('sports', betAmount, winAmount);
        alert(`축하합니다! ${resultText} $${winAmount}를 획득했습니다!`);
    } else {
        updateGameStats('sports', betAmount, 0);
        alert(`아쉽습니다! ${resultText}`);
    }
    
    // 선택 초기화
    document.querySelectorAll('.odd-button').forEach(btn => btn.classList.remove('selected'));
    selectedMatch = null;
    selectedOutcome = null;
    document.getElementById('sports-bet').value = '';
}

// 스포츠 베팅을 위한 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', function() {
    // 기존 코드...
    
    // 스포츠 베팅 버튼에 이벤트 추가
    const sportsBetInput = document.getElementById('sports-bet');
    if (sportsBetInput) {
        sportsBetInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                placeSportsBet();
            }
        });
    }
});

// PvP 게임들 (시뮬레이션 - 실제로는 WebSocket이나 Firebase 필요)
let pvpGameState = {
    isMatching: false,
    gameId: null,
    opponent: null,
    myNickname: 'Player'
};

// PvP 블랙잭
function joinPvPBlackjack() {
    const nickname = document.getElementById('nickname-input').value.trim();
    const betAmount = parseInt(document.getElementById('pvp-blackjack-bet').value);
    
    if (!nickname) {
        alert('닉네임을 입력해주세요!');
        return;
    }
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    pvpGameState.myNickname = nickname;
    document.getElementById('my-nickname').textContent = nickname;
    document.getElementById('my-balance-pvp').textContent = balance;
    
    // 매칭 시뮬레이션
    document.getElementById('opponent-status').textContent = '매칭 중...';
    
    setTimeout(() => {
        // 가상의 상대방 생성
        const opponents = ['김철수', '이영희', '박민수', '최지영', '정다은'];
        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
        
        pvpGameState.opponent = opponent;
        document.getElementById('opponent-status').textContent = `${opponent} (잔액: $${Math.floor(Math.random() * 2000 + 500)})`;
        
        // 게임 시작
        startPvPBlackjack(betAmount);
    }, 2000);
}

function startPvPBlackjack(betAmount) {
    updateBalance(-betAmount);
    
    // 간단한 PvP 블랙잭 시뮬레이션
    createDeck();
    const myCards = [drawCard(), drawCard()];
    const opponentCards = [drawCard(), drawCard()];
    
    displayCards(myCards, 'pvp-my-cards');
    displayCards([opponentCards[0]], 'pvp-opponent-cards'); // 상대방 첫 카드만 표시
    
    document.getElementById('pvp-my-score').textContent = `점수: ${calculateScore(myCards)}`;
    document.getElementById('pvp-opponent-score').textContent = '점수: ?';
    
    document.getElementById('pvp-hit-btn').disabled = false;
    document.getElementById('pvp-stand-btn').disabled = false;
    
    addToGameLog('pvp-blackjack-log', `게임 시작! 베팅 금액: $${betAmount}`);
    addToGameLog('pvp-blackjack-log', `상대방: ${pvpGameState.opponent}`);
}

function pvpHit() {
    // 간단한 히트 구현
    addToGameLog('pvp-blackjack-log', '히트를 선택했습니다.');
    // 실제 구현에서는 서버와 통신
}

function pvpStand() {
    // 간단한 스탠드 구현
    addToGameLog('pvp-blackjack-log', '스탠드를 선택했습니다.');
    // 실제 구현에서는 서버와 통신
}

// PvP 포커
function joinPvPPoker() {
    const nickname = document.getElementById('poker-nickname-input').value.trim();
    const betAmount = parseInt(document.getElementById('pvp-poker-bet').value);
    
    if (!nickname) {
        alert('닉네임을 입력해주세요!');
        return;
    }
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    document.getElementById('poker-my-nickname').textContent = nickname;
    document.getElementById('poker-my-balance').textContent = balance;
    
    addToGameLog('pvp-poker-log', `매칭을 시작합니다... 베팅: $${betAmount}`);
    
    // 매칭 시뮬레이션
    setTimeout(() => {
        const opponents = ['포커왕', '카드마스터', '베팅킹', '올인러버'];
        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
        
        document.getElementById('poker-opponent-status').textContent = `${opponent}`;
        addToGameLog('pvp-poker-log', `상대방을 찾았습니다: ${opponent}`);
        
        // 간단한 포커 게임 시뮬레이션
        updateBalance(-betAmount);
        const result = Math.random() > 0.5;
        
        setTimeout(() => {
            if (result) {
                const winAmount = betAmount * 2;
                updateBalance(winAmount);
                addToGameLog('pvp-poker-log', `승리! $${winAmount} 획득!`);
            } else {
                addToGameLog('pvp-poker-log', '패배...');
            }
        }, 3000);
    }, 2000);
}

// PvP 가위바위보
function joinPvPRPS() {
    const nickname = document.getElementById('rps-nickname-input').value.trim();
    const betAmount = parseInt(document.getElementById('pvp-rps-bet').value);
    
    if (!nickname) {
        alert('닉네임을 입력해주세요!');
        return;
    }
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    document.getElementById('rps-my-nickname').textContent = nickname;
    document.getElementById('rps-my-balance').textContent = balance;
    
    addToGameLog('pvp-rps-log', `매칭을 시작합니다... 베팅: $${betAmount}`);
    
    // 매칭 시뮬레이션
    setTimeout(() => {
        const opponents = ['가위킹', '바위마스터', '보의달인', '랜덤러버'];
        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
        
        document.getElementById('rps-opponent-status').textContent = `${opponent}`;
        document.getElementById('pvp-rps-buttons').style.display = 'flex';
        addToGameLog('pvp-rps-log', `상대방을 찾았습니다: ${opponent}`);
        addToGameLog('pvp-rps-log', '가위, 바위, 보 중 하나를 선택하세요!');
        
        pvpGameState.currentBet = betAmount;
        pvpGameState.opponent = opponent;
    }, 2000);
}

function pvpPlayRPS(choice) {
    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    const opponentChoice = choices[Math.floor(Math.random() * 3)];
    
    document.getElementById('pvp-my-rps').textContent = emojis[choice];
    document.getElementById('pvp-opponent-rps').textContent = emojis[opponentChoice];
    
    updateBalance(-pvpGameState.currentBet);
    
    let result = '';
    let winAmount = 0;
    
    if (choice === opponentChoice) {
        result = '무승부!';
        winAmount = pvpGameState.currentBet;
    } else if (
        (choice === 'rock' && opponentChoice === 'scissors') ||
        (choice === 'paper' && opponentChoice === 'rock') ||
        (choice === 'scissors' && opponentChoice === 'paper')
    ) {
        result = '승리!';
        winAmount = pvpGameState.currentBet * 2;
    } else {
        result = '패배!';
    }
    
    if (winAmount > 0) {
        updateBalance(winAmount);
        addToGameLog('pvp-rps-log', `${result} $${winAmount} 획득!`);
    } else {
        addToGameLog('pvp-rps-log', result);
    }
    
    document.getElementById('pvp-rps-buttons').style.display = 'none';
    document.getElementById('pvp-rps-bet').value = '';
}

// 게임 로그 추가 함수
function addToGameLog(logId, message) {
    const log = document.getElementById(logId);
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// 랭킹 시스템
function generateMockRankingData() {
    const nicknames = [
        '카지노킹', '럭키세븐', '잭팟헌터', '골든터치', '다이아몬드', 
        '로얄플러시', '빅윈너', '포춘마스터', '슬롯킹', '베팅마스터',
        '카드샤크', '룰렛킹', '블랙잭프로', '포커페이스', '슈퍼럭키'
    ];
    
    mockRankingData = [];
    
    for (let i = 0; i < 15; i++) {
        mockRankingData.push({
            nickname: nicknames[i],
            balance: Math.floor(Math.random() * 50000 + 1000),
            wins: Math.floor(Math.random() * 500 + 10),
            totalGames: Math.floor(Math.random() * 1000 + 50),
            winRate: 0
        });
    }
    
    // 승률 계산
    mockRankingData.forEach(player => {
        player.winRate = Math.round((player.wins / player.totalGames) * 100);
    });
}

function updateRanking() {
    generateMockRankingData();
    
    let sortedData = [...mockRankingData];
    
    // 탭에 따라 정렬
    switch (currentRankingTab) {
        case 'balance':
            sortedData.sort((a, b) => b.balance - a.balance);
            break;
        case 'wins':
            sortedData.sort((a, b) => b.wins - a.wins);
            break;
        case 'games':
            sortedData.sort((a, b) => b.totalGames - a.totalGames);
            break;
    }
    
    displayRanking(sortedData);
    updateMyRank(sortedData);
}

function displayRanking(data) {
    const container = document.getElementById('ranking-list');
    container.innerHTML = '';
    
    data.forEach((player, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = `rank-item ${player.isReal ? 'real-player' : ''}`;
        
        let positionClass = '';
        if (index === 0) positionClass = 'first';
        else if (index === 1) positionClass = 'second';
        else if (index === 2) positionClass = 'third';
        
        let valueText = '';
        switch (currentRankingTab) {
            case 'balance':
                valueText = `$${player.balance.toLocaleString()}`;
                break;
            case 'wins':
                valueText = `${player.wins}승`;
                break;
            case 'games':
                valueText = `${player.totalGames}게임`;
                break;
        }
        
        const playerName = player.isReal ? 
            `${player.nickname} 🌐` : 
            player.nickname;
        
        rankItem.innerHTML = `
            <div class="rank-position ${positionClass}">${index + 1}</div>
            <div class="rank-info">
                <div class="rank-nickname">${playerName}</div>
                <div class="rank-details">승률: ${player.winRate}% | 총 게임: ${player.totalGames}</div>
            </div>
            <div class="rank-value">${valueText}</div>
        `;
        
        container.appendChild(rankItem);
    });
}

function updateMyRank(data) {
    // 내 정보를 랭킹에서 찾기 (시뮬레이션)
    const myData = {
        nickname: pvpGameState.myNickname || 'Player',
        balance: balance,
        wins: gameStats.wins,
        totalGames: gameStats.totalGames,
        winRate: gameStats.totalGames > 0 ? Math.round((gameStats.wins / gameStats.totalGames) * 100) : 0
    };
    
    // 내 순위 계산
    let myRank = data.length + 1;
    for (let i = 0; i < data.length; i++) {
        let isHigher = false;
        switch (currentRankingTab) {
            case 'balance':
                isHigher = myData.balance > data[i].balance;
                break;
            case 'wins':
                isHigher = myData.wins > data[i].wins;
                break;
            case 'games':
                isHigher = myData.totalGames > data[i].totalGames;
                break;
        }
        
        if (isHigher) {
            myRank = i + 1;
            break;
        }
    }
    
    let valueText = '';
    switch (currentRankingTab) {
        case 'balance':
            valueText = `$${myData.balance.toLocaleString()}`;
            break;
        case 'wins':
            valueText = `${myData.wins}승`;
            break;
        case 'games':
            valueText = `${myData.totalGames}게임`;
            break;
    }
    
    document.getElementById('my-rank-display').innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">
            <strong>${myRank}위</strong> - ${myData.nickname}
        </div>
        <div>
            ${valueText} | 승률: ${myData.winRate}% | 총 게임: ${myData.totalGames}
        </div>
    `;
}

function submitToRanking() {
    // 실제로는 서버에 데이터 전송
    alert('랭킹에 등록되었습니다! (시뮬레이션)');
    updateRanking();
}
// 랭킹 예측 베팅 시스템
function initializePredictionBetting() {
    updatePlayerOptions();
    updatePredictionDisplay();
    startPredictionTimer();
}

function updatePlayerOptions() {
    const playerSelect = document.getElementById('prediction-player');
    playerSelect.innerHTML = '<option value="">플레이어 선택</option>';
    
    // 현재 상위 10명의 플레이어를 옵션으로 추가
    const topPlayers = [...mockRankingData]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
    
    topPlayers.forEach(player => {
        const option = document.createElement('option');
        option.value = player.nickname;
        option.textContent = `${player.nickname} (현재 잔액: $${player.balance.toLocaleString()})`;
        playerSelect.appendChild(option);
    });
}

function placePredictionBet() {
    const playerName = document.getElementById('prediction-player').value;
    const predictedRank = parseInt(document.getElementById('prediction-rank').value);
    const betAmount = parseInt(document.getElementById('prediction-bet').value);
    
    if (!playerName) {
        alert('플레이어를 선택해주세요!');
        return;
    }
    
    if (!predictedRank) {
        alert('예상 순위를 선택해주세요!');
        return;
    }
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    // 같은 플레이어에 대한 기존 베팅 확인
    const existingBet = predictionBets.find(bet => bet.playerName === playerName && bet.status === 'active');
    if (existingBet) {
        alert('이미 해당 플레이어에 대한 예측 베팅이 있습니다!');
        return;
    }
    
    // 베팅 금액 차감
    updateBalance(-betAmount);
    
    // 예측 베팅 추가
    const predictionBet = {
        id: Date.now(),
        playerName: playerName,
        predictedRank: predictedRank,
        betAmount: betAmount,
        timestamp: new Date(),
        status: 'active',
        expiresAt: new Date(Date.now() + predictionTimer * 1000)
    };
    
    predictionBets.push(predictionBet);
    updatePredictionDisplay();
    
    // 입력 필드 초기화
    document.getElementById('prediction-player').value = '';
    document.getElementById('prediction-rank').value = '';
    document.getElementById('prediction-bet').value = '';
    
    alert(`예측 베팅이 완료되었습니다!\n플레이어: ${playerName}\n예상 순위: ${predictedRank}위\n베팅 금액: $${betAmount}\n\n정확히 맞추면 $${betAmount * 100}를 획득합니다!`);
}

function updatePredictionDisplay() {
    const container = document.getElementById('my-predictions');
    
    const activeBets = predictionBets.filter(bet => bet.status === 'active');
    
    if (activeBets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7);">예측 베팅이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    activeBets.forEach(bet => {
        const betElement = document.createElement('div');
        betElement.className = 'prediction-item';
        
        const timeLeft = Math.max(0, Math.floor((bet.expiresAt - new Date()) / 1000));
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        betElement.innerHTML = `
            <div class="prediction-details">
                <strong>${bet.playerName}</strong>이(가) <strong>${bet.predictedRank}위</strong>가 될 것으로 예측<br>
                <small>남은 시간: ${minutes}:${seconds.toString().padStart(2, '0')}</small>
            </div>
            <div class="prediction-amount">
                베팅: $${bet.betAmount}<br>
                <small>당첨시: $${bet.betAmount * 100}</small>
            </div>
        `;
        
        container.appendChild(betElement);
    });
}

function startPredictionTimer() {
    // 기존 타이머 정리
    if (predictionInterval) {
        clearInterval(predictionInterval);
    }
    
    // 다음 업데이트 시간 설정 (현재 시간 + 10분)
    if (!nextRankingUpdate) {
        nextRankingUpdate = new Date(Date.now() + predictionTimer * 1000);
    }
    
    predictionInterval = setInterval(() => {
        const now = new Date();
        const timeLeft = Math.max(0, Math.floor((nextRankingUpdate - now) / 1000));
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        document.getElementById('prediction-countdown').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 예측 베팅 표시 업데이트
        updatePredictionDisplay();
        
        // 시간이 다 되면 결과 처리
        if (timeLeft <= 0) {
            processPredictionResults();
            // 다음 라운드 시작
            nextRankingUpdate = new Date(Date.now() + predictionTimer * 1000);
        }
    }, 1000);
}

function processPredictionResults() {
    const activeBets = predictionBets.filter(bet => bet.status === 'active');
    
    if (activeBets.length === 0) return;
    
    // 현재 랭킹 생성 (잔액 기준)
    const currentRanking = [...mockRankingData]
        .sort((a, b) => b.balance - a.balance);
    
    let totalWinnings = 0;
    let correctPredictions = 0;
    
    activeBets.forEach(bet => {
        // 예측한 플레이어의 현재 순위 찾기
        const playerIndex = currentRanking.findIndex(player => player.nickname === bet.playerName);
        const actualRank = playerIndex + 1;
        
        bet.status = 'completed';
        bet.actualRank = actualRank;
        
        // 예측이 정확한지 확인
        if (actualRank === bet.predictedRank) {
            const winAmount = bet.betAmount * 100;
            updateBalance(winAmount);
            totalWinnings += winAmount;
            correctPredictions++;
            bet.result = 'win';
            bet.winAmount = winAmount;
        } else {
            bet.result = 'lose';
        }
    });
    
    // 결과 알림
    if (correctPredictions > 0) {
        alert(`🎉 축하합니다!\n\n${correctPredictions}개의 예측이 정확했습니다!\n총 획득 금액: $${totalWinnings.toLocaleString()}\n\n새로운 예측 라운드가 시작됩니다!`);
    } else if (activeBets.length > 0) {
        alert(`😔 아쉽습니다!\n\n모든 예측이 빗나갔습니다.\n새로운 예측 라운드가 시작됩니다!`);
    }
    
    // 랭킹 데이터 새로고침 (변화 시뮬레이션)
    simulateRankingChanges();
    updatePlayerOptions();
    updatePredictionDisplay();
}

function simulateRankingChanges() {
    // 랭킹에 약간의 변화를 주어 예측을 더 흥미롭게 만듦
    mockRankingData.forEach(player => {
        // 5% 확률로 잔액 변화
        if (Math.random() < 0.05) {
            const change = Math.floor((Math.random() - 0.5) * player.balance * 0.1); // ±10% 변화
            player.balance = Math.max(100, player.balance + change);
        }
        
        // 게임 수와 승수도 약간 증가
        if (Math.random() < 0.1) {
            player.totalGames += Math.floor(Math.random() * 3) + 1;
            if (Math.random() < 0.4) {
                player.wins += 1;
            }
            player.winRate = player.totalGames > 0 ? Math.round((player.wins / player.totalGames) * 100) : 0;
        }
    });
}

// 페이지 로드 시 예측 타이머 시작
document.addEventListener('DOMContentLoaded', function() {
    // 기존 초기화 코드...
    
    // 예측 베팅 시스템 초기화
    if (!nextRankingUpdate) {
        nextRankingUpdate = new Date(Date.now() + predictionTimer * 1000);
    }
    
    // 온라인 상태 초기화
    updateOnlineStatus();
});
// 인증 시스템
let nicknameChecked = false;

// 인증 상태 확인
async function checkAuthState() {
    if (!supabase) return;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        updateUIForLoggedOutUser();
    }
}

// 사용자 프로필 로드
async function loadUserProfile() {
    if (!supabase || !currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', currentUser.id)
            .single();
            
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }
        
        if (data) {
            // 서버에서 데이터 로드
            balance = data.balance;
            gameStats.wins = data.wins;
            gameStats.totalGames = data.total_games;
            gameStats.totalBet = data.total_bet;
            gameStats.totalWon = data.total_won;
            gameStats.maxBalance = data.max_balance;
            
            updateBalanceDisplay();
            document.getElementById('user-nickname').textContent = data.nickname;
        }
    } catch (error) {
        console.error('사용자 프로필 로드 실패:', error);
    }
}

// 로그인 상태 UI 업데이트
function updateUIForLoggedInUser() {
    document.getElementById('login-btn').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    isOnline = true;
    updateOnlineStatus();
}

// 로그아웃 상태 UI 업데이트
function updateUIForLoggedOutUser() {
    document.getElementById('login-btn').style.display = 'block';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('user-nickname').textContent = 'Guest';
    isOnline = false;
    updateOnlineStatus();
}

// 로그인 모달 표시
function showLogin() {
    document.getElementById('login-modal').style.display = 'block';
}

// 로그인 모달 닫기
function closeLogin() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('login-form').reset();
}

// 회원가입 모달 표시
function showSignup() {
    document.getElementById('signup-modal').style.display = 'block';
}

// 회원가입 모달 닫기
function closeSignup() {
    document.getElementById('signup-modal').style.display = 'none';
    document.getElementById('signup-form').reset();
    resetSignupValidation();
}

// 로그인 <-> 회원가입 전환
function switchToSignup() {
    closeLogin();
    showSignup();
}

function switchToLogin() {
    closeSignup();
    showLogin();
}

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    if (!supabase) {
        alert('온라인 기능을 사용할 수 없습니다.');
        return;
    }
    
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading-btn');
    submitBtn.disabled = true;
    
    try {
        // 전화번호를 이메일 형식으로 변환 (Supabase는 이메일 기반 인증)
        const email = `${phone.replace(/[^0-9]/g, '')}@casino.local`;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                alert('전화번호 또는 비밀번호가 올바르지 않습니다.');
            } else {
                alert('로그인 실패: ' + error.message);
            }
            return;
        }
        
        currentUser = data.user;
        await loadUserProfile();
        updateUIForLoggedInUser();
        closeLogin();
        alert('로그인되었습니다!');
        
    } catch (error) {
        console.error('로그인 오류:', error);
        alert('로그인 중 오류가 발생했습니다.');
    } finally {
        submitBtn.classList.remove('loading-btn');
        submitBtn.disabled = false;
    }
}

// 회원가입 처리
async function handleSignup(event) {
    event.preventDefault();
    
    if (!supabase) {
        alert('온라인 기능을 사용할 수 없습니다.');
        return;
    }
    
    if (!nicknameChecked) {
        alert('닉네임 중복확인을 해주세요.');
        return;
    }
    
    const phone = document.getElementById('signup-phone').value;
    const nickname = document.getElementById('signup-nickname').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    
    if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading-btn');
    submitBtn.disabled = true;
    
    try {
        // 전화번호를 이메일 형식으로 변환
        const email = `${phone.replace(/[^0-9]/g, '')}@casino.local`;
        
        // Supabase 회원가입
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    phone: phone,
                    nickname: nickname
                }
            }
        });
        
        if (error) {
            if (error.message.includes('already registered')) {
                alert('이미 등록된 전화번호입니다.');
            } else {
                alert('회원가입 실패: ' + error.message);
            }
            return;
        }
        
        // 플레이어 테이블에 데이터 추가
        const { error: profileError } = await supabase
            .from('players')
            .insert({
                id: data.user.id,
                nickname: nickname,
                balance: 1000,
                wins: 0,
                total_games: 0,
                total_bet: 0,
                total_won: 0,
                max_balance: 1000
            });
            
        if (profileError) {
            console.error('프로필 생성 실패:', profileError);
        }
        
        currentUser = data.user;
        balance = 1000;
        updateBalanceDisplay();
        updateUIForLoggedInUser();
        closeSignup();
        alert('회원가입이 완료되었습니다!');
        
    } catch (error) {
        console.error('회원가입 오류:', error);
        alert('회원가입 중 오류가 발생했습니다.');
    } finally {
        submitBtn.classList.remove('loading-btn');
        submitBtn.disabled = false;
    }
}

// 닉네임 중복 확인
async function checkNickname() {
    if (!supabase) {
        alert('온라인 기능을 사용할 수 없습니다.');
        return;
    }
    
    const nickname = document.getElementById('signup-nickname').value.trim();
    
    if (!nickname || nickname.length < 2) {
        alert('닉네임을 2자 이상 입력해주세요.');
        return;
    }
    
    const checkBtn = document.querySelector('.check-btn');
    checkBtn.classList.add('loading-btn');
    checkBtn.disabled = true;
    
    try {
        const { data, error } = await supabase
            .from('players')
            .select('nickname')
            .eq('nickname', nickname)
            .single();
            
        const statusElement = document.getElementById('nickname-status');
        
        if (error && error.code === 'PGRST116') {
            // 닉네임 사용 가능
            statusElement.textContent = '✓ 사용 가능한 닉네임입니다.';
            statusElement.className = 'input-status success';
            nicknameChecked = true;
            updateSignupButton();
        } else if (data) {
            // 닉네임 중복
            statusElement.textContent = '✗ 이미 사용중인 닉네임입니다.';
            statusElement.className = 'input-status error';
            nicknameChecked = false;
            updateSignupButton();
        } else if (error) {
            throw error;
        }
        
    } catch (error) {
        console.error('닉네임 확인 오류:', error);
        alert('닉네임 확인 중 오류가 발생했습니다.');
        nicknameChecked = false;
        updateSignupButton();
    } finally {
        checkBtn.classList.remove('loading-btn');
        checkBtn.disabled = false;
    }
}

// 로그아웃
async function logout() {
    if (!supabase) return;
    
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('로그아웃 오류:', error);
        }
        
        currentUser = null;
        updateUIForLoggedOutUser();
        alert('로그아웃되었습니다.');
        
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
}

// 회원가입 폼 실시간 검증 설정
function setupSignupValidation() {
    const nicknameInput = document.getElementById('signup-nickname');
    const passwordInput = document.getElementById('signup-password');
    const passwordConfirmInput = document.getElementById('signup-password-confirm');
    
    // 닉네임 변경 시 중복확인 초기화
    nicknameInput.addEventListener('input', function() {
        nicknameChecked = false;
        document.getElementById('nickname-status').textContent = '';
        document.getElementById('nickname-status').className = 'input-status';
        updateSignupButton();
    });
    
    // 비밀번호 확인 실시간 검증
    passwordConfirmInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const statusElement = document.getElementById('password-match-status');
        
        if (passwordConfirm.length === 0) {
            statusElement.textContent = '';
            statusElement.className = 'input-status';
        } else if (password === passwordConfirm) {
            statusElement.textContent = '✓ 비밀번호가 일치합니다.';
            statusElement.className = 'input-status success';
        } else {
            statusElement.textContent = '✗ 비밀번호가 일치하지 않습니다.';
            statusElement.className = 'input-status error';
        }
        
        updateSignupButton();
    });
    
    // 전화번호 자동 포맷팅
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length >= 3) {
                value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
            }
            e.target.value = value;
        });
    });
}

// 회원가입 버튼 활성화/비활성화
function updateSignupButton() {
    const nickname = document.getElementById('signup-nickname').value.trim();
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    const signupBtn = document.getElementById('signup-btn');
    
    const isValid = nicknameChecked && 
                   nickname.length >= 2 && 
                   password.length >= 8 && 
                   password === passwordConfirm;
    
    signupBtn.disabled = !isValid;
}

// 회원가입 검증 초기화
function resetSignupValidation() {
    nicknameChecked = false;
    document.getElementById('nickname-status').textContent = '';
    document.getElementById('nickname-status').className = 'input-status';
    document.getElementById('password-match-status').textContent = '';
    document.getElementById('password-match-status').className = 'input-status';
    updateSignupButton();
}

// 모달 외부 클릭 시 닫기 (기존 함수 확장)
window.onclick = function(event) {
    const helpModal = document.getElementById('help-modal');
    const statsModal = document.getElementById('stats-modal');
    const rankingModal = document.getElementById('ranking-modal');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    
    if (event.target === helpModal) {
        closeHelp();
    }
    if (event.target === statsModal) {
        closeStats();
    }
    if (event.target === rankingModal) {
        closeRanking();
    }
    if (event.target === loginModal) {
        closeLogin();
    }
    if (event.target === signupModal) {
        closeSignup();
    }
}
// 딜러 카드 표시 (뒷면 카드 포함)
function displayDealerCards(cards, containerId, hideSecond = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    cards.forEach((card, index) => {
        if (hideSecond && index === 1) {
            // 뒷면 카드 표시
            const cardElement = document.createElement('div');
            cardElement.className = 'card card-back';
            cardElement.textContent = '🂠';
            container.appendChild(cardElement);
        } else {
            container.appendChild(displayCard(card));
        }
    });
}