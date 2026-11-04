import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { ajudaLink } from "@/lib/empresa";
import { GUARANTEE_DAYS, PRODUCTS, type ProductId } from "@/lib/products";
import { brl } from "@/lib/format";
import { Icon, type IconName } from "@/components/ui";

// Página de venda de cada app. As telas do celular são HTML com dados de exemplo.

interface Copy {
  who: string; h1: string; h1b: string; sub: string; ticker: string[];
  steps: [string, string][];
  tiles: { big: [string, string]; rest: [IconName, string, string][] };
  without: string[]; withApp: string[];
  faq: [string, string][];
  final: string;
  /** Títulos das seções. Em dois pedaços, o segundo sai na fonte de destaque. */
  titles: { problem: [string, string]; steps: [string, string]; tiles: string; price: string };
}

const COPY: Record<ProductId, Copy> = {
  cobranca: {
    who: "Para quem vive de clientes fixos",
    h1: "Cobrança esquecida",
    h1b: "é dinheiro perdido.",
    sub: "Veja todo dia quem vence, quem atrasou e quem já pagou. A mensagem com o valor e o Pix abre pronta no seu WhatsApp. Sem planilha e sem caçar conversa.",
    ticker: ["Personal trainer", "Professor particular", "Estúdio de pilates", "Escolinha", "Nutricionista"],
    steps: [
      ["Cadastre uma vez", "Nome, WhatsApp, valor e vencimento. Serve para mensalidade, pacote ou sessão avulsa."],
      ["Abra e veja quem cobrar", "O app separa quem vence hoje, quem atrasou e quem já pagou. Nada depende da sua memória."],
      ["Cobre com um toque", "Seu WhatsApp abre com a mensagem, o valor e o Pix prontos. Você só aperta enviar."],
    ],
    tiles: {
      big: ["Nunca mais esqueça de cobrar", "O app mostra quem vence hoje e já deixa a mensagem pronta, com o valor e o Pix. Você só confere e envia."],
      rest: [
        ["users", "Quem pagou e quem deve", "Chega de rolar conversa atrás de comprovante. O mês inteiro numa tela só."],
        ["box", "Pacotes e faltas", "Conte sessões, faltas avisadas e pacotes que estão acabando."],
        ["pause", "Cliente viajou?", "Pause a cobrança e volte quando ele voltar."],
        ["check", "Seu dinheiro é seu", "O Pix cai direto na sua conta. O app não toca nele."],
        ["bell", "Lembretes do dia", "Antes, no dia e depois do vencimento, numa fila só. É só ir enviando."],
      ],
    },
    without: ["Você só lembra de cobrar quando o dinheiro faz falta", "Procura no WhatsApp quem pagou e quem não pagou", "Digita a mesma mensagem e o Pix, cliente por cliente", "O vencimento passa e a cobrança atrasa junto"],
    withApp: ["Todo dia o app mostra quem cobrar", "Quem pagou e quem deve, numa tela só", "Mensagem com valor e Pix pronta em um toque", "Lembrete antes, no dia e depois do vencimento"],
    faq: [
      ["Já uso planilha. Por que mudar?", "A planilha guarda a informação, mas não avisa nem monta a cobrança. O app mostra quem cobrar hoje e deixa a mensagem pronta."],
      ["O app envia as mensagens sozinho?", "Não. Ele abre o seu próprio WhatsApp com a mensagem pronta e você confere e envia. Assim a conversa continua sendo sua e o seu número não corre risco."],
      ["O dinheiro dos clientes passa pelo app?", "Não. O Pix vai direto para a sua chave. Você só marca no app quando recebeu."],
      ["Preciso instalar alguma coisa?", "Não. Funciona no navegador do celular e do computador."],
      ["Como funciona a garantia?", `Você assina e tem ${GUARANTEE_DAYS} dias para testar. Se não gostar, pede o dinheiro de volta no próprio app.`],
      ["Posso cancelar quando quiser?", "Pode, direto no app. Você continua usando até o fim do período pago."],
    ],
    final: "No próximo vencimento, a cobrança já sai em um toque.",
    titles: { problem: ["Cobrar de memória", "sai caro."], steps: ["Em três passos", "você para de esquecer."], tiles: "Tudo para o dinheiro do mês entrar", price: "Uma mensalidade recuperada já paga o app" },
  },
  sobra: {
    who: "Para quem vende o que faz",
    h1: "Descubra quanto",
    h1b: "sobra de verdade.",
    sub: "Coloque quanto pagou nos insumos e veja o custo, o preço certo e o lucro de cada doce, marmita, salgado ou peça.",
    ticker: ["Confeitaria", "Marmitas", "Salgados", "Artesanato", "Velas e sabonetes"],
    steps: [
      ["Escolha um modelo", "Brigadeiro, bolo de pote, marmita, coxinha ou vela. Ou comece do zero."],
      ["Coloque o que pagou", "O preço e o tamanho da embalagem de cada insumo. O app faz a conta."],
      ["Veja seu lucro", "Custo por unidade, preço sugerido e quanto sobra em cada venda."],
    ],
    tiles: {
      big: ["Sua hora e o gás entram na conta", "O custo real inclui ingredientes, embalagem, gás e o seu trabalho. Nada fica de fora do preço."],
      rest: [
        ["alert", "Aviso de aumento", "Subiu um insumo? O app mostra quanto de lucro você perdeu."],
        ["calendar", "Encomendas com sinal", "Quem pagou o sinal, quanto falta e quando entregar."],
        ["cake", "Modelos prontos", "Receitas com quantidades já preenchidas para você ajustar."],
        ["tag", "Preço para cada margem", "Compare o preço com 20%, 50% ou 100% de lucro."],
        ["home", "No celular, na cozinha", "Letras grandes e poucos toques, sem planilha."],
      ],
    },
    without: ["Preço no chute, copiado da concorrência", "Conta de cabeça na hora de vender", "Aumento de insumo comendo o lucro", "Encomendas perdidas no WhatsApp"],
    withApp: ["Preço calculado com o custo real", "Lucro de cada produto à vista", "Aviso quando um insumo sobe", "Agenda de encomendas com sinal"],
    faq: [
      ["Preciso saber fazer conta ou planilha?", "Não. Você coloca quanto pagou e o app calcula o resto."],
      ["Serve para o que eu vendo?", "Serve para doces, marmitas, salgados, velas, sabonetes e outras peças feitas à mão. Dá para começar de um modelo ou do zero."],
      ["Preciso instalar alguma coisa?", "Não. Funciona no navegador do celular e do computador."],
      ["Como funciona a garantia?", `Você assina e tem ${GUARANTEE_DAYS} dias para testar. Se não gostar, pede o dinheiro de volta no próprio app.`],
      ["Posso cancelar quando quiser?", "Pode, direto no app. Você continua usando até o fim do período pago."],
    ],
    final: "Calcule o preço do seu primeiro produto hoje.",
    titles: { problem: ["Sem o app,", "e com ele."], steps: ["Em três passos", "você começa."], tiles: "Tudo que faz diferença no fim do mês", price: "Um preço simples" },
  },
};

function CobrancaPhone() {
  return (
    <div className="screen">
      <span className="hi">Olá, Carla</span>
      <div className="m-hero">
        <small>Falta receber em novembro</small>
        <b>R$ 1.240,00</b>
        <small>Entrou R$ 3.180,00 de R$ 4.420,00</small>
        <div className="m-bar"><i style={{ width: "72%" }} /></div>
      </div>
      <div className="m-tiles">
        <div className="g"><b>14</b>pagaram</div>
        <div className="r"><b>3</b>devem</div>
        <div><b>2</b>hoje</div>
      </div>
      <div className="m-list">
        <div className="m-row"><span className="av">AL</span><span className="g"><b>Ana Lima</b><span>Vence hoje</span></span><em>Cobrar</em></div>
        <div className="m-row"><span className="av">PR</span><span className="g"><b>Pedro Rocha</b><span>Atrasou 2 dias</span></span><em>Cobrar</em></div>
        <div className="m-row"><span className="av">JS</span><span className="g"><b>Júlia Souza</b><span>R$ 180,00</span></span><em className="ok">Em dia</em></div>
      </div>
    </div>
  );
}

function SobraPhone() {
  return (
    <div className="screen">
      <span className="hi">Brigadeiro tradicional</span>
      <div className="m-hero">
        <small>Lucro em cada unidade</small>
        <b>R$ 0,60</b>
        <small>Vendendo a R$ 1,70</small>
      </div>
      <div className="m-list" style={{ padding: "10px 12px" }}>
        <div className="m-kv"><span>Ingredientes</span><b>R$ 0,43</b></div>
        <div className="m-kv"><span>Gás</span><b>R$ 0,03</b></div>
        <div className="m-kv"><span>Seu trabalho</span><b>R$ 0,64</b></div>
        <div className="m-kv"><span>Custa para fazer</span><b>R$ 1,10</b></div>
      </div>
      <div className="m-list">
        <div className="m-row"><span className="av">AT</span><span className="g"><b>Ana Teixeira</b><span>Entrega sexta</span></span><em className="ok">Sinal pago</em></div>
        <div className="m-row"><span className="av">MC</span><span className="g"><b>Marcos Costa</b><span>Entrega sábado</span></span><em>Falta R$ 90</em></div>
      </div>
    </div>
  );
}

function Showcase({ id }: { id: ProductId }) {
  return (
    <div className="show">
      <div className="phone">{id === "cobranca" ? <CobrancaPhone /> : <SobraPhone />}</div>
      {id === "cobranca" ? (
        <>
          <div className="float wa" aria-hidden="true"><span>Oi, Ana! Hoje vence a mensalidade de novembro, de R$ 180,00. Segue o Pix.</span><small>Enviado pelo seu WhatsApp</small></div>
          <div className="float note" aria-hidden="true"><b>Pagamento registrado</b><span>Pedro Rocha, R$ 180,00</span></div>
        </>
      ) : (
        <>
          <div className="float note" aria-hidden="true"><b>Leite condensado subiu 12%</b><span>R$ 0,03 a menos em cada brigadeiro</span></div>
        </>
      )}
    </div>
  );
}

function Ticker({ items }: { items: string[] }) {
  const line = (key: string, hidden?: boolean) => items.map((t) => <span key={key + t} aria-hidden={hidden}>{t}</span>);
  return <div className="ticker"><div className="ticker-in">{line("a")}{line("b", true)}{line("c", true)}{line("d", true)}</div></div>;
}

function Section({ title, sub, children, id }: { title: ReactNode; sub?: string; children: ReactNode; id?: string }) {
  return (
    <section className="sec" id={id}>
      <h2 className="sec-h">{title}</h2>
      {sub && <p className="sec-p">{sub}</p>}
      {children}
    </section>
  );
}

export function Landing({ id }: { id: ProductId }) {
  const p = PRODUCTS[id];
  const c = COPY[id];
  const price = brl(p.prices[0]);
  return (
    <div className="site night" data-app={id}>
      <div className="wrap nav">
        <div className="nav-in">
          <Link className="brandmark" href="/">{p.name}</Link>
          <div className="links">
            <Link className="enter" href={`/entrar/?volta=${encodeURIComponent(p.home)}`}>Entrar</Link>
            <Link className="btn sm" href={p.home}>Assinar</Link>
          </div>
        </div>
      </div>

      <main className="wrap">
        <section className="lp-hero">
          <div>
            <span className="lp-who">{c.who}</span>
            <h1 className="lp-h1">{c.h1} <span className="serif">{c.h1b}</span></h1>
            <p className="lp-sub">{c.sub}</p>
            <div className="lp-cta">
              <Link className="btn" href={p.home}>Assinar por {price}</Link>
              <span className="lp-micro">por mês, com {GUARANTEE_DAYS} dias de garantia.<br />Não gostou? O dinheiro volta.</span>
            </div>
          </div>
          <Showcase id={id} />
        </section>
      </main>

      <Ticker items={c.ticker} />

      <main className="wrap">
        <Section title={<>{c.titles.problem[0]} <span className="serif">{c.titles.problem[1]}</span></>}>
          <div className="versus">
            <div className="side-by no"><h3>Hoje</h3><ul>{c.without.map((t) => <li key={t}>{t}</li>)}</ul></div>
            <div className="side-by yes" data-app={id}><h3>Com o {p.name}</h3><ul>{c.withApp.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </div>
        </Section>

        <Section title={<>{c.titles.steps[0]} <span className="serif">{c.titles.steps[1]}</span></>}>
          <div className="steps">
            {c.steps.map(([t, d]) => <article className="step" key={t}><h3>{t}</h3><p>{d}</p></article>)}
          </div>
        </Section>

        <Section title={c.titles.tiles}>
          <div className="bento">
            <article className="tile color"><h3>{c.tiles.big[0]}</h3><p>{c.tiles.big[1]}</p></article>
            {c.tiles.rest.map(([ico, t, d], i) => <article className={`tile ${i >= 3 ? "w3" : ""}`} key={t}><span className="tile-ico"><Icon name={ico} size={20} /></span><h3>{t}</h3><p>{d}</p></article>)}
          </div>
        </Section>

        <Section id="preco" title={c.titles.price}>
          <div className="price">
            <div className="stack" style={{ gap: 18 }}>
              <div className="price-n">{price} <small>por mês</small></div>
              {p.yearlyPrice && <span className="lead">Ou {brl(p.yearlyPrice)} por ano</span>}
              <div className="seal"><i>{GUARANTEE_DAYS}</i><div><b>Dias de garantia</b><span>Pediu no app, o dinheiro volta.</span></div></div>
            </div>
            <div className="stack" style={{ gap: 14 }}>
              {p.benefits.map((b) => <span className="check" key={b}>{b}</span>)}
              <span className="check">Preço travado por 12 meses</span>
              <span className="check">Cancele quando quiser, direto no app</span>
              <Link className="btn" href={p.home}>Assinar agora</Link>
            </div>
          </div>
        </Section>

        <Section title="Perguntas comuns">
          <div className="faq">
            {c.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </Section>

        <section className="final">
          <h2>{c.final}</h2>
          <Link className="btn light" href={p.home}>Assinar por {price}</Link>
          <span>{GUARANTEE_DAYS} dias de garantia. Cancele quando quiser.</span>
        </section>

        <footer className="foot">
          <span>Dinheiro dos seus clientes? Nunca passa pelo app.</span>
          <span>{p.name}, feito para quem trabalha por conta própria.</span>
          <nav className="foot-links" aria-label="Documentos">
            <Link href="/termos/">Termos de uso</Link>
            <Link href="/privacidade/">Política de privacidade</Link>
          </nav>
          <a className="btn ghost sm" href={ajudaLink(p.name)} target="_blank" rel="noopener">Falar com o suporte</a>
        </footer>
      </main>

      <span className="wordmark" aria-hidden="true">{p.name}</span>

      <div className="sticky-cta">
        <span>Assinatura<b>{price} por mês</b></span>
        <Link className="btn" href={p.home}>Assinar</Link>
      </div>
    </div>
  );
}

/** No computador (sem app definido) mostra os dois, um depois do outro. */
export function Landings({ ids }: { ids: ProductId[] }) {
  return <>{ids.map((id) => <Fragment key={id}><Landing id={id} /></Fragment>)}</>;
}
