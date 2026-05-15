# ClimaTech — Plataforma de Monitoramento Climático IoT

ClimaTech é uma plataforma SaaS multi-tenant de monitoramento e automação de climatização de ambientes, projetada para operar com dispositivos embarcados ESP32 via protocolo MQTT. O sistema integra sensoriamento ambiental, controle de ar-condicionado via infravermelho e automações configuráveis por sala, com isolamento total de dados por cliente.

---

## Visão Geral

A plataforma é composta por dois tipos de nodes físicos e uma interface web centralizada:

| Componente | Descrição |
|---|---|
| **CTN-R** (ClimaTech Node Reference) | Node de sensoriamento. Mede temperatura (DS18B20), detecta presença (PIR) e publica telemetria periódica via MQTT. |
| **CTN-C** (ClimaTech Node Control) | Node de controle. Recebe comandos da plataforma e aciona o ar-condicionado via sinal infravermelho (IR). Há um CTN-C por unidade de AC na sala. |
| **Frontend** | Interface web para visualização em tempo real, controle de dispositivos, automações e gerenciamento de nodes. |

---

## Stack de Tecnologias

| Tecnologia | Função |
|---|---|
| **Next.js 16** (App Router) | Framework React com roteamento baseado em arquivos, Server e Client Components |
| **React 19** | Biblioteca de interface de usuário |
| **TypeScript** | Tipagem estática em todo o projeto |
| **Tailwind CSS v4** | Estilização utilitária responsiva |
| **Recharts** | Gráficos de telemetria e consumo energético |

---

## Arquitetura do Frontend

### Estrutura de Pastas

```
src/
├── app/                    # Rotas (Next.js App Router)
│   ├── dashboard/          # Visão geral do sistema
│   ├── select-client/      # Seleção de cliente (Admin Master)
│   ├── rooms/              # Listagem e detalhes de salas
│   │   ├── [id]/           # Detalhes de uma sala específica
│   │   │   └── automations/ # Automações de uma sala
│   │   └── new/            # Criação de nova sala
│   ├── automations/        # Visão geral de todas as automações
│   ├── ac-temps/           # Temperatura por AC por sala
│   ├── energy/             # Consumo energético
│   ├── nodes/              # Gerenciamento de nodes (admin only)
│   ├── users/              # Gerenciamento de usuários (admin only)
│   ├── ai/                 # Assistente IA (modo demonstração)
│   ├── settings/           # Configurações de conta
│   ├── login/              # Autenticação
│   ├── register/           # Cadastro
│   └── 2fa/                # Autenticação em dois fatores
│
├── components/
│   ├── auth/               # LoginForm, RegisterForm, TwoFactorForm
│   ├── automation/         # RuleForm, RuleList
│   ├── dashboard/          # EmptyState
│   ├── monitoring/         # TemperatureChart, ChartSection, ConnectionAlert
│   ├── rooms/              # DeviceControls, RoomForm, RoomList, DeleteRoomModal
│   └── ui/                 # Button, Card, Input, Modal, Sidebar
│
├── contexts/
│   ├── AuthContext.tsx      # Sessão do usuário (sessionStorage)
│   ├── ClientContext.tsx    # Gerenciamento de clientes
│   ├── RoomsContext.tsx     # Estado global de salas e dispositivos (filtrado por cliente)
│   ├── AutomationsContext.tsx # Estado global de automações (filtrado por cliente)
│   ├── ThemeContext.tsx     # Preferências de tema (localStorage)
│   └── LoadingContext.tsx   # Estado de loading global
│
├── services/
│   ├── authService.ts       # Login, registro, 2FA, upload de avatar, CRUD de usuários
│   ├── clientService.ts     # Gerenciamento de clientes
│   ├── roomService.ts       # CRUD de salas (in-memory)
│   ├── deviceService.ts     # Estado e comandos de dispositivos (in-memory)
│   ├── automationService.ts # CRUD e avaliação de regras de automação
│   ├── nodeService.ts       # Listagem e status de nodes CTN-R/CTN-C
│   └── mockData.ts          # Dados iniciais para desenvolvimento
│
├── hooks/
│   ├── useAuth.ts           # Re-export de useAuth do AuthContext
│   └── useTheme.ts          # Re-export de useTheme do ThemeContext
│
├── types/
│   └── index.ts             # Todas as interfaces e tipos do sistema
│
├── utils/
│   └── validators.ts        # Validações de email, senha, temperatura, etc.
│
└── config/
    ├── constants.ts         # Chaves de sessão, IDs padrão, tokens mock
    └── adminCredentials.ts  # Credenciais dos Administradores Master (mock)
```

---

## Contextos Globais

O estado da aplicação é gerenciado por contextos React, todos providos em `src/app/providers.tsx`:

### AuthContext
Gerencia a sessão do usuário. Persiste os dados do usuário logado no `sessionStorage` (incluindo `role` e `selectedClientId` para Admin Master). Expõe `login`, `logout`, `register`, `verify2FA` e `updateUser`.

### ClientContext
Gerencia a lista de clientes disponíveis e o cliente selecionado. Usado principalmente por Administradores Master para alternar entre clientes.

### RoomsContext
Mantém o estado de todas as salas (`rooms`) e o estado atual de cada dispositivo (`deviceStates`). **Filtra automaticamente as salas por cliente** baseado no usuário logado. Expõe métodos para CRUD de salas, atualização de comandos via `sendCommand` e sincronização direta de estado via `syncDeviceState`.

### AutomationsContext
Mantém o estado global de todas as regras de automação. **Filtra automaticamente por cliente** através das salas do RoomsContext. Expõe `toggleRule`, `createRule`, `updateRule`, `deleteRule` e `getRulesForRoom`.

---

## Sistema Multi-Tenant e Controle de Acesso

O sistema possui três níveis de acesso com **isolamento total de dados por cliente**:

### 🟣 Administrador Master
- **Acesso**: Todos os clientes do sistema
- **Fluxo**: Após login, deve selecionar um cliente na tela `/select-client`
- **Permissões**:
  - Visualizar e gerenciar dados do cliente selecionado
  - Trocar de cliente a qualquer momento via sidebar
  - Criar usuários (incluindo outros Administradores Master)
  - Acesso total a todas as funcionalidades (Nodes, Usuários, etc.)
- **Isolamento**: Vê apenas dados do cliente selecionado
- **Visibilidade**: Invisível para Administradores Cliente


### 🔵 Administrador Cliente
- **Acesso**: Apenas um cliente específico (vinculado permanentemente)
- **Permissões**:
  - Acesso total aos dados do seu cliente
  - Criar e gerenciar usuários do seu cliente
  - Acesso a Nodes e funcionalidades administrativas
  - **NÃO pode ver Administradores Master**
  - **NÃO pode criar Administradores Master**
- **Isolamento**: Vê apenas dados do seu cliente
- **Exemplo**: Adm UNIFecaf (`admin@unifecaf.com`)

### 🟢 Usuário
- **Acesso**: Apenas um cliente específico (vinculado permanentemente)
- **Permissões**:
  - Visualização de dados do seu cliente
  - Controle de dispositivos
  - **SEM acesso** a Nodes e gerenciamento de usuários
- **Isolamento**: Vê apenas dados do seu cliente

### Isolamento de Dados

Todos os dados são filtrados por `clientId`:
- ✅ **Salas**: Filtradas automaticamente no RoomsContext
- ✅ **Usuários**: Filtrados na página de gerenciamento
- ✅ **Automações**: Filtradas através das salas
- ✅ **Nodes**: Filtrados através das salas
- ✅ **Estatísticas**: Calculadas apenas com dados do cliente atual

---

## Funcionalidades Principais

### 🏠 Dashboard
- Visão geral com estatísticas do cliente atual
- **Modo Ao Vivo**: Atualização automática dos cards a cada 2 segundos
- Gráfico histórico de temperatura (30 min de granularidade)
- Cards de resumo: Total de salas, ACs ligados, Temperatura média, Automações ativas
- Lista de todas as salas com status em tempo real

### 📊 Monitoramento
- Gráficos de temperatura histórica por sala
- Seleção de data para visualização de histórico
- Indicadores de status (Normal / Atenção / Crítico)
- Alertas de conexão de dispositivos

### 🎛️ Controle de Dispositivos
- Ligar/Desligar ar-condicionado
- Ajuste de temperatura alvo
- Seleção de modo (Cool, Fan, Dry, Heat, Auto)
- Controle de velocidade do ventilador
- Feedback visual em tempo real

### 🤖 Automações
- Criação de regras baseadas em:
  - **Agendamento**: Horário de início e fim
  - **Temperatura**: Faixa de temperatura
- Ações disponíveis:
  - Ligar AC
  - Desligar AC
  - Ajustar temperatura
- Ativação/desativação de regras
- Visualização por sala ou global

### 🔌 Gerenciamento de Nodes (Admin)
- Listagem de todos os nodes CTN-R e CTN-C
- Status em tempo real (Online, Offline, Erro)
- Filtros por status, tipo e sala
- Comandos de diagnóstico e aprendizado IR
- Informações de firmware e última conexão

### 👥 Gerenciamento de Usuários (Admin)
- Criação de usuários com diferentes perfis
- Administradores Master podem criar outros Admin Masters
- Administradores Cliente não veem Admin Masters
- Alteração de perfil (promover/rebaixar)
- Exclusão de usuários

---

## Lógica de Status de Temperatura

O status de cada sala (Normal / Atenção / Crítico) é calculado pela função `getIndicatorStatus` em `src/utils/validators.ts`, comparando a temperatura atual (`currentTemp`) com a temperatura alvo (`targetTemp`) definida pelo admin:

| Status | Condição |
|---|---|
| **Normal** | `|currentTemp - targetTemp| ≤ 0.5°C` |
| **Atenção** | Diferença entre 0.5°C e 3°C |
| **Crítico** | Diferença > 3°C |

O `targetTemp` padrão é o centro do intervalo ideal da sala (`(idealTempMin + idealTempMax) / 2`). Quando o admin define manualmente um alvo diferente, o status passa a refletir essa nova referência.

---

## Identificação dos Nodes

Cada node possui um ID único gerado a partir do MAC address do ESP32:

- **CTN-R:** `CTN-R-V1-{MAC}` — node de sensoriamento (1 por sala)
- **CTN-C:** `CTN-C-V1-{MAC}` — node de controle (1 por unidade de AC na sala)

Nodes de uma mesma sala compartilham o mesmo `pairId` (ex: `SALA-01`).

---

## Dados Mock

Todos os dados são in-memory (sem banco de dados). Os dados iniciais estão em `src/services/mockData.ts`:

### Clientes
- **UNIFecaf** (`client-unifecaf`)
- **Cliente Demo** (`client-demo`)
- **Empresa X** (`client-empresa-x`)

### Salas
**UNIFecaf:**
- Auditório (2 ACs)
- Laboratório de Informática 05 (1 AC)
- Sala 208 (3 ACs)

**Cliente Demo:**
- Sala Demo 1 (1 AC)
- Sala Demo 2 (2 ACs)

### Usuários
**Administradores Cliente:**
- Adm UNIFecaf: `admin@unifecaf.com` / `Unifecaf@2024`

**Usuários:**
- Usuário Demo: `usuario@demo.com` / `Demo@2024`

### Nodes
Nodes CTN-R e CTN-C para cada sala, com status variados (online, offline, error).

### Automações
3 regras de automação de exemplo distribuídas entre as salas.

---

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar testes
npm run test
```

Os dados são resetados ao recarregar a página, pois vivem apenas em memória.

---

## Próximos Passos

- [ ] Integração com backend real (API REST ou GraphQL)
- [ ] Implementação de WebSocket para atualizações em tempo real
- [ ] Persistência de dados em banco de dados
- [ ] Integração com broker MQTT para comunicação com nodes
- [ ] Sistema de notificações push
- [ ] Relatórios e exportação de dados
- [ ] Aplicativo mobile (React Native)
