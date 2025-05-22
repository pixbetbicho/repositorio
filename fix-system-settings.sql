-- Exibe a estrutura atual da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;

-- Script de correção para tabela system_settings
DO $$
BEGIN
    -- Criar tabela se ela não existir
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_settings') THEN
        CREATE TABLE system_settings (
            id SERIAL PRIMARY KEY,
            max_bet_amount REAL NOT NULL DEFAULT 10000,
            max_payout REAL NOT NULL DEFAULT 1000000,
            min_bet_amount REAL NOT NULL DEFAULT 50,
            default_bet_amount REAL NOT NULL DEFAULT 200,
            main_color TEXT NOT NULL DEFAULT '#035faf',
            secondary_color TEXT NOT NULL DEFAULT '#b0d525',
            accent_color TEXT NOT NULL DEFAULT '#b0d524',
            allow_user_registration BOOLEAN NOT NULL DEFAULT TRUE,
            allow_deposits BOOLEAN NOT NULL DEFAULT TRUE,
            allow_withdrawals BOOLEAN NOT NULL DEFAULT TRUE,
            maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
            auto_approve_withdrawals BOOLEAN NOT NULL DEFAULT TRUE,
            auto_approve_withdrawal_limit REAL NOT NULL DEFAULT 30,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabela system_settings criada com sucesso';
    END IF;

    -- Verificar e adicionar colunas obrigatórias (caso existam registros mas faltam colunas)
    
    -- Corrigir tipo da coluna max_bet_amount se for INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='max_bet_amount'
        AND data_type='integer'
    ) THEN
        ALTER TABLE system_settings ALTER COLUMN max_bet_amount TYPE REAL USING max_bet_amount::REAL;
        RAISE NOTICE 'Coluna max_bet_amount convertida para REAL';
    END IF;
    
    -- Corrigir tipo da coluna max_payout se for INTEGER
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='max_payout'
        AND data_type='integer'
    ) THEN
        ALTER TABLE system_settings ALTER COLUMN max_payout TYPE REAL USING max_payout::REAL;
        RAISE NOTICE 'Coluna max_payout convertida para REAL';
    END IF;
    
    -- Verificar e adicionar coluna min_bet_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='min_bet_amount'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN min_bet_amount REAL NOT NULL DEFAULT 50;
        RAISE NOTICE 'Coluna min_bet_amount adicionada';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='min_bet_amount'
        AND data_type='integer'
    ) THEN
        ALTER TABLE system_settings ALTER COLUMN min_bet_amount TYPE REAL USING min_bet_amount::REAL/100;
        RAISE NOTICE 'Coluna min_bet_amount convertida para REAL';
    END IF;
    
    -- Verificar e adicionar coluna default_bet_amount
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='default_bet_amount'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN default_bet_amount REAL NOT NULL DEFAULT 200;
        RAISE NOTICE 'Coluna default_bet_amount adicionada';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='default_bet_amount'
        AND data_type='integer'
    ) THEN
        ALTER TABLE system_settings ALTER COLUMN default_bet_amount TYPE REAL USING default_bet_amount::REAL/100;
        RAISE NOTICE 'Coluna default_bet_amount convertida para REAL';
    END IF;
    
    -- Verificar e adicionar coluna auto_approve_withdrawals
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='auto_approve_withdrawals'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN auto_approve_withdrawals BOOLEAN NOT NULL DEFAULT TRUE;
        RAISE NOTICE 'Coluna auto_approve_withdrawals adicionada';
    END IF;
    
    -- Verificar e adicionar coluna auto_approve_withdrawal_limit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='auto_approve_withdrawal_limit'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN auto_approve_withdrawal_limit REAL NOT NULL DEFAULT 30;
        RAISE NOTICE 'Coluna auto_approve_withdrawal_limit adicionada';
    END IF;
    
    -- Inserir configurações padrão se a tabela estiver vazia
    IF NOT EXISTS (SELECT 1 FROM system_settings) THEN
        INSERT INTO system_settings (
            max_bet_amount, 
            max_payout,
            min_bet_amount,
            default_bet_amount,
            main_color, 
            secondary_color, 
            accent_color, 
            allow_user_registration, 
            allow_deposits, 
            allow_withdrawals, 
            maintenance_mode,
            auto_approve_withdrawals,
            auto_approve_withdrawal_limit,
            updated_at
        ) VALUES (
            10000, -- max_bet_amount
            1000000, -- max_payout
            50, -- min_bet_amount
            200, -- default_bet_amount
            '#035faf', -- main_color
            '#b0d525', -- secondary_color
            '#b0d524', -- accent_color
            TRUE, -- allow_user_registration
            TRUE, -- allow_deposits
            TRUE, -- allow_withdrawals
            FALSE, -- maintenance_mode
            TRUE, -- auto_approve_withdrawals
            30, -- auto_approve_withdrawal_limit
            NOW() -- updated_at
        );
        RAISE NOTICE 'Configurações padrão inseridas';
    END IF;
END$$;

-- Verificar o conteúdo da tabela após as alterações
SELECT * FROM system_settings ORDER BY id DESC LIMIT 1;

-- Teste uma operação de atualização
-- Isso ajudará a identificar problemas de permissão ou restrições na tabela
DO $$
BEGIN
    UPDATE system_settings 
    SET updated_at = NOW() 
    WHERE id = (SELECT MAX(id) FROM system_settings);
    
    RAISE NOTICE 'Teste de atualização executado com sucesso';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao executar atualização: %', SQLERRM;
END $$;