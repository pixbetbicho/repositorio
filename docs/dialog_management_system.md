# Sistema de Gerenciamento de Diálogos

## Visão Geral

O sistema de gerenciamento de diálogos foi criado para garantir que apenas um diálogo esteja aberto por vez na interface do usuário, evitando sobreposições e melhorando a experiência do usuário. O principal caso de uso é a transição suave do diálogo de "Saldo Insuficiente" para o diálogo de "Depósito", sem que ambos apareçam simultaneamente.

## Componentes Principais

### DirectDepositDialog

O `DirectDepositDialog` é um componente global independente que é montado no App.tsx e funciona separadamente dos outros diálogos. Ele serve como ponto central para abrir o diálogo de depósito de qualquer lugar do aplicativo.

**Características:**
- É inicializado com estado fechado
- Escuta eventos personalizados e verificações em localStorage para saber quando deve abrir
- Quando aberto, dispara evento `deposit-dialog-opened` para notificar outros componentes

### Sistema de Eventos Globais

Os seguintes eventos personalizados são utilizados para comunicação entre componentes:

1. `close-all-dialogs` - Notifica todos os componentes para fecharem seus diálogos
2. `open-deposit-dialog` - Solicita a abertura do diálogo de depósito
3. `deposit-dialog-opened` - Notifica que o diálogo de depósito foi aberto

### Função Global requestOpenDepositDialog

Esta função exportada de `direct-deposit-dialog.tsx` permite que qualquer componente solicite a abertura do diálogo de depósito. Ela:

1. Dispara o evento `close-all-dialogs` para fechar quaisquer diálogos abertos
2. Tenta resetar formulários ativos
3. Configura localStorage para sinalizar que o diálogo de depósito deve ser aberto
4. Dispara o evento `open-deposit-dialog`

## Implementação em Componentes

### SimpleInsufficientDialog

Este componente de diálogo para saldo insuficiente:
- Escuta os eventos `close-all-dialogs` e `deposit-dialog-opened`
- Fecha-se automaticamente quando qualquer um desses eventos é recebido
- Usa `requestOpenDepositDialog()` quando o botão "Depositar Agora" é clicado

### MobileBetWizardNew

O componente de apostas:
- Implementa função `resetAllDialogs()` para limpar todos os estados e fechar diálogos
- Escuta o evento `close-all-dialogs` para fechar quaisquer diálogos abertos
- Chama `resetAllDialogs()` antes de solicitar a abertura do diálogo de depósito

## Fluxo de Execução

1. Usuário tenta fazer uma aposta com saldo insuficiente
2. `SimpleInsufficientDialog` é aberto mostrando a situação e oferecendo opções
3. Usuário clica em "Depositar Agora"
4. `requestOpenDepositDialog()` é chamado, que:
   - Dispara evento para fechar todos os diálogos
   - Todos os componentes que escutam `close-all-dialogs` fecham seus diálogos
   - O componente `DirectDepositDialog` detecta a solicitação e abre o diálogo de depósito
   - O evento `deposit-dialog-opened` é disparado
   - Quaisquer diálogos que ainda não foram fechados são fechados ao receber este evento

## Benefícios

1. Comunicação desacoplada entre componentes
2. Gerenciamento centralizado do diálogo de depósito
3. Execução correta das transições entre diálogos
4. Prevenção de estados indesejados na interface (múltiplos diálogos abertos)
5. Facilidade de manutenção, pois cada componente é responsável apenas por seu comportamento

## Considerações de Manutenção

Ao adicionar novos diálogos ao sistema:
1. Adicione listeners para eventos `close-all-dialogs` e `deposit-dialog-opened`
2. Implemente lógica para fechar o diálogo quando esses eventos forem recebidos
3. Se necessário abrir o diálogo de depósito, use `requestOpenDepositDialog()`