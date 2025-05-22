-- Atualizar configurações de bônus no sistema
UPDATE system_settings 
SET 
  first_deposit_bonus_enabled = TRUE,
  first_deposit_bonus_percentage = 150,
  first_deposit_bonus_max_amount = 300,
  first_deposit_bonus_rollover = 2
WHERE id = 1;