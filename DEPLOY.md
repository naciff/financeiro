# Guia de Deploy - Vercel

## Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com)
- Repositório Git (GitHub, GitLab, ou Bitbucket)

## Passo 1: Preparar Variáveis de Ambiente

### Obter Credenciais do Supabase

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Settings** → **API**
3. Copie:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **Anon (public) key** → será `VITE_SUPABASE_ANON_KEY`

## Passo 2: Deploy via Vercel Dashboard

### 2.1. Import Project

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **Import Git Repository**
3. Selecione seu repositório
4. Clique em **Import**

### 2.2. Configure Project

**Framework Preset**: Vite (auto-detectado)

**Build Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 2.3. Environment Variables

Clique em **Add** para cada variável:

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = sua-chave-publica-aqui
```

### 2.4. Deploy

Clique em **Deploy** e aguarde o build finalizar (1-3 minutos).

## Passo 3: Deploy via Vercel CLI (Alternativo)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

## Passo 4: Testar Deploy

1. Acesse a URL fornecida pela Vercel (ex: `seu-app.vercel.app`)
2. Teste login/autenticação
3. Verifique funcionalidades principais
4. Teste navegação entre páginas

## Configurações Adicionais

### Domínio Customizado

1. No Vercel Dashboard → **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### Preview Deployments

Cada push em branches gera preview automático:
- `main` → Produção
- Outras branches → Preview

### Variáveis por Ambiente

No Vercel Dashboard você pode configurar variáveis diferentes para:
- **Production**
- **Preview**
- **Development**

## Troubleshooting

### Build Falha

**Problema**: Build retorna erro

**Solução**:
1. Teste build local: `npm run build`
2. Verifique logs no dashboard Vercel
3. Confirme versão do Node (recomendado: 18.x)

### Erro de Conexão Supabase

**Problema**: "Failed to connect to Supabase"

**Solução**:
1. Verifique variáveis de ambiente no Vercel
2. Confirme que começam com `VITE_`
3. Re-deploy após adicionar variáveis

### Rotas 404

**Problema**: Páginas internas retornam 404

**Solução**:
1. Verifique que `vercel.json` tem rewrites configurado
2. Confirme SPA routing está funcionando

## Atualizações Futuras

Para atualizar o site:
1. Faça push para o repositório
2. Vercel fará deploy automático
3. Acompanhe progresso no dashboard

## Comandos Úteis

```bash
# Build local
npm run build

# Preview local do build
npm run preview

# Vercel CLI - listar deployments
vercel ls

# Vercel CLI - ver logs
vercel logs
```

## Suporte

- Documentação Vercel: https://vercel.com/docs
- Documentação Vite: https://vitejs.dev/guide/
- Documentação Supabase: https://supabase.com/docs
