import type { Metadata } from "next";
import { appDoSite, Campo, LegalPage, Suporte } from "@/components/Legal";
import { brl } from "@/lib/format";
import { GUARANTEE_DAYS, PRODUCTS } from "@/lib/products";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  const p = PRODUCTS[appDoSite()];
  return (
    <LegalPage title="Termos de uso">
      <p>Estes termos explicam as regras para usar o {p.name}. Ao criar sua conta ou assinar, você concorda com eles.</p>

      <h2>1. Quem somos</h2>
      <p>O {p.name} é oferecido por <Campo k="razaoSocial" />, CNPJ <Campo k="cnpj" />, com endereço em <Campo k="endereco" />. Fale com a gente pelo <Suporte />.</p>

      <h2>2. O que é o serviço</h2>
      <p>O {p.name} é um aplicativo na internet para organizar o seu negócio. Você cadastra suas informações, e o app ajuda a acompanhar valores, datas e mensagens.</p>
      <p>O app não é banco nem instituição de pagamento. O dinheiro dos seus clientes não passa por ele. As mensagens saem do seu próprio WhatsApp: o app só prepara o texto, e quem confere e envia é você.</p>

      <h2>3. Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar um e-mail que seja seu.</li>
        <li>Guarde sua senha com cuidado. O que for feito com ela é responsabilidade sua.</li>
        <li>Se comprar direto pelo link de pagamento, criamos a conta com o e-mail da compra. Para definir sua senha, fale com o suporte.</li>
      </ul>

      <h2>4. Assinatura e cobrança</h2>
      <ul>
        <li>O plano custa {brl(p.prices[0])} por mês{p.yearlyPrice ? `, ou ${brl(p.yearlyPrice)} por ano` : ""}.</li>
        <li>A cobrança é feita na hora da assinatura. Não há período grátis.</li>
        <li>A assinatura renova sozinha a cada período, até você cancelar.</li>
        <li>O pagamento é processado pela Cakto, que recebe seus dados de pagamento em ambiente próprio.</li>
        <li>O preço fica travado por 12 meses a partir da assinatura. Depois disso, qualquer mudança será avisada com antecedência.</li>
      </ul>

      <h2>5. Garantia de {GUARANTEE_DAYS} dias</h2>
      <p>Você tem {GUARANTEE_DAYS} dias, contados do primeiro pagamento, para pedir o dinheiro de volta, sem precisar explicar o motivo. O pedido é feito no próprio app, na tela de assinatura, ou pelo <Suporte />.</p>
      <p>Devolvemos o valor pago pelo mesmo meio de pagamento e encerramos a assinatura. O acesso termina na hora do pedido. O prazo para o dinheiro aparecer depende da Cakto e do seu banco ou cartão. A garantia vale uma vez por pessoa em cada app.</p>

      <h2>6. Cancelamento</h2>
      <p>Você pode cancelar quando quiser, direto no app. O cancelamento interrompe as próximas cobranças, e você continua usando até o fim do período já pago. Depois dos {GUARANTEE_DAYS} dias da garantia, o período já pago não é devolvido, salvo quando a lei exigir.</p>
      <p>Se um pagamento falhar, o acesso continua por uma pequena folga de dias. Sem o pagamento, ele é suspenso até a situação ser regularizada.</p>

      <h2>7. Os dados dos seus clientes</h2>
      <p>O app guarda o nome, o WhatsApp e outras informações dos clientes que você cadastra. Nesses dados, você é quem decide o que entra e para que serve, e nós apenas guardamos e processamos as informações para você usar o app. Por isso, você se compromete a:</p>
      <ul>
        <li>cadastrar apenas dados de pessoas com quem tem relação real e com um motivo legítimo, como cobrar um serviço prestado;</li>
        <li>atender os pedidos dos seus clientes sobre os dados deles, como corrigir ou apagar;</li>
        <li>não mandar mensagens abusivas, ameaças, spam ou cobranças indevidas. Cobrar expondo a pessoa ao ridículo ou a constrangimento é proibido por lei.</li>
      </ul>

      <h2>8. O que não é permitido</h2>
      <ul>
        <li>Usar o app para fraude ou qualquer atividade ilegal.</li>
        <li>Tentar acessar dados de outras pessoas ou atrapalhar o funcionamento do serviço.</li>
        <li>Copiar, revender ou compartilhar o acesso sem nossa autorização.</li>
      </ul>
      <p>Se essas regras forem quebradas, podemos suspender ou encerrar a conta.</p>

      <h2>9. Limites do serviço</h2>
      <p>Trabalhamos para manter o app no ar e seus dados seguros, mas podem acontecer falhas e paradas para manutenção. Os valores, datas e cálculos dependem do que você cadastra, então confira antes de cobrar ou decidir. O app não substitui contador nem advogado. Nada aqui retira os direitos que o Código de Defesa do Consumidor garante a você.</p>

      <h2>10. Seus dados e propriedade</h2>
      <p>O que você cadastra continua sendo seu. A marca, o visual e o código do {p.name} são nossos. A forma como cuidamos dos dados pessoais está na <a href="/privacidade/">Política de privacidade</a>.</p>

      <h2>11. Mudanças nestes termos</h2>
      <p>Se mudarmos algo importante, avisaremos por e-mail ou no app antes de a mudança valer. A data no topo mostra a versão atual.</p>

      <h2>12. Lei e foro</h2>
      <p>Estes termos seguem as leis do Brasil. Se você for consumidor, pode resolver qualquer questão no foro da sua cidade. Nos demais casos, vale o foro de <Campo k="cidadeForo" />.</p>
    </LegalPage>
  );
}
