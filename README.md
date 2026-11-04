# Plataforma: Cobrança e Sobra

Uma base única de SaaS de autoatendimento com dois apps. O cliente assina e usa sozinho, sem nenhuma entrega manual.

- **Cobrança**: para quem tem clientes fixos (personal, professores, pilates, escolinhas, nutricionistas).
- **Sobra**: preço e lucro para confeiteiras, marmiteiras, salgadeiras e artesãs.

Cada app é um **site estático** separado no Netlify, publicado a partir do GitHub. Os dados e o login ficam no **Supabase**, e o que precisa de servidor roda nas **Edge Functions** do Supabase.

## Como funciona

```
GitHub (repositório SAAS) ──> Netlify publica sozinho a cada atualização (2 sites)

Navegador (site estático no Netlify)
  ├─ Supabase Auth ........ login com e-mail e senha
  ├─ Banco (Postgres) ..... tabelas cob_* e sob_*, cada linha com o dono
  │                         (as regras só liberam o dono e com assinatura válida)
  ├─ Edge Function admin ........ lista de assinantes (só para o dono)
  └─ Edge Function assinatura ... criar · reembolso · cancelar
                                    ├─ Cakto (Cobrança: checkout dela, Pix e cartão)
                                    └─ Asaas (Sobra, pausado, em ambiente de teste)
Cakto ──webhook──> Edge Function cakto-webhook ──> libera ou corta o acesso
Asaas ──webhook──> Edge Function asaas-webhook ──> libera ou corta o acesso
```

**Assinatura:** é cobrada na hora, sem teste grátis, com **garantia de 7 dias**. Dentro desse prazo, a pessoa pede o reembolso no próprio app: a função devolve o primeiro pagamento e encerra a assinatura. A garantia vale uma vez por pessoa em cada app.

**Chaves:** o endereço do projeto e a chave pública (`sb_publishable_...`) ficam em `public/config.js` e podem ficar visíveis, porque quem protege os dados são as regras do banco. A chave secreta do Supabase e as chaves da Cakto e do Asaas ficam só nos segredos das Edge Functions e nunca vão para o GitHub.

---

## Passo a passo para colocar no ar

### 1. Supabase

As tabelas, as regras e as duas funções ficam em `supabase/`. O que falta é feito no painel do projeto (https://supabase.com/dashboard):

1. **Endereços do login:** em **Authentication › URL Configuration**:
   - **Site URL:** `https://cobranca-clientes.netlify.app`;
   - **Redirect URLs:** `https://cobranca-clientes.netlify.app/**`, `https://sobra-precos.netlify.app/**` e `http://localhost:3000/**`.

   Já está feito. Se trocar o endereço de um site, atualize aqui.

   Sem isso, o link do e-mail não volta para o site certo.
2. **Login com senha:** em **Authentication › Sign In / Providers › Email**, deixe **Confirm email** desligado. Assim a conta entra na hora, sem depender de e-mail.
3. **E-mail de "esqueci minha senha":** em **Authentication › Emails › SMTP Settings**, cadastre um serviço de e-mail próprio (Resend, Brevo, SendGrid ou outro). O e-mail que vem pronto no Supabase tem um limite bem baixo por hora.
4. **Plano:** o plano gratuito pausa o projeto depois de 7 dias sem uso. Passe para o Pro quando tiver clientes de verdade.

### 2. Cakto (Cobrança)

O botão de assinar leva para a oferta que está em `checkout`, no arquivo `supabase/functions/_shared/plans.js`. O link leva um código sem dado pessoal (`?callback=`), e o aviso de pagamento devolve esse código. É assim que a compra encontra a conta, mesmo que a pessoa use outro e-mail no checkout.

1. **Chave da API:** em **Integrações › Cakto API**, crie uma chave com as permissões `read`, `write`, `orders`, `subscriptions` e `webhooks`. Nunca marque as de saque.
2. **Webhook:** em https://app.cakto.com.br/dashboard/apps, crie um com:
   - URL: `https://jjobijwytjwxfbyjejma.supabase.co/functions/v1/cakto-webhook`;
   - produto: Cobrança;
   - eventos: `purchase_approved`, `refund`, `chargeback`, `subscription_created`, `subscription_renewed`, `subscription_late_recovered` e `subscription_canceled`.
3. **Segredos:** no Supabase, em **Edge Functions › Secrets**:

   | Nome | Valor |
   |---|---|
   | `CAKTO_CLIENT_ID` | o Client ID da chave |
   | `CAKTO_CLIENT_SECRET` | o Client Secret da chave |
   | `CAKTO_WEBHOOK_SECRET` | o segredo do webhook |

Enquanto faltar um dos três, o site avisa que o pagamento não está configurado e não manda ninguém para o checkout. Assim, ninguém paga sem receber o acesso.

**Conferir na primeira compra real:** a documentação não mostra o nome do campo com o id da assinatura nos avisos nem diz se o `callback` se repete nas renovações. O `cakto-webhook` grava no log só os nomes dos campos de cada aviso, para conferir. Veja se `cakto_subscription_id` foi preenchido na tabela `subscriptions`: sem ele, o cancelamento pelo app avisa para falar com o suporte.

### 3. Asaas (Sobra, pausado)

1. Crie a conta. Comece pelo **sandbox** (https://sandbox.asaas.com), que é o ambiente de teste e não cobra de verdade.
2. **Chave da API:** em **Integrações › Chaves de API**, gere uma chave.
3. **Segredos:** no Supabase, abra **Edge Functions › Secrets** e cadastre:

   | Nome | Valor |
   |---|---|
   | `ASAAS_API_KEY` | a chave da API do Asaas |
   | `ASAAS_WEBHOOK_TOKEN` | uma senha longa que você inventa (40 letras e números) |
   | `ASAAS_API_URL` | `https://api-sandbox.asaas.com/v3` no teste, `https://api.asaas.com/v3` para cobrar de verdade |

4. **Webhook:** no Asaas, em **Integrações › Webhooks**, crie um com:
   - URL: `https://jjobijwytjwxfbyjejma.supabase.co/functions/v1/asaas-webhook`;
   - token de autenticação: o mesmo `ASAAS_WEBHOOK_TOKEN`;
   - eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`, `SUBSCRIPTION_DELETED` e `SUBSCRIPTION_INACTIVATED`.
5. **Quando for cobrar de verdade:** troque `ASAAS_API_KEY` e `ASAAS_API_URL` pelos de produção e refaça o webhook na conta de produção. Os segredos valem na hora, sem publicar de novo.
6. **Antes de abrir para clientes**, confira na documentação atual do Asaas:
   - os campos usados em `supabase/functions/assinatura/index.ts`;
   - como funciona o estorno de **boleto**. No Pix e no cartão, a devolução é automática.

### 4. GitHub e Netlify (um site para cada app)

O código deste app fica no repositório **SAAS** do GitHub (só a pasta `plataforma`). Faça isto duas vezes, uma para cada app:

1. Em https://app.netlify.com, vá em **Add new project › Import an existing project › GitHub** e escolha o repositório **SAAS**.
2. Preencha:

   | Campo | Valor |
   |---|---|
   | Base directory | deixe em branco |
   | Build command | `node scripts/site.mjs` |
   | Publish directory | `out` |

3. Em **Environment variables**, crie `NEXT_PUBLIC_APP` com o valor `cobranca` (no primeiro site) ou `sobra` (no segundo), e `NETLIFY_NEXT_PLUGIN_SKIP` com o valor `true` nos dois.
4. Publique. Os dois sites já existem: `cobranca-clientes` e `sobra-precos`.

Depois disso, cada atualização enviada ao GitHub publica os dois sites sozinha.

**Limite do plano gratuito do Netlify:** são 300 créditos por mês, e cada publicação gasta 15. Como cada atualização publica os dois sites, ela gasta 30 créditos. Isso dá no máximo 10 atualizações por mês, menos o que as visitas consomem. Quando os créditos acabam, os sites seguem no ar, mas nada novo é publicado até o ciclo virar. Por isso, junte as mudanças e envie de uma vez.

A mesma conta funciona nos dois sites, mas a pessoa entra uma vez em cada um, porque são endereços diferentes.

---

## Tela de administrador

Abra `/admin/` em qualquer um dos sites, com a sua conta. Ela mostra quem assinou, a situação e quanto entra por mês. Só abre para contas da tabela `admins`, e não mostra os clientes nem os produtos de cada assinante.

---

## Rodar no seu computador

Precisa do Node 24 ou mais novo.

```bash
npm run dev
```

Abra http://localhost:3000. O site usa o mesmo projeto do Supabase que está no ar, então o que você grava aqui aparece lá.

**Pagamento simulado (só no Sobra, que não usa a Cakto):**
- ligue `simulado` na tabela `payment_settings`, no painel do Supabase;
- coloque `pagamentoSimulado: true` em `public/config.js`.

A simulação para sozinha quando `ASAAS_API_KEY` estiver cadastrada. Mesmo assim, desligue as duas coisas depois do teste.

**Testes:**

Regras de cobrança, preço e Pix:
```bash
npm test
```
Regras de segurança do banco (rodam num Postgres dentro do Node, sem Docker):
```bash
npm run test:regras
```

## Onde está cada coisa

```
src/lib/          regras sem tela (testadas): cobranca-core, sobra-core, sobra-calc, pix, format, whatsapp, products
src/lib/db.ts     leitura e gravação no banco; *-data são as gravações de cada app
src/lib/supabase  lê o config.js e chama as funções
src/app/          telas (todas no navegador). Landing.tsx é a página de venda; cobranca/ e sobra/ têm a "porta" de login e assinatura no layout
src/components/   Assinatura (assinar, garantia e cancelar), AccessGate, componentes visuais
supabase/migrations/  tabelas e regras de segurança
supabase/functions/   assinatura, cakto-webhook, asaas-webhook, admin, _shared/plans.js (preços, igual a products.ts) e _shared/cakto-regras.js (regras dos avisos, testadas)
scripts/          site.mjs (gera o site de um app) e servir.mjs (testa o site gerado)
tests/            testes das regras · tests-supabase/ testes da segurança do banco
```

Os preços dos planos ficam em dois lugares que precisam ser iguais: `src/lib/products.ts` (o que a tela mostra) e `supabase/functions/_shared/plans.js` (o que é cobrado). Um teste confere isso.

## Decisões provisórias (mudam fácil)
- **Preços:** Cobrança R$ 29,99 por mês. Sobra R$ 19,99 por mês ou R$ 97,00 por ano. Na Cakto, o produto custa R$ 0,99 a menos, porque ela soma uma taxa de serviço ao comprador.
- **Lembretes:** saem 2 dias antes, no dia e depois do vencimento (repetem a cada 7 dias). O app avisa e a pessoa envia cada um com um toque.
- **Pagamento dos clientes:** marcado à mão, porque não há integração bancária nesta versão.

## Ainda falta antes de lançar
- Termos de uso e política de privacidade (LGPD: o app guarda nome e WhatsApp dos clientes do usuário).
- Notificação no celular quando houver lembretes no dia.
