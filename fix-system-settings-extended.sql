-- Exibe a estrutura atual da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;

-- Script para adicionar novos campos de identidade do site
DO $$
BEGIN
    -- Verificar e adicionar a coluna site_name (nome do site)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'system_settings' AND column_name = 'site_name'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN site_name TEXT NOT NULL DEFAULT 'Jogo do Bicho';
        RAISE NOTICE 'Coluna site_name adicionada com sucesso';
    END IF;
    
    -- Verificar e adicionar a coluna site_description (descrição do site)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'system_settings' AND column_name = 'site_description'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN site_description TEXT NOT NULL DEFAULT 'A melhor plataforma de apostas online';
        RAISE NOTICE 'Coluna site_description adicionada com sucesso';
    END IF;
    
    -- Verificar e adicionar a coluna logo_url (URL da logo do site)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'system_settings' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN logo_url TEXT NOT NULL DEFAULT '/img/logo.png';
        RAISE NOTICE 'Coluna logo_url adicionada com sucesso';
    END IF;
    
    -- Verificar e adicionar a coluna favicon_url (URL do ícone/favicon do site)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'system_settings' AND column_name = 'favicon_url'
    ) THEN
        ALTER TABLE system_settings 
        ADD COLUMN favicon_url TEXT NOT NULL DEFAULT '/favicon.ico';
        RAISE NOTICE 'Coluna favicon_url adicionada com sucesso';
    END IF;
    
END $$;

-- Exibir a estrutura atualizada da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;