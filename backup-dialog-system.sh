#!/bin/bash

# Script para backup do sistema de gerenciamento de diálogos
# Uso: ./backup-dialog-system.sh [nome-opcional]

# Data atual no formato YYYY-MM-DD
DATA=$(date +%Y-%m-%d)

# Nome do backup (usa argumento ou valor padrão)
if [ -z "$1" ]; then
  NOME_BACKUP="dialog_system_backup_${DATA}"
else
  NOME_BACKUP="${1}_${DATA}"
fi

# Diretório de backup
BACKUP_DIR="backups/${NOME_BACKUP}"

# Cria o diretório se não existir
mkdir -p "$BACKUP_DIR"

# Arquivos para backup
ARQUIVOS=(
  "client/src/components/direct-deposit-dialog.tsx"
  "client/src/components/simple-insufficient-dialog.tsx"
  "client/src/components/mobile-bet-wizard-new.tsx"
  "client/src/App.tsx"
  "docs/dialog_management_system.md"
)

# Realiza o backup
for arquivo in "${ARQUIVOS[@]}"; do
  if [ -f "$arquivo" ]; then
    cp "$arquivo" "$BACKUP_DIR/"
    echo "✓ Backup de $arquivo realizado com sucesso."
  else
    echo "⚠️ Arquivo $arquivo não encontrado."
  fi
done

echo ""
echo "Backup concluído em $BACKUP_DIR"
ls -la "$BACKUP_DIR"