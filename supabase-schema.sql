-- Supabase 데이터베이스 스키마
-- 이 파일을 Supabase 대시보드의 SQL 에디터에서 실행하세요

-- 플레이어 테이블 생성 (auth.users와 연결)
CREATE TABLE IF NOT EXISTS players (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    balance INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    total_bet INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    max_balance INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게임 세션 테이블 (PvP 게임용)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_type VARCHAR(20) NOT NULL, -- 'blackjack', 'poker', 'rps'
    player1_id UUID REFERENCES players(id),
    player2_id UUID REFERENCES players(id),
    bet_amount INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
    winner_id UUID REFERENCES players(id),
    game_data JSONB, -- 게임 상태 데이터
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 예측 베팅 테이블
CREATE TABLE IF NOT EXISTS prediction_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    target_player_nickname VARCHAR(50) NOT NULL,
    predicted_rank INTEGER NOT NULL,
    bet_amount INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed'
    result VARCHAR(10), -- 'win', 'lose'
    actual_rank INTEGER,
    win_amount INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 스포츠 경기 테이블
CREATE TABLE IF NOT EXISTS sports_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sport VARCHAR(20) NOT NULL,
    team1 VARCHAR(100) NOT NULL,
    team2 VARCHAR(100) NOT NULL,
    odds_team1 DECIMAL(4,2) NOT NULL,
    odds_draw DECIMAL(4,2) NOT NULL,
    odds_team2 DECIMAL(4,2) NOT NULL,
    result VARCHAR(10), -- 'team1', 'draw', 'team2'
    status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'live', 'completed'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 스포츠 베팅 테이블
CREATE TABLE IF NOT EXISTS sports_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    match_id UUID REFERENCES sports_matches(id),
    bet_type VARCHAR(10) NOT NULL, -- 'team1', 'draw', 'team2'
    bet_amount INTEGER NOT NULL,
    odds DECIMAL(4,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'won', 'lost'
    win_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_players_balance ON players(balance DESC);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);
CREATE INDEX IF NOT EXISTS idx_players_total_games ON players(total_games DESC);
CREATE INDEX IF NOT EXISTS idx_players_nickname ON players(nickname);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_prediction_bets_status ON prediction_bets(status);
CREATE INDEX IF NOT EXISTS idx_prediction_bets_expires ON prediction_bets(expires_at);
CREATE INDEX IF NOT EXISTS idx_sports_matches_status ON sports_matches(status);
CREATE INDEX IF NOT EXISTS idx_sports_bets_status ON sports_bets(status);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_bets ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 플레이어 정보를 읽을 수 있도록 허용 (랭킹용)
CREATE POLICY "Players are viewable by everyone" ON players
    FOR SELECT USING (true);

-- 사용자는 자신의 데이터만 수정 가능
CREATE POLICY "Users can update own player data" ON players
    FOR UPDATE USING (auth.uid() = id);

-- 사용자는 자신의 데이터만 삽입 가능
CREATE POLICY "Users can insert own player data" ON players
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 게임 세션은 모든 사용자가 볼 수 있음 (매칭용)
CREATE POLICY "Game sessions are viewable by everyone" ON game_sessions
    FOR SELECT USING (true);

-- 사용자는 자신이 참여한 게임 세션만 수정 가능
CREATE POLICY "Users can update own game sessions" ON game_sessions
    FOR UPDATE USING (
        auth.uid() = player1_id OR 
        auth.uid() = player2_id
    );

-- 예측 베팅은 모든 사용자가 볼 수 있음
CREATE POLICY "Prediction bets are viewable by everyone" ON prediction_bets
    FOR SELECT USING (true);

-- 사용자는 자신의 예측 베팅만 생성/수정 가능
CREATE POLICY "Users can manage own prediction bets" ON prediction_bets
    FOR ALL USING (auth.uid() = player_id);

-- 스포츠 경기는 모든 사용자가 볼 수 있음
CREATE POLICY "Sports matches are viewable by everyone" ON sports_matches
    FOR SELECT USING (true);

-- 스포츠 베팅은 모든 사용자가 볼 수 있음
CREATE POLICY "Sports bets are viewable by everyone" ON sports_bets
    FOR SELECT USING (true);

-- 사용자는 자신의 스포츠 베팅만 생성/수정 가능
CREATE POLICY "Users can manage own sports bets" ON sports_bets
    FOR ALL USING (auth.uid() = player_id);

-- 실시간 구독을 위한 함수들
CREATE OR REPLACE FUNCTION notify_ranking_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('ranking_update', row_to_json(NEW)::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 플레이어 데이터 변경 시 알림 트리거
CREATE TRIGGER ranking_change_trigger
    AFTER UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION notify_ranking_change();

-- 회원가입 시 자동으로 플레이어 프로필 생성하는 함수
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO players (id, nickname, phone, balance, wins, total_games, total_bet, total_won, max_balance)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nickname', 'Player' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        1000,
        0,
        0,
        0,
        0,
        1000
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 새 사용자 등록 시 플레이어 프로필 자동 생성 트리거
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();