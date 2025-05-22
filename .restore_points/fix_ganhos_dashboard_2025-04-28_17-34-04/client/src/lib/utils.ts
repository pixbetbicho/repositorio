import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { BetType } from "@shared/schema";

/**
 * Formata uma data para exibição no formato brasileiro (dd/mm/yyyy)
 * @param date Data a ser formatada
 * @param includeTime Se true, inclui o horário no formato (hh:mm)
 * @returns String formatada no padrão brasileiro
 */
export function formatDate(date: Date, includeTime = false): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  let formatted = `${day}/${month}/${year}`;
  
  if (includeTime) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    formatted += ` ${hours}:${minutes}`;
  }
  
  return formatted;
}

/**
 * Formata um valor numérico para o formato monetário brasileiro (R$ x,xx)
 * Com suporte a separadores de milhar (exemplo: R$ 1.000,00)
 * @param value valor numérico a ser formatado
 * @returns string formatada no padrão brasileiro
 */
export function formatCurrency(value: number | string): string {
  if (typeof value === 'string') {
    // Se for string vazia, retorna zero formatado
    if (!value) return "R$ 0,00";
    
    // Converte para número para formatação
    value = parseMoneyValue(value);
  }
  
  // Tratamento para valor zero
  if (value === 0) return "R$ 0,00";
  
  // Formata o número com casas decimais e separa a parte inteira da decimal
  const [intPart, decPart] = value.toFixed(2).split('.');
  
  // Formata a parte inteira com separadores de milhar
  const formattedIntPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retorna no formato R$ X.XXX,XX
  return `R$ ${formattedIntPart},${decPart}`;
}

/**
 * Converte uma string no formato monetário brasileiro para número
 * Aceita valores com vírgulas, pontos de milhar, espaços e prefixo R$
 * Formata automaticamente a entrada do usuário:
 * - Se digitar 3: interpreta como 3,00
 * - Se digitar 250: interpreta como 2,50
 * - Se digitar 2500: interpreta como 25,00
 * - Se digitar 25000: interpreta como 250,00
 * - Se digitar 250000: interpreta como 2.500,00
 * - Se digitar 2,5: interpreta como 2,50 (com vírgula digitada pelo usuário)
 * @param value string a ser convertida para número
 * @returns número convertido ou 0 se a conversão falhar
 */
export function parseMoneyValue(value: string): number {
  // Remove espaços, prefixo R$ e outros caracteres não numéricos (exceto vírgula e ponto)
  let cleanValue = value
    .replace(/\s+/g, '')
    .replace(/R\$/g, '')
    .replace(/[^\d,.]/g, '');
  
  // Se estiver vazio, retorna 0
  if (!cleanValue) return 0;
  
  // Verifica se o valor já possui vírgula como separador decimal
  const hasComma = cleanValue.includes(',');
  
  if (hasComma) {
    // Se já tem vírgula, respeitar a entrada do usuário
    const parts = cleanValue.split(',');
    const integerPart = parts[0].replace(/\./g, ''); // Remove pontos de milhar da parte inteira
    let decimalPart = parts[1] || '00';
    
    // Garantir que a parte decimal tenha 2 dígitos
    if (decimalPart.length === 1) {
      decimalPart += '0'; // Se digitou apenas um número após a vírgula, completa com zero
    } else if (decimalPart.length > 2) {
      decimalPart = decimalPart.substring(0, 2); // Limita a parte decimal a 2 dígitos
    }
    
    // Formata para o padrão JavaScript
    cleanValue = integerPart + '.' + decimalPart;
  } else {
    // Se não tem vírgula, aplica a lógica automática
    if (cleanValue.length === 1) {
      // Um único dígito: 3 -> interpreta como 3.00
      cleanValue = cleanValue + '.00';
    }
    else if (cleanValue.length === 2) {
      // Dois dígitos: 25 -> interpreta como 25.00
      cleanValue = cleanValue + '.00';
    }
    else {
      // Mais de dois dígitos: 
      // 250 -> 2.50
      // 2500 -> 25.00
      // 25000 -> 250.00
      const len = cleanValue.length;
      cleanValue = cleanValue.substring(0, len - 2) + '.' + cleanValue.substring(len - 2);
    }
  }
  
  const number = parseFloat(cleanValue);
  return isNaN(number) ? 0 : number;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Traduz os tipos de aposta para português de forma consistente em todo o sistema
 * @param type tipo de aposta (BetType)
 * @param withDescription inclui descrição adicional sobre o formato (ex: "Número de 4 dígitos")
 * @param gameModeName opcional: nome do modo de jogo, usado para melhorar a exibição
 * @returns string formatada para exibição
 */
export function formatBetType(
  type: string, 
  withDescription = false, 
  gameModeName?: string
): { name: string; description?: string } {
  // Limpeza do tipo de aposta (remover números, espaços extras, etc.)
  let cleanType = type.trim().toLowerCase();
  
  // Se tivermos o nome do modo de jogo, ele tem prioridade para definir o nome visual da aposta
  if (gameModeName) {
    const modeName = gameModeName.trim();
    
    // Verificamos se o modo de jogo especifica diretamente o tipo de aposta
    if (modeName.toLowerCase().includes('milhar')) {
      return { 
        name: "Milhar", 
        description: withDescription ? "Número de 4 dígitos" : undefined 
      };
    } else if (modeName.toLowerCase().includes('centena')) {
      return { 
        name: "Centena", 
        description: withDescription ? "Número de 3 dígitos" : undefined 
      };
    } else if (modeName.toLowerCase().includes('dezena') && !modeName.toLowerCase().includes('duque') && !modeName.toLowerCase().includes('terno')) {
      return { 
        name: "Dezena", 
        description: withDescription ? "Número de 2 dígitos" : undefined 
      };
    } else if (modeName.toLowerCase().includes('grupo') && !modeName.toLowerCase().includes('duque') && !modeName.toLowerCase().includes('terno') && !modeName.toLowerCase().includes('quadra') && !modeName.toLowerCase().includes('quina')) {
      return { name: "Grupo" };
    }
  }
  
  // Se não temos o nome do modo de jogo ou ele não corresponde diretamente a um tipo, 
  // usamos o tipo da aposta
  switch (cleanType) {
    case "group":
      return { name: "Grupo" };
    case "duque_grupo":
      return { name: "Duque de Grupo" };
    case "terno_grupo":
      return { name: "Terno de Grupo" };
    case "quadra_duque":
      return { name: "Quadra de Duque" };
    case "quina_grupo":
      return { name: "Quina de Grupo" };
    case "thousand":
      return { 
        name: "Milhar", 
        description: withDescription ? "Número de 4 dígitos" : undefined 
      };
    case "hundred":
      return { 
        name: "Centena", 
        description: withDescription ? "Número de 3 dígitos" : undefined 
      };
    case "dozen":
      return { 
        name: "Dezena", 
        description: withDescription ? "Número de 2 dígitos" : undefined 
      };
    case "duque_dezena":
      return { name: "Duque de Dezena" };
    case "terno_dezena":
      return { name: "Terno de Dezena" };
    case "passe_ida":
      return { name: "Passe Ida" };
    case "passe_ida_volta":
      return { name: "Passe Ida e Volta" };
    default:
      // Se o tipo não for reconhecido, tente uma correspondência parcial
      if (cleanType.includes("milhar") || cleanType.includes("thousand")) {
        return { 
          name: "Milhar", 
          description: withDescription ? "Número de 4 dígitos" : undefined 
        };
      } else if (cleanType.includes("centena") || cleanType.includes("hundred")) {
        return { 
          name: "Centena", 
          description: withDescription ? "Número de 3 dígitos" : undefined 
        };
      } else if (cleanType.includes("dezena") || cleanType.includes("dozen")) {
        return { 
          name: "Dezena", 
          description: withDescription ? "Número de 2 dígitos" : undefined 
        };
      }
      
      // Última opção: formatação básica
      return { name: type.replace(/_/g, ' ').charAt(0).toUpperCase() + type.replace(/_/g, ' ').slice(1) };
  }
}
