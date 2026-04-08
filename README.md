# Aerrnova IT Tools

Sistema interno de gestão de equipamentos de TI e termos de responsabilidade.

## 📋 Descrição

Aplicação web para controle de inventário de equipamentos de TI, geração de termos de responsabilidade com assinatura digital, e gestão de devoluções. Desenvolvido para uso interno do departamento de TI.

## 🚀 Tecnologias

### Frontend
| Tecnologia | Versão | Descrição |
|---|---|---|
| **React** | 18.3 | Biblioteca principal de UI |
| **TypeScript** | 5.8 | Tipagem estática |
| **Vite** | 5.4 | Build tool e dev server |
| **Tailwind CSS** | 3.4 | Framework de estilos utilitários |
| **React Router DOM** | 6.30 | Roteamento SPA |
| **TanStack React Query** | 5.83 | Gerenciamento de estado assíncrono e cache |

### Componentes UI
| Biblioteca | Descrição |
|---|---|
| **shadcn/ui** | Componentes acessíveis baseados em Radix UI |
| **Radix UI** | Primitivas de UI sem estilo (Dialog, Select, Tabs, etc.) |
| **Lucide React** | Ícones SVG |
| **Recharts** | Gráficos e visualizações |
| **Sonner** | Notificações toast |
| **cmdk** | Componente de command palette |
| **Embla Carousel** | Carrossel de imagens |
| **Vaul** | Componente drawer |

### Backend (Supabase)
| Recurso | Descrição |
|---|---|
| **Supabase Auth** | Autenticação por e-mail/senha |
| **Supabase Database** | PostgreSQL com Row Level Security (RLS) |
| **Supabase JS SDK** | 2.101 — Cliente JavaScript para comunicação com o backend |

### Utilitários
| Biblioteca | Descrição |
|---|---|
| **date-fns** | Manipulação e formatação de datas |
| **Zod** | Validação de schemas |
| **React Hook Form** | Gerenciamento de formulários |
| **class-variance-authority** | Variantes de componentes CSS |
| **clsx / tailwind-merge** | Utilitários para classes CSS condicionais |
| **next-themes** | Suporte a dark/light mode |

### Desenvolvimento & Testes
| Ferramenta | Descrição |
|---|---|
| **Vitest** | Framework de testes unitários |
| **Playwright** | Testes end-to-end |
| **Testing Library** | Utilitários de teste para React |
| **ESLint** | Linting de código |
| **PostCSS / Autoprefixer** | Processamento de CSS |

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── AppLayout.tsx    # Layout principal com sidebar
│   ├── AppSidebar.tsx   # Navegação lateral
│   ├── TermPreviewDialog.tsx  # Visualização/impressão do termo
│   ├── AnalystSignDialog.tsx  # Assinatura do analista
│   └── ReturnEquipmentDialog.tsx  # Devolução de equipamentos
├── contexts/            # Contextos React (AuthContext)
├── hooks/               # Hooks customizados
├── integrations/        # Integrações externas (Supabase client/types)
├── lib/                 # Utilitários, constantes, i18n
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx    # Painel principal
│   ├── Inventory.tsx    # Gestão de inventário
│   ├── NewTerm.tsx      # Criação de termos
│   ├── PendingTerms.tsx # Termos pendentes
│   ├── SignedTerms.tsx  # Termos assinados
│   ├── CollaboratorSign.tsx  # Assinatura externa (link público)
│   ├── SettingsPage.tsx # Configurações do sistema
│   └── Login.tsx        # Tela de login
└── App.tsx              # Roteamento principal
```

## 🗄️ Banco de Dados

### Tabelas
- **equipment** — Cadastro de equipamentos (notebook, mouse, teclado, etc.)
- **responsibility_terms** — Termos de responsabilidade com assinaturas
- **analysts** — Analistas de TI responsáveis
- **system_settings** — Configurações do sistema (idioma, logo, texto do termo)

### Enums
- `equipment_status`: disponivel, entregue, em_manutencao, reservado, baixado
- `equipment_type`: notebook, mouse, teclado, projetor, workstation, monitor, tablet, celular, outros
- `term_status`: rascunho, pendente_colaborador, aguardando_analista, totalmente_assinado, cancelado

## 🔐 Segurança

- Autenticação obrigatória para acesso ao sistema (exceto rota de assinatura pública)
- Row Level Security (RLS) ativo em todas as tabelas
- Assinatura pública via token + senha (sem necessidade de login)

## 🌍 Internacionalização

Suporte a 3 idiomas: Português (PT), Inglês (EN), Espanhol (ES). Configurável nas definições do sistema.

## 🎨 Temas

Suporte a modo claro e escuro via toggle na interface.

## ⚠️ Uso de IA

**Este sistema NÃO utiliza nenhum recurso de inteligência artificial.** Todas as funcionalidades são determinísticas e baseadas em lógica convencional. O sistema é compatível com políticas restritivas de uso de IA.

## 🛠️ Self-Hosting

Para hospedar em servidor próprio:

1. Clone o repositório
2. Instale dependências: `npm install`
3. Configure as variáveis de ambiente (`.env`):
   - `VITE_SUPABASE_URL` — URL do seu projeto Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — Chave pública (anon) do Supabase
4. Build de produção: `npm run build`
5. Sirva a pasta `dist/` com qualquer servidor web (Nginx, Apache, etc.)

> **Nota:** O backend roda no Supabase (PostgreSQL + Auth). Para self-hosting completo, você pode usar o [Supabase Self-Hosted](https://supabase.com/docs/guides/self-hosting).
