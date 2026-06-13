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
| **Vitest** | Testes unitários e property-based |

---

## Arquitetura do Frontend

### Estrutura de Pastas

```
src/
├── app/                    # Rotas (Next.js App Router)
│   ├── dashboard/          # Visão geral do sistema
│   ├── clients/            # Visão consolidada de clientes (Admin Master)
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
│   ├── ai/                 # Assistente IA integrado ao backend
│   ├── admin/
│   │   └── mqtt-terminal/  # Terminal MQTT para diagnóstico (admin only)
│   ├── settings/           # Configurações de conta
│   ├── login/              # Autenticação
│   ├── register/           # Cadastro
│   └── 2fa/                # Autenticação em dois fatores
│
├── components/
│   ├── auth/               # LoginForm, RegisterForm, TwoFactorForm
│   ├── automation/         # RuleForm, RuleList
│   ├── clients/            # AddClientModal
│   ├── dashboard/          # EmptyState, LiveModeNotification
│   ├── monitoring/         # TemperatureChart, ChartSection, ConnectionAlert
│   ├── rooms/              # DeviceControls, RoomForm, RoomList, DeleteRoomModal
│   └── ui/                 # Button, Card, Input, Modal, Sidebar, PasswordConfirmModal
│
├── contexts/
│   ├── AuthContext.tsx      # Sessão do usuário (sessionStorage / localStorage)
│   ├── ClientContext.tsx    # Gerenciamento de clientes
│   ├── RoomsContext.tsx     # Estado global de salas e dispositivos (filtrado por cliente)
│   ├── AutomationsContext.tsx # Estado global de automações (filtrado por cliente)
│   ├── ThemeContext.tsx     # Preferências de tema (localStorage)
│   └── LoadingContext.tsx   # Estado de loading global
│
├── services/
│   ├── apiService.ts        # Integração central com a API FastAPI
│   ├── authService.ts       # Login, logout, refresh de token
│   ├── clientService.ts     # CRUD de clientes via API
│   ├── salaService.ts       # CRUD de salas via API
│   ├── acService.ts         # Gerenciamento de ar-condicionados via API
│   ├── automationService.ts # CRUD e avaliação de regras de automação via API
│   ├── nodeService.ts       # Listagem e status de nodes CTN-R/CTN-C via API
│   ├── userService.ts       # CRUD de usuários via API
│   ├── deviceService.ts     # Estado local de dispositivos e comandos de AC (parcial)
│   ├── cacheService.ts      # Cache em memória de respostas da API (TTL 5 min)
│   └── liveModeService.ts   # Coordenação do modo ao vivo entre usuários (em memória)
│
├── hooks/
│   ├── useAuth.ts           # Re-export de useAuth do AuthContext
│   ├── useTheme.ts          # Re-export de useTheme do ThemeContext
│   ├── usePolling.ts        # Polling genérico para atualizações periódicas
│   ├── useTemperatureTelemetry.ts # Telemetria de temperatura via API
│   └── useClientStatus.ts   # Status de clientes ativos/inativos
│
├── types/
│   └── index.ts             # Todas as interfaces e tipos do sistema
│
├── utils/
│   └── validators.ts        # Validações de email, senha, temperatura, etc.
│
└── config/
    └── constants.ts         # Chaves de sessão e tokens
```

---

## Contextos Globais

O estado da aplicação é gerenciado por contextos React, todos providos em `src/app/providers.tsx`:

### AuthContext
Gerencia a sessão do usuário. Persiste os dados do usuário logado no `sessionStorage` ou `localStorage` (quando "lembrar-me" está ativo), incluindo `role` e `selectedClientId` para Admin Master. O token JWT é armazenado separadamente. Expõe `login`, `logout`, `register`, `verify2FA` e `updateUser`.

### ClientContext
Gerencia a lista de clientes disponíveis e o cliente selecionado. Usado principalmente por Administradores Master para alternar entre clientes.

### RoomsContext
Mantém o estado de todas as salas (`rooms`) e o estado atual de cada dispositivo (`deviceStates`). **Filtra automaticamente as salas por cliente** baseado no usuário logado. Carrega dados via `salaService` (API). Expõe métodos para CRUD de salas, atualização de comandos via `sendCommand` e sincronização direta de estado via `syncDeviceState`.

### AutomationsContext
Mantém o estado global de todas as regras de automação. **Filtra automaticamente por cliente** através das salas do RoomsContext. Carrega e persiste dados via `automationService` (API). Expõe `toggleRule`, `createRule`, `updateRule`, `deleteRule` e `getRulesForRoom`.

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
  - Acesso total a todas as funcionalidades (Nodes, Usuários, Terminal MQTT, etc.)
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
- Gráficos de temperatura histórica por sala (via API)
- Seleção de data para visualização de histórico
- Indicadores de status (Normal / Atenção / Crítico)
- Alertas de conexão de dispositivos

### 🎛️ Controle de Dispositivos
- Ligar/Desligar ar-condicionado
- Ajuste de temperatura alvo (persistido via API)
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
- Comandos de diagnóstico e verificação de status
- Informações de firmware e última conexão

### 👥 Gerenciamento de Usuários (Admin)
- Criação de usuários com diferentes perfis
- Administradores Master podem criar outros Admin Masters
- Administradores Cliente não veem Admin Masters
- Alteração de perfil (promover/rebaixar)
- Exclusão de usuários

### 📡 Terminal MQTT (Admin Master)
- Monitoramento de mensagens MQTT em tempo real
- Publicação manual de mensagens para testes
- Visualização de status da conexão com o broker

---

## Lógica de Status de Temperatura

O status de cada sala (Normal / Atenção / Crítico) é calculado pela função `getIndicatorStatus` em `src/utils/validators.ts`, comparando a temperatura atual (`currentTemp`) com a temperatura alvo (`targetTemp`) definida pelo admin:

| Status | Condição |
|---|---|
| **Normal** | `\|currentTemp - targetTemp\| ≤ 0.5°C` |
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

## Integração com o Backend

O frontend consome a API REST do backend ClimaTech (FastAPI). A URL base é configurável via variável de ambiente:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Se não definida, o padrão é `http://localhost:8000/api/v1`.

### Endpoints principais

| Recurso | Endpoints |
|---|---|
| **Autenticação** | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh` |
| **Clientes** | `GET/POST /clientes`, `GET/PUT/DELETE /clientes/{id}`, ativar/desativar |
| **Salas** | `GET/POST /salas`, `GET/PUT/DELETE /salas/{id}`, `GET /salas/{id}/acs` |
| **Ar-condicionados** | `GET/PUT/DELETE /acs/{id}` |
| **Usuários** | `GET/POST /users`, `PUT /users/{id}/role`, `DELETE /users/{id}` |
| **Nodes** | `GET /nodes`, `GET/PUT/DELETE /nodes/{id}`, verificação de status |
| **Automações** | `GET/POST /automacoes`, `PUT/DELETE /automacoes/{id}`, toggle, estados |
| **Telemetria** | `GET /telemetry/last/{nodeId}`, histórico por sala |
| **IA** | `POST /chat` |
| **MQTT (admin)** | `GET /admin/mqtt/status`, `GET/POST /admin/mqtt/messages` |

### Camada de serviços

- **`apiService.ts`**: funções de baixo nível que chamam a API e tratam erros
- **`salaService.ts`**, **`clientService.ts`**, **`automationService.ts`**, etc.: camada de domínio com mapeamento de tipos e cache
- **`cacheService.ts`**: evita chamadas duplicadas com TTL de 5 minutos
- **`deviceService.ts`**: ainda mantém estado local para comandos de AC (ligar/desligar) — pendente integração completa com MQTT via backend

---

## Desenvolvimento

### Pré-requisitos

- Node.js 20+
- Backend ClimaTech rodando em `http://localhost:8000` (veja `backend-climatech/README.md`)

### Instalação e execução

```bash
# Instalar dependências
npm install

# (Opcional) Configurar URL da API
# Crie um arquivo .env.local com:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar build de produção
npm start

# Lint
npm run lint

# Executar testes
npm run test

# Testes em modo watch
npm run test:watch
```

A aplicação estará disponível em `http://localhost:3000`.

---

## Próximos Passos

- [x] Integração com backend real (API REST)
- [x] Autenticação JWT com refresh token
- [x] CRUD de clientes, salas, usuários, nodes e automações via API
- [x] Telemetria de temperatura via API
- [x] Terminal MQTT para diagnóstico (admin)
- [x] Assistente IA integrado ao backend
- [ ] Comandos de AC (ligar/desligar, modo, ventilador) via backend/MQTT
- [ ] WebSocket ou SSE para atualizações em tempo real (substituir polling)
- [ ] Modo ao vivo coordenado via backend (atualmente em memória no frontend)
- [ ] Sistema de notificações push
- [ ] Relatórios e exportação de dados
- [ ] Aplicativo mobile (React Native)
