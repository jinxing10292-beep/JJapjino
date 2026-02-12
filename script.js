// 게임 상태 관리
let balance = 1000;
let currentGame = null;

// 블랙잭 게임 상태
let deck = [];
let playerCards = [];
let dealerCards = [];
let gameInProgress = false;

// 게임 선택 화면 표시
function showGameSelection() {
    document.querySelector('.game-selection').style.display = 'block';
    const games = ['roulette', 'blackjack', 'slots', 'poker', 'baccarat', 'dice', 'coinflip', 'rps', 'racing', 'wheel', 'lottery', 'crash'];
    games.forEach(game => {
        document.getElementById(game + '-game').style.display = 'none';
    });
    currentGame = null;
}

// 특정 게임 화면 표시
function showGame(game) {
    document.querySelector('.game-selection').style.display = 'none';
    const games = ['roulette', 'blackjack', 'slots', 'poker', 'baccarat', 'dice', 'coinflip', 'rps', 'racing', 'wheel', 'lottery', 'crash'];
    games.forEach(g => {
        document.getElementById(g + '-game').style.display = 'none';
    });
    
    document.getElementById(game + '-game').style.display = 'block';
    currentGame = game;
    
    // 게임별 초기화
    if (game === 'lottery') {
        initializeLottery();
    }
}

// 잔액 업데이트
function updateBalance(amount) {
    balance += amount;
    document.getElementById('balance').textContent = balance;
    
    if (balance <= 0) {
        alert('잔액이 부족합니다! 게임을 다시 시작하려면 페이지를 새로고침하세요.');
    }
}

// 룰렛 게임
function spinRoulette() {
    const betAmount = parseInt(document.getElementById('roulette-bet').value);
    const betType = document.getElementById('bet-type').value;
    
    if (!betAmount || betAmount <= 0 || betAmount > balance) {
        alert('올바른 베팅 금액을 입력하세요!');
        return;
    }
    
    // 베팅 금액 차감
    updateBalance(-betAmount);
    
    // 룰렛 휠 회전
    const wheel = document.getElementById('wheel');
    const randomRotation = Math.random() * 360 + 1800; // 최소 5바퀴 회전
    wheel.style.transform = `rotate(${randomRotation}deg)`;
    
    // 결과 계산 (간단화된 버전)
    setTimeout(() => {
        const resultNumber = Math.floor(Math.random() * 37); // 0-36
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(resultNumber);
        const isBlack = resultNumber !== 0 && !isRed;
        const isEven = resultNumber !== 0 && resultNumber % 2 === 0;
        const isOdd = resultNumber !== 0 && resultNumber % 2 === 1;
        
        let won = false;
        let winAmount = 0;
        
        if (betType === 'red' && isRed) {
            won = true;
            winAmount = betAmount * 2;
        } else if (betType === 'black' && isBlack) {
            won = true;
            winAmount = betAmount * 2;
        } else if (betType === 'even' && isEven) {
            won = true;
            winAmount = betAmount * 2;
        } else if (betType === 'odd' && isOdd) {
            won = true;
            winAmount = betAmount * 2;
        }
        
        if (won) {
            updateBalance(winAmount);
            alert(`축하합니다! ${resultNumber}번이 나왔습니다. $${winAmount}를 획득했습니다!`);
        } else {
            alert(`아쉽습니다! ${resultNumber}번이 나왔습니다.`);
        }
        
        // 입력 필드 초기화
        document.getElementById('roulette-bet').value = '';
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
    displayCards([dealerCards[0]], 'dealer-cards'); // 딜러의 첫 번째 카드만 표시
    
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
    showGameSelection();
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
}

function cashOut() {
    if (!crashGame.inProgress) return;
    
    crashGame.inProgress = false;
    const winAmount = Math.floor(crashGame.betAmount * crashGame.multiplier);
    
    updateBalance(winAmount);
    
    document.getElementById('crash-start-btn').disabled = false;
    document.getElementById('crash-cashout-btn').disabled = true;
    document.getElementById('rocket').classList.remove('flying');
    document.getElementById('crash-result').textContent = 
        `캐시아웃! ${crashGame.multiplier.toFixed(2)}x로 $${winAmount}를 획득했습니다!`;
    document.getElementById('crash-bet').value = '';
}