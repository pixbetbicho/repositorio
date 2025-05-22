// Types for the frontend

export interface Animal {
  id: number;
  group: number;
  name: string;
  numbers: string[];
}

export interface Draw {
  id: number;
  name: string;
  time: string;
  date: string;
  status: "pending" | "completed";
  resultAnimalId: number | null;
  resultAnimalId2: number | null;
  resultAnimalId3: number | null;
  resultAnimalId4: number | null;
  resultAnimalId5: number | null;
  createdAt: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  name?: string;
  balance: number;
  isAdmin: boolean;
  defaultPixKey?: string;
  defaultPixKeyType?: string;
  createdAt: string;
}

export interface Bet {
  id: number;
  userId: number;
  animalId?: number;
  animalId2?: number;
  animalId3?: number;
  animalId4?: number;
  animalId5?: number;
  amount: number;
  type: BetType;
  createdAt: string;
  drawId: number;
  status: "pending" | "won" | "lost";
  winAmount: number | null;
  gameModeId?: number | null;
  potentialWinAmount?: number | null;
  betNumbers?: string[] | null;
  premioType?: PremioType;
}

export interface BetWithDetails extends Bet {
  animal?: Animal;      // Primeiro animal selecionado
  animal2?: Animal;     // Segundo animal selecionado
  animal3?: Animal;     // Terceiro animal selecionado
  animal4?: Animal;     // Quarto animal selecionado
  animal5?: Animal;     // Quinto animal selecionado
  draw: Draw;
  gameMode?: GameMode;
}

export interface DrawWithDetails extends Draw {
  animal?: Animal;      // Primeiro prêmio
  animal2?: Animal;     // Segundo prêmio
  animal3?: Animal;     // Terceiro prêmio
  animal4?: Animal;     // Quarto prêmio
  animal5?: Animal;     // Quinto prêmio
}

export interface BetFormData {
  animalId?: number;
  animalId2?: number; // Para apostas que requerem 2 animais
  animalId3?: number; // Para apostas que requerem 3 animais
  animalId4?: number; // Para apostas que requerem 4 animais
  animalId5?: number; // Para apostas que requerem 5 animais
  amount: number;
  type: BetType;
  drawId: number;
  gameModeId: number;
  potentialWinAmount: number;
  betNumber?: string;
  betNumbers?: string[]; // Para apostas que requerem múltiplos números
  premioType?: PremioType; // Para especificar em qual prêmio (1º ao 5º) a aposta será feita
}

export interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  bgColor: string;
  iconColor: string;
}

export interface PopularGroup {
  animalId: number;
  count: number;
  animal?: Animal;
  percentage?: number;
}

export interface GameMode {
  id: number;
  name: string;
  description: string;
  odds: number;
  active: boolean;
  createdAt: string;
}

// Tipos de prêmios para apostas
export type PremioType = "1" | "2" | "3" | "4" | "5" | "1-5";

// Atualização para incluir os novos tipos de aposta
export type BetType = 
  | "simple" 
  | "head" 
  | "group" 
  | "dozen" 
  | "hundred" 
  | "thousand"
  | "duque_grupo"
  | "terno_grupo"
  | "quadra_duque"
  | "quina_grupo"
  | "duque_dezena"
  | "terno_dezena"
  | "passe_ida"
  | "passe_ida_volta";
