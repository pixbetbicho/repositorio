// Mapeamento de nomes de animais para seus emojis de alta qualidade ou URLs de imagens
export const getAnimalEmoji = (animalName: string): string => {
  const emojiMap: Record<string, string> = {
    'Avestruz': '🦩',
    'Águia': '🦅',
    'Burro': '🐴',
    'Borboleta': '🦋',
    'Cachorro': '🐕',
    'Cabra': '🐐',
    'Carneiro': '🐏',
    'Camelo': '🐪',
    'Cobra': '🐍',
    'Coelho': '🐇',
    'Cavalo': '🐎',
    'Elefante': '🐘',
    'Galo': '🐓',
    'Gato': '🐈',
    'Jacaré': '🐊',
    'Leão': '🦁',
    'Macaco': '🐒',
    'Porco': '🐖',
    'Pavão': '🦚',
    'Peru': '🦃',
    'Touro': '🐂',
    'Tigre': '🐅',
    'Urso': '🐻',
    'Veado': '🦌',
    'Vaca': '🐄',
  };

  return emojiMap[animalName] || '🐾';
};

// Função para obter URL de imagem do animal, caso seja usada uma abordagem com imagens em vez de emojis
export const getAnimalImageUrl = (animalName: string): string => {
  return `/img/animals/${animalName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.png`;
};

// Obtenha a cor de fundo para o grupo de animais (usando apenas as cores do tema do projeto)
export const getGroupColor = (group: number): string => {
  // Retorna a cor primária para todos os grupos - simplificando o visual
  return 'bg-primary';
};

// Função mantida para compatibilidade com o código existente, mas sem usar gradientes
export const getGroupGradient = (group: number): string => {
  return getGroupColor(group);
};