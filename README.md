# SGE-RBAC — Sistema de Gestão de Expedientes com Controle de Acesso Baseado em Papéis

![Versão](https://img.shields.io/badge/vers%C3%A3o-1.0.0-blue.svg)
![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)
![Node.js](https://img.shields.io/badge/Node.js-v24.x-brightgreen.svg)
![Plataforma](https://img.shields.io/badge/Plataforma-Web-orange.svg)

O **SGE-RBAC** é uma solução de software desenvolvida no âmbito da disciplina de **Engenharia de Software** para automatizar o ciclo de vida completo de documentos e processos administrativos (entrada, tramitação, pareceres técnicos, despacho decisório e arquivamento final).

O sistema garante **integridade**, **rastreabilidade** e **confidencialidade** da informação através de um mecanismo estrito de **Controle de Acesso Baseado em Papéis (RBAC - Role-Based Access Control)** e **Auditoria Imutável**.

---

## 🚀 Funcionalidades Principais

- 🔐 **Gestão de Utilizadores e Autenticação Segura**:
  - Autenticação via JSON Web Tokens (JWT) e encriptação de senhas com `bcrypt`.
  - Gestão de contas de utilizadores (Criar, Editar, Ativar/Desativar, Mudar Senha).
- 🛡️ **Controle de Acesso Baseado em Papéis (RBAC)**:
  - Perfis nativos predefinidos: **Administrador**, **Chefe de Secretaria / Gestor**, **Técnico Tramitador** e **Consultor / Leitor**.
  - Matriz visual interativa de permissões atribuídas a cada perfil.
- 📁 **Gestão Dinâmica do Ciclo de Vida de Expedientes**:
  - Geração automática de NUP (Número Único de Processo: ex. `EXP-2026-0001`).
  - Classificação por Nível de Confidencialidade (*Público*, *Reservado*, *Confidencial*) e Prioridade (*Baixa*, *Média*, *Alta*, *Urgente*).
  - Tramitação/Encaminhamento encadeado entre setores com registo obrigatório de pareceres.
  - Assinatura e emissão de Despachos Decisórios (*Deferido*, *Indeferido*, *Informação Adicional*).
  - Arquivamento definitivo com código de localização física/digital.
- 📊 **Auditoria e Relatórios Executivos**:
  - Registo em tempo real de todas as operações (Quem, O quê, Quando, IP, Estado).
  - Dashboard interativo com gráficos estatísticos (Chart.js).
  - Exportação dos registos de auditoria em formato CSV e relatórios.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, `cors`.
- **Banco de Dados**: SQLite3 (armazenamento persistente relacional leve em ficheiro JSON/SQLite).
- **Frontend**: HTML5 Semântico, CSS3 Moderno (Glassmorphic Design, variáveis CSS, suporte nativo a Tema Claro/Escuro), JavaScript ES6+ Modular SPA.
- **Gráficos e Ícones**: Chart.js, Remixicon CDN.

---

## 👥 Equipe de Desenvolvimento e Atribuições

O projeto **SGE-RBAC** foi desenvolvido em colaboração pela dupla de estudantes, do 3 ano de Engenharia de Software:

- 👨‍💻 **Abreu Martinho Pedro** (*Desenvolvedor A — Frontend & UI* | GitHub: [`AbreuPedro-Dev`](https://github.com/AbreuPedro-Dev)):

  - **Responsabilidades:** Desenvolvimento da SPA ([public/index.html](<file:///c:/Users/user/Desktop/Testes%20de%20Projetos/Aluno%201/public/index.html>)), interface visual da matriz de permissões RBAC ([public/js/app.js](<file:///c:/Users/user/Desktop/Testes%20de%20Projetos/Aluno%201/public/js/app.js>)), estilos Glassmorphic e temas ([public/css/style.css](<file:///c:/Users/user/Desktop/Testes%20de%20Projetos/Aluno%201/public/css/style.css>)).
  - **Branch de Trabalho:** `feature/frontend-rbac-ui`
- 🛠️ **Paulo José Massingue Júnior** (*Desenvolvedor B — Backend & API* | GitHub: [`Paulo-Junior97`](https://github.com/Paulo-Junior97)):

  - **Responsabilidades:** Implementação do servidor Node.js/Express ([server.js](<file:///c:/Users/user/Desktop/Testes%20de%20Projetos/Aluno%201/server.js>)), endpoints da API REST (`/api/auth`, `/api/expedientes`, `/api/auditoria`), segurança JWT, encriptação `bcrypt` e persistência de dados.
  - **Branch de Trabalho:** `feature/backend-api-expedientes`

---

## 📑 Credenciais Padrão de Demonstração

O sistema já vem pre-populado com 4 contas de teste representando cada um dos perfis de acesso do RBAC:

| Perfil RBAC                   | E-mail de Acesso       | Palavra-passe   | Nível de Permissão                          |
| :---------------------------- | :--------------------- | :-------------- | :-------------------------------------------- |
| **Administrador**       | `admin@sge.gov.mz`   | `Admin123!`   | Acesso Total (Gerir Users, RBAC, Auditoria)   |
| **Chefe / Gestor**      | `gestor@sge.gov.mz`  | `Gestor123!`  | Criar, Despachar, Arquivar, Ver Confidenciais |
| **Técnico Tramitador** | `tecnico@sge.gov.mz` | `Tecnico123!` | Consultar, Tramitar, Emitir Pareceres         |
| **Consultor / Leitor**  | `leitor@sge.gov.mz`  | `Leitor123!`  | Acesso Somente Leitura a Processos Públicos  |

---

## 🔧 Configuração e Execução do Projecto

### Pré-requisitos

- Node.js instalado (Versão 18.x, 20.x ou 24.x).
- Gerenciador de pacotes `npm`.

### Passos de Instalação

1. **Clonar o repositório público do GitHub**:

   ```bash
   git clone git@github.com:AbreuPedro-Dev/SGE-RBAC-Sistema-de-Gestao-de-Expedientes.git
   cd SGE-RBAC-Sistema-de-Gestao-de-Expedientes
   ```
2. **Instalar as dependências**:

   ```bash
   npm install
   ```
3. **Iniciar a aplicação**:

   ```bash
   npm start
   ```

   *Ou em modo de desenvolvimento com hot-reload:*

   ```bash
   npm run dev
   ```
4. **Aceder à aplicação no navegador**:
   Abra o seu navegador web e aceda ao endereço:
   👉 **`http://localhost:3000`**

---

## 📂 Estrutura de Pastas do Projecto

```
SGE-RBAC/
├── data/
│   └── database.json          # Ficheiro de persistência de dados SQLite/JSON
├── docs/
│   └── DOCUMENTACAO_TECNICA.md # Documentação Técnica e Académica completa
├── public/
│   ├── css/
│   │   └── style.css          # Design System Glassmorphism & Responsividade
│   ├── js/
│   │   └── app.js             # Controlador Frontend SPA e Regras RBAC
│   └── index.html             # Interface da Aplicação Single Page
├── src/
│   ├── database/
│   │   └── db.js              # Camada de Persistência e Dados Iniciais
│   └── middleware/
│       └── auth.js            # Middleware de Autenticação JWT e RBAC Check
├── server.js                  # Servidor Express e Rotas da API REST
├── package.json               # Ficheiro de Configuração de Dependências
└── README.md                  # Manual do Utilizador e Instruções
```

---

## 🛰️ Documentação da API RESTful

### Autenticação & Perfil

- `POST /api/auth/login` — Autentica utilizador e retorna Token JWT.
- `GET /api/auth/me` — Retorna dados do perfil autenticado e permissões.

### Expedientes

- `GET /api/expedientes` — Lista expedientes (Filtrados por perfil RBAC).
- `GET /api/expedientes/:id` — Retorna detalhes completos e linha do tempo de tramitações.
- `POST /api/expedientes` — Cria novo expediente (*Requer permissão `expediente:create`*).
- `POST /api/expedientes/:id/tramitar` — Tramita expediente para novo setor (*Requer `expediente:tramitar`*).
- `POST /api/expedientes/:id/despachar` — Assina e emite despacho decisório (*Requer `expediente:despachar`*).
- `POST /api/expedientes/:id/arquivar` — Arquiva expediente (*Requer `expediente:arquivar`*).

### Administração & RBAC

- `GET /api/users` — Lista todos os utilizadores (*Requer `users:manage`*).
- `POST /api/users` — Regista novo utilizador (*Requer `users:manage`*).
- `PUT /api/users/:id` — Atualiza utilizador existente (*Requer `users:manage`*).
- `GET /api/roles` — Obtém lista de perfis e permissões.
- `PUT /api/roles/:id/permissions` — Altera matriz RBAC (*Requer `rbac:manage`*).
- `GET /api/audit-logs` — Obtém logs de auditoria imutáveis (*Requer `audit:view`*).
- `GET /api/stats` — Métricas estatísticas do Dashboard.

---

## 👥 Entrega do Trabalho em Grupo

- **Disciplina**: Engenharia de Software
- **Integrantes da Dupla**:
  1. Estudante 1: Abreu Pedro (`AbreuPedro-Dev`)
  2. Estudante 2: Paulo Júnior (`Paulo-Junior97`)
- **Link do Repositório GitHub**: [https://github.com/AbreuPedro-Dev/SGE-RBAC-Sistema-de-Gestao-de-Expedientes](https://github.com/AbreuPedro-Dev/SGE-RBAC-Sistema-de-Gestao-de-Expedientes)

> **Nota**: Ambos os estudantes do grupo submeteram o relatório na sala virtual e possuem histórico ativo de *commits* verificável no repositório GitHub acima.
