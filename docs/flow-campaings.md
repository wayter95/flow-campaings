# Flow Campaigns — Documentacao da Plataforma

## Visao geral

Flow Campaigns e uma plataforma SaaS de Email Marketing e Marketing Automation que permite empresas capturar leads, segmentar contatos e enviar campanhas de email manualmente ou atraves de automacoes.

A plataforma permite criar fluxos automatizados de comunicacao com leads, integrando landing pages, formularios e campanhas de email em um unico sistema.

O objetivo e oferecer uma solucao simples e escalavel semelhante a ferramentas modernas de marketing automation.

## Objetivos do sistema

A plataforma deve permitir que usuarios:

- Capturem leads atraves de formularios
- Gerenciem contatos
- Segmentem contatos
- Enviem campanhas de email
- Criem automacoes de marketing
- Integrem landing pages
- Enviem emails via SendGrid
- Acompanhem metricas de campanhas

## Stack tecnologica

A aplicacao sera construida utilizando uma arquitetura moderna baseada em:

### Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- React

### Backend

- Next.js Server Actions / API routes
- Prisma ORM
- PostgreSQL

### Autenticacao

- NextAuth

### Infraestrutura de email

- SendGrid API

### Bibliotecas auxiliares recomendadas

- React Hook Form
- Zod (validacao)
- TanStack Table
- Lucide Icons
- shadcn/ui

## Arquitetura da aplicacao

A aplicacao segue uma arquitetura modular baseada em:

- Separacao de dominio
- Servicos reutilizaveis
- Componentes reutilizaveis
- Camadas claras de dados e UI

### Camadas da aplicacao

#### Interface (UI)

Componentes visuais reutilizaveis.

Responsavel por:

- Dashboards
- Formularios
- Tabelas
- Builders visuais
- Paginas do sistema

#### Services

Responsaveis pela logica de negocio:

- Campanhas
- Contatos
- Automacoes
- Envio de emails

#### Database

Gerenciado via Prisma ORM com PostgreSQL.

#### Integracoes externas

- SendGrid (envio de emails)

## Estrutura de pastas recomendada

```
src
├── app
│   ├── dashboard
│   ├── campaigns
│   ├── automations
│   ├── contacts
│   ├── forms
│   └── settings
│
├── components
│   ├── ui
│   ├── dashboard
│   ├── campaigns
│   ├── contacts
│   ├── automation
│   └── forms
│
├── services
│   ├── email
│   ├── campaigns
│   ├── contacts
│   └── automation
│
├── lib
│   ├── prisma
│   ├── auth
│   └── sendgrid
│
├── hooks
└── utils

prisma
└── schema.prisma
```

## Modulos principais da plataforma

### 1. Autenticacao

Gerenciado por NextAuth.

Funcionalidades:

- Login
- Registro
- Sessao de usuario
- Protecao de rotas

### 2. Contatos (Contacts)

Responsavel por armazenar e gerenciar leads.

Cada contato pode ter:

- Nome
- Email
- Campos personalizados
- Tags
- Historico de atividades
- Origem do lead

Funcionalidades:

- Criar contato
- Editar contato
- Adicionar tags
- Segmentar contatos
- Visualizar historico

### 3. Formularios (Lead Capture)

Permite capturar leads de landing pages.

Usuarios podem:

- Criar formularios personalizados
- Definir campos
- Integrar formulario em landing pages

Exemplo de fluxo:

```
Landing Page
    ↓
Formulario enviado
    ↓
Lead criado
    ↓
Trigger de automacao
```

### 4. Segmentacao

Permite criar grupos de contatos com base em regras.

Exemplos:

- Contatos com tag "cliente"
- Contatos criados nos ultimos 7 dias
- Contatos que abriram uma campanha

### 5. Campanhas de Email

Permite criar e enviar emails para contatos ou segmentos.

Funcionalidades:

- Criar campanha
- Editor de email
- Selecionar audiencia
- Agendar envio
- Envio manual

Metricas:

- Abertura
- Cliques
- Bounces
- Unsubscribe

### 6. Automacao de Marketing

Sistema de automacoes baseado em fluxo.

Usuarios podem criar fluxos como:

```
Trigger → Novo lead
    ↓
Enviar email de boas-vindas
    ↓
Esperar 2 dias
    ↓
Enviar follow-up
```

Tipos de nodes:

- **Trigger** — novo lead, tag adicionada, formulario enviado
- **Actions** — enviar email, adicionar tag, remover tag
- **Conditions** — if / else
- **Delay** — esperar X tempo

### 7. Integracao de Email

A plataforma utiliza SendGrid para envio de emails.

Responsabilidades:

- Envio de campanhas
- Tracking de aberturas
- Tracking de cliques
- Gerenciamento de bounces

## Fluxo de dados da plataforma

```
Landing Page
    ↓
Formulario enviado
    ↓
Lead criado
    ↓
Contato armazenado
    ↓
Trigger de automacao
    ↓
Email enviado via SendGrid
    ↓
Evento registrado
```

## Banco de dados (modelo conceitual)

Principais entidades:

| Entidade | Descricao |
|---|---|
| **User** | Usuario da plataforma |
| **Contact** | Lead ou contato |
| **Tag** | Etiqueta associada ao contato |
| **Segment** | Grupo de contatos baseado em regras |
| **Campaign** | Campanha de email |
| **Email** | Conteudo do email |
| **Automation** | Fluxo de automacao |
| **AutomationStep** | Passos da automacao |
| **Form** | Formulario de captura |
| **FormField** | Campos do formulario |
| **LeadSubmission** | Registro de envio de formulario |
| **EmailLog** | Registro de envios de email |

## Interface do sistema

A interface deve seguir o padrao de dashboards SaaS modernos.

### Layout

**Sidebar:**

- Dashboard
- Contacts
- Campaigns
- Automations
- Forms
- Settings

**Main content:**

- Metricas
- Tabelas
- Visualizacoes

### Dashboard

Exibir metricas principais:

- Total de contatos
- Campanhas enviadas
- Taxa de abertura
- Taxa de cliques
- Automacoes ativas

### Design da interface

Diretrizes de design:

- UI minimalista
- Cards com bordas arredondadas
- Sombras suaves
- Layout limpo
- Tipografia clara

Stack visual:

- TailwindCSS
- shadcn/ui
- Lucide icons

## Escalabilidade futura

Funcionalidades que podem ser adicionadas posteriormente:

- Editor visual de automacao
- CRM completo
- Integracao com ecommerce
- SMS marketing
- AI para geracao de emails
- Analytics avancado
- Webhooks e API publica

## Objetivo do MVP

A primeira versao deve incluir:

- Autenticacao
- Contatos
- Formularios
- Campanhas
- Envio de emails
- Automacoes simples
