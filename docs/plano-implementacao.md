# Flow Campaigns — Plano de Implementacao

## Visao geral das fases

| Fase       | Escopo                                                                   | Dependencias |
| ---------- | ------------------------------------------------------------------------ | ------------ |
| **Fase 1** | Base do projeto, Auth, Contatos, Formularios, Campanhas com envio basico | Nenhuma      |
| **Fase 2** | Segmentacao, metricas, dashboard completo                                | Fase 1       |
| **Fase 3** | Automacoes simples (sem visual builder)                                  | Fase 2       |
| **Fase 4** | Automation flow builder visual                                           | Fase 3       |

---

## Fase 1 — Fundacao e MVP

Objetivo: Ter a base funcional da plataforma com autenticacao, gestao de contatos, captura de leads e envio basico de campanhas.

### 1.1 Setup do projeto

- [x] Inicializar Next.js com App Router e TypeScript
- [ ] Configurar TailwindCSS com tema customizado (cores, fontes, espacamentos)
- [ ] Configurar ESLint e Prettier
- [ ] Instalar e configurar shadcn/ui como biblioteca de componentes base
- [ ] Configurar variaveis de ambiente (`.env.local`)
- [ ] Criar estrutura de pastas conforme arquitetura definida

Estrutura de pastas a criar:

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Layout com sidebar
│   │   ├── page.tsx            # Dashboard home
│   │   ├── contacts/
│   │   ├── campaigns/
│   │   ├── forms/
│   │   └── settings/
│   └── api/
│       └── auth/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Sidebar, Header, etc.
│   ├── contacts/
│   ├── campaigns/
│   └── forms/
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # NextAuth config
│   └── sendgrid.ts             # SendGrid client
├── services/
│   ├── contacts.ts
│   ├── campaigns.ts
│   └── forms.ts
├── hooks/
├── types/
└── utils/
```

### 1.2 Banco de dados e Prisma

- [ ] Configurar PostgreSQL (local ou via Docker)
- [ ] Instalar Prisma e inicializar (`npx prisma init`)
- [ ] Criar schema inicial com os seguintes models:

**Models da Fase 1:**

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String
  workspaces    WorkspaceMember[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Workspace {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  members       WorkspaceMember[]
  contacts      Contact[]
  campaigns     Campaign[]
  forms         Form[]
  tags          Tag[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model WorkspaceMember {
  id            String    @id @default(cuid())
  role          String    @default("owner")  // owner, admin, member
  user          User      @relation(fields: [userId], references: [id])
  userId        String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  createdAt     DateTime  @default(now())

  @@unique([userId, workspaceId])
}

model Contact {
  id            String    @id @default(cuid())
  email         String
  firstName     String?
  lastName      String?
  customFields  Json?
  source        String?               // form, manual, import
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  tags          ContactTag[]
  submissions   LeadSubmission[]
  emailLogs     EmailLog[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([email, workspaceId])
}

model Tag {
  id            String    @id @default(cuid())
  name          String
  color         String?
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  contacts      ContactTag[]
  createdAt     DateTime  @default(now())

  @@unique([name, workspaceId])
}

model ContactTag {
  id            String    @id @default(cuid())
  contact       Contact   @relation(fields: [contactId], references: [id])
  contactId     String
  tag           Tag       @relation(fields: [tagId], references: [id])
  tagId         String
  createdAt     DateTime  @default(now())

  @@unique([contactId, tagId])
}

model Campaign {
  id            String    @id @default(cuid())
  name          String
  subject       String?
  htmlContent   String?   @db.Text
  status        String    @default("draft")  // draft, scheduled, sending, sent
  scheduledAt   DateTime?
  sentAt        DateTime?
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  emailLogs     EmailLog[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model EmailLog {
  id            String    @id @default(cuid())
  status        String    @default("queued")  // queued, sent, delivered, opened, clicked, bounced
  sentAt        DateTime?
  openedAt      DateTime?
  clickedAt     DateTime?
  campaign      Campaign  @relation(fields: [campaignId], references: [id])
  campaignId    String
  contact       Contact   @relation(fields: [contactId], references: [id])
  contactId     String
  createdAt     DateTime  @default(now())
}

model Form {
  id            String    @id @default(cuid())
  name          String
  description   String?
  status        String    @default("active")  // active, inactive
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  fields        FormField[]
  submissions   LeadSubmission[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model FormField {
  id            String    @id @default(cuid())
  label         String
  type          String    @default("text")  // text, email, number, select, textarea
  required      Boolean   @default(false)
  options       Json?                       // para select: ["opt1", "opt2"]
  order         Int       @default(0)
  form          Form      @relation(fields: [formId], references: [id], onDelete: Cascade)
  formId        String
}

model LeadSubmission {
  id            String    @id @default(cuid())
  data          Json
  form          Form      @relation(fields: [formId], references: [id])
  formId        String
  contact       Contact?  @relation(fields: [contactId], references: [id])
  contactId     String?
  createdAt     DateTime  @default(now())
}
```

- [ ] Rodar primeira migration (`npx prisma migrate dev`)
- [ ] Criar seed basico com usuario e workspace de teste

### 1.3 Autenticacao (NextAuth)

- [ ] Instalar NextAuth v5 (Auth.js)
- [ ] Configurar provider de credenciais (email + senha)
- [ ] Implementar pagina de login (`/login`)
- [ ] Implementar pagina de registro (`/register`)
- [ ] Hash de senha com bcrypt
- [ ] Middleware de protecao de rotas (redirecionar para login se nao autenticado)
- [ ] Criar workspace automaticamente no registro do usuario
- [ ] Armazenar `workspaceId` na sessao do usuario
- [ ] Implementar logout

### 1.4 Layout do dashboard

- [ ] Criar layout base com sidebar fixa
- [ ] Sidebar com navegacao: Dashboard, Contacts, Campaigns, Forms, Settings
- [ ] Header com nome do workspace e avatar do usuario
- [ ] Componente de navegacao ativa (highlight na pagina atual)
- [ ] Layout responsivo (sidebar colapsavel em mobile)
- [ ] Pagina inicial do dashboard com placeholder de metricas

### 1.5 Modulo de Contatos

**Server Actions:**

- [ ] `createContact(data)` — criar contato
- [ ] `updateContact(id, data)` — editar contato
- [ ] `deleteContact(id)` — remover contato
- [ ] `getContacts(workspaceId, filters)` — listar contatos com paginacao
- [ ] `getContact(id)` — detalhe do contato

**Paginas e componentes:**

- [ ] Pagina de listagem de contatos (`/contacts`)
  - Tabela com colunas: nome, email, tags, data de criacao
  - Busca por nome/email
  - Paginacao
  - Botao de adicionar contato
- [ ] Modal/pagina de criacao de contato
  - Formulario com: nome, sobrenome, email, campos customizados
  - Validacao com Zod
- [ ] Pagina de detalhe do contato (`/contacts/[id]`)
  - Dados do contato
  - Tags associadas
  - Historico de atividades (placeholder para Fase 2)
- [ ] Gerenciamento de tags
  - Criar tag
  - Associar/remover tag de contato

### 1.6 Modulo de Formularios

**Server Actions:**

- [ ] `createForm(data)` — criar formulario
- [ ] `updateForm(id, data)` — editar formulario
- [ ] `deleteForm(id)` — remover formulario
- [ ] `getForms(workspaceId)` — listar formularios
- [ ] `submitForm(formId, data)` — endpoint publico para receber submissions

**Paginas e componentes:**

- [ ] Pagina de listagem de formularios (`/forms`)
  - Lista de formularios com nome, status, total de submissions
- [ ] Pagina de criacao/edicao de formulario (`/forms/new`, `/forms/[id]/edit`)
  - Adicionar campos (text, email, number, select, textarea)
  - Ordenar campos (drag and drop simples ou botoes up/down)
  - Definir campo como obrigatorio
  - Preview do formulario
- [ ] Pagina de submissions (`/forms/[id]/submissions`)
  - Tabela com dados submetidos
- [ ] API route publica para receber submissions (`/api/forms/[id]/submit`)
  - Validar dados conforme campos definidos
  - Criar contato automaticamente se email nao existe
  - Registrar LeadSubmission
- [ ] Gerar codigo de embed (HTML snippet) para copiar e colar em landing pages

### 1.7 Modulo de Campanhas (envio basico)

**Server Actions:**

- [ ] `createCampaign(data)` — criar campanha
- [ ] `updateCampaign(id, data)` — editar campanha
- [ ] `deleteCampaign(id)` — remover campanha
- [ ] `getCampaigns(workspaceId)` — listar campanhas
- [ ] `sendCampaign(id)` — enviar campanha para todos os contatos

**Paginas e componentes:**

- [ ] Pagina de listagem de campanhas (`/campaigns`)
  - Tabela com nome, status, data de envio
- [ ] Pagina de criacao de campanha (`/campaigns/new`)
  - Nome da campanha
  - Assunto do email
  - Editor de conteudo HTML (textarea simples nesta fase)
  - Selecao de audiencia: todos os contatos (segmentos vem na Fase 2)
- [ ] Pagina de detalhe da campanha (`/campaigns/[id]`)
  - Status da campanha
  - Preview do email
  - Botao de enviar
  - Metricas basicas (total enviado, placeholder para opens/clicks)

### 1.8 Integracao SendGrid

- [ ] Criar conta no SendGrid e obter API key
- [ ] Configurar verificacao de dominio/remetente
- [ ] Criar servico `lib/sendgrid.ts` com funcoes:
  - `sendEmail({ to, subject, html })` — envio individual
  - `sendBulkEmails(emails[])` — envio em lote
- [ ] Implementar envio real na action `sendCampaign`
  - Buscar todos os contatos do workspace
  - Criar EmailLog para cada contato
  - Enviar via SendGrid
  - Atualizar status do EmailLog

### Entregavel da Fase 1

Ao final desta fase, a plataforma deve permitir:

- Criar conta e fazer login
- Gerenciar contatos manualmente
- Criar formularios e receber leads
- Criar campanhas e enviar emails para todos os contatos

---

## Fase 2 — Segmentacao, Metricas e Dashboard

Objetivo: Adicionar segmentacao inteligente de contatos, tracking de emails e um dashboard com metricas reais.

### 2.1 Modelo de Segmentos

- [ ] Adicionar model `Segment` ao Prisma schema:

```prisma
model Segment {
  id            String    @id @default(cuid())
  name          String
  rules         Json      // array de regras de filtragem
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  campaigns     CampaignSegment[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model CampaignSegment {
  id            String    @id @default(cuid())
  campaign      Campaign  @relation(fields: [campaignId], references: [id])
  campaignId    String
  segment       Segment   @relation(fields: [segmentId], references: [id])
  segmentId     String

  @@unique([campaignId, segmentId])
}
```

- [ ] Rodar migration

### 2.2 Motor de segmentacao

- [ ] Definir formato de regras (JSON):

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "tag", "op": "contains", "value": "cliente" },
    { "field": "createdAt", "op": "after", "value": "2024-01-01" }
  ]
}
```

- [ ] Criar servico `services/segments.ts`:
  - `evaluateSegment(segmentId)` — retorna lista de contatos que atendem as regras
  - `getSegmentCount(segmentId)` — retorna contagem
- [ ] Campos suportados para regras:
  - `tag` — contem/nao contem tag
  - `createdAt` — antes/depois de data
  - `source` — origem do lead (form, manual, import)
  - `email` — contem/nao contem texto
  - `customFields` — valor de campo customizado
  - `campaignActivity` — abriu/clicou campanha X

### 2.3 Paginas de segmentacao

- [ ] Pagina de listagem de segmentos (`/segments`)
- [ ] Pagina de criacao de segmento (`/segments/new`)
  - Builder de regras visual (adicionar condicoes, escolher campo, operador, valor)
  - Preview em tempo real (quantos contatos atendem)
- [ ] Integrar segmentos na criacao de campanhas
  - Selecionar "enviar para segmento" ao inves de "todos os contatos"

### 2.4 Tracking de emails (webhooks SendGrid)

- [ ] Criar API route para receber webhooks do SendGrid (`/api/webhooks/sendgrid`)
- [ ] Processar eventos:
  - `delivered` — atualizar EmailLog.status
  - `open` — registrar EmailLog.openedAt
  - `click` — registrar EmailLog.clickedAt
  - `bounce` — registrar bounce
  - `unsubscribe` — marcar contato como unsubscribed
- [ ] Validar assinatura do webhook (seguranca)
- [ ] Adicionar campo `unsubscribed` ao model Contact

### 2.5 Historico de atividades do contato

- [ ] Criar model `ActivityLog`:

```prisma
model ActivityLog {
  id            String    @id @default(cuid())
  type          String    // email_sent, email_opened, email_clicked, form_submitted, tag_added, tag_removed
  metadata      Json?
  contact       Contact   @relation(fields: [contactId], references: [id])
  contactId     String
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  createdAt     DateTime  @default(now())
}
```

- [ ] Registrar atividades automaticamente:
  - Quando email e enviado
  - Quando email e aberto/clicado
  - Quando formulario e enviado
  - Quando tag e adicionada/removida
- [ ] Exibir timeline de atividades na pagina de detalhe do contato

### 2.6 Dashboard com metricas reais

- [ ] Criar servico `services/analytics.ts`:
  - `getDashboardMetrics(workspaceId)` — retorna metricas agregadas
- [ ] Metricas a exibir:
  - Total de contatos
  - Novos contatos (ultimos 7/30 dias)
  - Campanhas enviadas
  - Taxa de abertura media
  - Taxa de cliques media
  - Contatos por fonte (grafico)
  - Atividade recente (timeline)
- [ ] Componentes do dashboard:
  - Cards de metricas (stat cards)
  - Grafico de contatos ao longo do tempo (usar Recharts ou Chart.js)
  - Lista de atividade recente
  - Campanhas recentes com status
- [ ] Pagina de metricas da campanha (`/campaigns/[id]`)
  - Total enviado
  - Taxa de abertura
  - Taxa de cliques
  - Taxa de bounce
  - Lista de contatos que abriram/clicaram

### 2.7 Agendamento de campanhas

- [ ] Implementar campo `scheduledAt` na criacao de campanha
- [ ] Criar cron job ou background task para verificar campanhas agendadas
  - Opcao simples: API route chamada por cron externo (Vercel Cron ou similar)
  - Verificar campanhas com `status = scheduled` e `scheduledAt <= now()`
  - Enviar automaticamente
- [ ] Atualizar UI para permitir agendar envio

### 2.8 Importacao de contatos

- [ ] Criar funcionalidade de import via CSV
- [ ] Pagina de importacao (`/contacts/import`)
  - Upload de arquivo CSV
  - Mapeamento de colunas (qual coluna = qual campo)
  - Preview dos dados
  - Confirmacao e importacao
- [ ] Tratar duplicatas (contato com mesmo email no workspace)

### Entregavel da Fase 2

Ao final desta fase, a plataforma deve permitir:

- Segmentar contatos com regras
- Enviar campanhas para segmentos especificos
- Ver metricas reais de abertura e cliques
- Dashboard funcional com dados reais
- Agendar campanhas para envio futuro
- Importar contatos via CSV

---

## Fase 3 — Automacoes Simples

Objetivo: Permitir criar automacoes de marketing baseadas em triggers, sem interface visual de drag and drop.

### 3.1 Models de automacao

- [ ] Adicionar models ao Prisma schema:

```prisma
model Automation {
  id            String    @id @default(cuid())
  name          String
  status        String    @default("inactive")  // active, inactive, paused
  trigger       Json      // { type: "form_submitted", formId: "xxx" }
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  steps         AutomationStep[]
  enrollments   AutomationEnrollment[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AutomationStep {
  id            String    @id @default(cuid())
  type          String    // send_email, add_tag, remove_tag, delay, condition
  config        Json      // configuracao especifica do step
  order         Int
  automation    Automation @relation(fields: [automationId], references: [id], onDelete: Cascade)
  automationId  String
}

model AutomationEnrollment {
  id            String    @id @default(cuid())
  status        String    @default("active")  // active, completed, paused, failed
  currentStep   Int       @default(0)
  nextRunAt     DateTime?
  contact       Contact   @relation(fields: [contactId], references: [id])
  contactId     String
  automation    Automation @relation(fields: [automationId], references: [id])
  automationId  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([contactId, automationId])
}
```

- [ ] Rodar migration

### 3.2 Tipos de triggers

- [ ] `form_submitted` — quando um formulario especifico recebe submission
  - Config: `{ formId: "xxx" }`
- [ ] `tag_added` — quando uma tag e adicionada a um contato
  - Config: `{ tagId: "xxx" }`
- [ ] `contact_created` — quando um contato e criado
  - Config: `{}`
- [ ] `manual` — enrollment manual pelo usuario
  - Config: `{}`

### 3.3 Tipos de steps

- [ ] `send_email` — enviar email
  - Config: `{ subject: "...", htmlContent: "..." }`
- [ ] `delay` — esperar X tempo
  - Config: `{ duration: 2, unit: "days" }` (minutes, hours, days)
- [ ] `add_tag` — adicionar tag ao contato
  - Config: `{ tagId: "xxx" }`
- [ ] `remove_tag` — remover tag do contato
  - Config: `{ tagId: "xxx" }`
- [ ] `condition` — if/else baseado em regra
  - Config: `{ condition: { field: "tag", op: "contains", value: "xxx" }, trueStep: 3, falseStep: 5 }`

### 3.4 Motor de execucao de automacoes

- [ ] Criar servico `services/automation-engine.ts`:
  - `enrollContact(automationId, contactId)` — inscrever contato na automacao
  - `processStep(enrollmentId)` — executar proximo step
  - `processDelayedSteps()` — verificar e executar steps com delay vencido
- [ ] Logica de execucao:
  1. Contato e inscrito → cria `AutomationEnrollment`
  2. Processa step atual:
     - `send_email` → envia email via SendGrid, avanca para proximo step
     - `delay` → calcula `nextRunAt`, salva e aguarda
     - `add_tag` / `remove_tag` → executa e avanca
     - `condition` → avalia regra, pula para `trueStep` ou `falseStep`
  3. Se nao ha proximo step → marca enrollment como `completed`
- [ ] Criar cron job para processar delays:
  - API route chamada a cada 1 minuto
  - Busca enrollments com `nextRunAt <= now()` e `status = active`
  - Processa proximo step de cada um

### 3.5 Dispatch de triggers

- [ ] Criar servico `services/automation-triggers.ts`:
  - `dispatchTrigger(type, payload, workspaceId)`
- [ ] Integrar dispatch nos pontos corretos:
  - Submission de formulario → dispatch `form_submitted`
  - Criacao de contato → dispatch `contact_created`
  - Adicao de tag → dispatch `tag_added`
- [ ] Buscar automacoes ativas que correspondem ao trigger
- [ ] Inscrever contato nas automacoes encontradas

### 3.6 Paginas de automacao

- [ ] Pagina de listagem de automacoes (`/automations`)
  - Nome, status, total de contatos inscritos, data de criacao
- [ ] Pagina de criacao de automacao (`/automations/new`)
  - Nome da automacao
  - Selecao de trigger (tipo + configuracao)
  - Lista ordenada de steps (adicionar, remover, reordenar)
  - Para cada step: selecionar tipo e preencher configuracao
  - Interface de lista simples (nao visual/drag-and-drop)
- [ ] Pagina de detalhe da automacao (`/automations/[id]`)
  - Status da automacao (ativar/desativar)
  - Visualizacao dos steps em formato de lista/timeline
  - Lista de contatos inscritos com status
  - Metricas: total inscritos, completados, ativos
- [ ] Pagina de edicao (`/automations/[id]/edit`)

### 3.7 Templates de email para automacao

- [ ] Criar model `EmailTemplate`:

```prisma
model EmailTemplate {
  id            String    @id @default(cuid())
  name          String
  subject       String
  htmlContent   String    @db.Text
  workspace     Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

- [ ] Pagina de templates (`/templates`)
- [ ] Usar templates nos steps de automacao e nas campanhas
- [ ] Suporte a variaveis basicas: `{{firstName}}`, `{{lastName}}`, `{{email}}`

### Entregavel da Fase 3

Ao final desta fase, a plataforma deve permitir:

- Criar automacoes com triggers e steps
- Inscricao automatica de contatos em automacoes
- Execucao de steps incluindo delays
- Envio automatico de emails por automacao
- Conditions basicas (if/else)
- Templates reutilizaveis de email

---

## Fase 4 — Automation Flow Builder Visual

Objetivo: Substituir a interface de lista por um editor visual de fluxos com drag and drop.

### 4.1 Escolha da biblioteca

- [ ] Avaliar e escolher biblioteca para o flow builder:
  - **React Flow** (reactflow.dev) — recomendada, madura, boa documentacao
  - Alternativa: xyflow
- [ ] Instalar e configurar no projeto
- [ ] Criar proof of concept basica

### 4.2 Componentes do flow builder

- [ ] Criar componente `FlowCanvas` — area principal do editor
- [ ] Criar componente `FlowSidebar` — painel lateral com nodes disponiveis
- [ ] Criar nodes customizados:
  - `TriggerNode` — node de trigger (cor verde)
  - `ActionNode` — node de acao (cor azul)
  - `DelayNode` — node de delay (cor amarela)
  - `ConditionNode` — node de condicao com 2 saidas: true/false (cor laranja)
- [ ] Criar edges customizadas (conexoes entre nodes)
- [ ] Implementar drag and drop da sidebar para o canvas
- [ ] Implementar conexao entre nodes (arrastar de saida para entrada)
- [ ] Implementar selecao de node com painel de configuracao

### 4.3 Painel de configuracao de nodes

Ao clicar em um node, abrir painel lateral com configuracao:

- [ ] **Trigger node:**
  - Selecao de tipo de trigger
  - Configuracao especifica (ex: selecionar formulario)
- [ ] **Action node — Send Email:**
  - Selecionar template ou criar conteudo inline
  - Assunto
  - Preview
- [ ] **Action node — Tag:**
  - Selecionar tag
  - Acao: adicionar ou remover
- [ ] **Delay node:**
  - Duracao (numero)
  - Unidade (minutos, horas, dias)
- [ ] **Condition node:**
  - Builder de condicao (campo, operador, valor)
  - Labels para saidas true/false

### 4.4 Serializacao e persistencia

- [ ] Definir formato de persistencia do fluxo:

```json
{
  "nodes": [
    {
      "id": "1",
      "type": "trigger",
      "position": { "x": 100, "y": 50 },
      "data": { "triggerType": "form_submitted", "formId": "xxx" }
    },
    {
      "id": "2",
      "type": "action",
      "position": { "x": 100, "y": 200 },
      "data": {
        "actionType": "send_email",
        "subject": "...",
        "htmlContent": "..."
      }
    }
  ],
  "edges": [{ "source": "1", "target": "2" }]
}
```

- [ ] Atualizar model `Automation` para armazenar layout do fluxo:

```prisma
model Automation {
  // ... campos existentes
  flowData      Json?     // nodes e edges do visual builder
}
```

- [ ] Criar funcao de conversao: `flowData` → `AutomationStep[]` (para o motor de execucao)
- [ ] Manter compatibilidade com automacoes criadas na Fase 3

### 4.5 Funcionalidades do editor

- [ ] Zoom in/out
- [ ] Pan (arrastar canvas)
- [ ] Minimap (visao geral do fluxo)
- [ ] Auto-layout (organizar nodes automaticamente)
- [ ] Undo/redo
- [ ] Salvar rascunho automaticamente
- [ ] Validacao do fluxo antes de ativar:
  - Deve ter exatamente 1 trigger
  - Todos os nodes devem estar conectados
  - Conditions devem ter ambas as saidas conectadas
- [ ] Botao de ativar/desativar automacao

### 4.6 Visualizacao de execucao

- [ ] Mostrar contagem de contatos em cada node
- [ ] Mostrar contatos "parados" em nodes de delay
- [ ] Highlight de nodes ativos vs inativos
- [ ] Metricas por node (emails enviados, abertos, etc)

### 4.7 Melhorias de UX

- [ ] Templates de automacao pre-prontos:
  - Welcome series (boas-vindas → delay → follow-up)
  - Re-engagement (inativo por X dias → email)
  - Post-purchase (compra → agradecimento → review)
- [ ] Duplicar automacao
- [ ] Historico de versoes da automacao

### Entregavel da Fase 4

Ao final desta fase, a plataforma deve permitir:

- Criar automacoes visualmente com drag and drop
- Conectar nodes com edges
- Configurar cada node via painel lateral
- Validar e ativar fluxos
- Visualizar execucao em tempo real
- Usar templates pre-prontos

---

## Dependencias e bibliotecas por fase

### Fase 1

| Pacote                      | Uso                   |
| --------------------------- | --------------------- |
| `next`                      | Framework             |
| `typescript`                | Tipagem               |
| `tailwindcss`               | Estilos               |
| `@shadcn/ui`                | Componentes UI        |
| `prisma` / `@prisma/client` | ORM                   |
| `next-auth`                 | Autenticacao          |
| `bcryptjs`                  | Hash de senhas        |
| `zod`                       | Validacao             |
| `react-hook-form`           | Formularios           |
| `@hookform/resolvers`       | Zod + React Hook Form |
| `@sendgrid/mail`            | Envio de emails       |
| `lucide-react`              | Icones                |

### Fase 2

| Pacote                                       | Uso               |
| -------------------------------------------- | ----------------- |
| `recharts` ou `chart.js` + `react-chartjs-2` | Graficos          |
| `papaparse`                                  | Parse de CSV      |
| `@tanstack/react-table`                      | Tabelas avancadas |

### Fase 3

Nenhuma dependencia nova — usa infraestrutura existente.

### Fase 4

| Pacote                       | Uso                 |
| ---------------------------- | ------------------- |
| `@xyflow/react` (React Flow) | Flow builder visual |

---

## Consideracoes tecnicas

### Multi-tenancy

- Todos os dados sao isolados por `workspaceId`
- Toda query ao banco deve filtrar por workspace
- Criar middleware/helper para injetar workspaceId automaticamente
- Nunca expor dados de um workspace para outro

### Seguranca

- Hash de senhas com bcrypt (salt rounds >= 10)
- Validacao de input com Zod em todas as server actions
- Rate limiting nos endpoints publicos (formularios, webhooks)
- CSRF protection via NextAuth
- Sanitizar HTML de emails para evitar XSS

### Performance

- Paginacao em todas as listagens
- Indices no banco para queries frequentes (email + workspaceId, etc)
- Envio de emails em background (nao bloquear a UI)
- Cache de metricas do dashboard (revalidar a cada X minutos)

### Observabilidade

- Logs estruturados para envio de emails
- Registro de erros de envio no EmailLog
- Metricas de automacao (contatos processados, falhas)
