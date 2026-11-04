import type { Metadata } from "next";
import { appDoSite, Campo, LegalPage, Suporte } from "@/components/Legal";
import { PRODUCTS } from "@/lib/products";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  const p = PRODUCTS[appDoSite()];
  return (
    <LegalPage title="Política de privacidade">
      <p>Esta política explica quais dados pessoais o {p.name} usa, por quê e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>

      <h2>1. Quem cuida dos dados</h2>
      <p>O responsável é <Campo k="nome" />, de <Campo k="cidade" />. Para qualquer assunto de privacidade, o canal é o <Suporte />.</p>

      <h2>2. Dois papéis diferentes</h2>
      <ul>
        <li><b>Dados de quem assina:</b> somos o controlador. Decidimos como usar esses dados, seguindo esta política.</li>
        <li><b>Dados dos clientes de quem assina:</b> quem assina é o controlador, porque é quem decide cadastrar essas pessoas e para quê. Nós somos o operador: guardamos e tratamos esses dados só para o app funcionar, seguindo as instruções de quem assina.</li>
      </ul>

      <h2>3. Quais dados usamos</h2>
      <h3>De quem assina</h3>
      <ul>
        <li><b>Conta:</b> e-mail, senha guardada de forma protegida e data em que você aceitou estes documentos.</li>
        <li><b>Assinatura:</b> plano, valor, situação, datas e os códigos do pedido e da assinatura na Cakto. Se você comprar direto pelo link de pagamento, recebemos da Cakto o e-mail usado na compra para criar sua conta.</li>
        <li><b>Uso do app:</b> o que você preenche, como nome de exibição, chave Pix, cidade e tipo de negócio.</li>
        <li><b>Dados técnicos:</b> endereço IP e registros de acesso, usados para segurança.</li>
      </ul>
      <p>Não guardamos número de cartão nem CPF. Esses dados ficam com a Cakto, no ambiente de pagamento dela.</p>
      <h3>Dos clientes de quem assina</h3>
      <ul>
        <li>Nome, WhatsApp, valores, datas de vencimento, histórico de pagamentos e anotações que quem assina escrever.</li>
      </ul>
      <p>Pedimos que nenhuma informação sensível seja colocada nas anotações, como dados de saúde, religião ou opinião política.</p>

      <h2>4. Para que usamos e com qual base legal</h2>
      <ul>
        <li><b>Criar a conta e entregar o serviço:</b> execução de contrato.</li>
        <li><b>Cobrar a assinatura, devolver pagamentos e mandar e-mails do serviço:</b> execução de contrato.</li>
        <li><b>Guardar registros de pagamento e de acesso:</b> cumprimento de obrigação legal.</li>
        <li><b>Evitar fraude e proteger as contas:</b> legítimo interesse.</li>
      </ul>
      <p>Não vendemos dados pessoais. Não usamos os dados dos clientes de quem assina para falar com eles nem para fazer publicidade.</p>

      <h2>5. Com quem compartilhamos</h2>
      <p>Só com os fornecedores necessários para o serviço funcionar:</p>
      <ul>
        <li><b>Supabase:</b> banco de dados e login. Os dados ficam em servidores em São Paulo.</li>
        <li><b>Netlify:</b> hospedagem do site.</li>
        <li><b>Cakto:</b> pagamento da assinatura.</li>
        <li><b>WhatsApp:</b> atendimento do suporte, quando você nos chama por lá.</li>
      </ul>
      <p>Também podemos entregar dados quando uma lei ou uma ordem de autoridade exigir.</p>
      <p>Quando você toca para enviar uma cobrança, o app abre o seu WhatsApp. A partir daí, a conversa segue as regras do WhatsApp.</p>

      <h2>6. Transferência para fora do Brasil</h2>
      <p>Alguns fornecedores são de outros países, principalmente dos Estados Unidos, e podem tratar dados por lá. Nesses casos, buscamos fornecedores com proteção adequada, como pede a LGPD.</p>

      <h2>7. Por quanto tempo guardamos</h2>
      <ul>
        <li><b>Conta e dados do app:</b> enquanto a conta existir. Depois de um cancelamento ou reembolso, os dados continuam guardados para você poder voltar, até você pedir a exclusão.</li>
        <li><b>Registros de pagamento:</b> pelo prazo exigido pelas leis fiscais e de consumo.</li>
        <li><b>Registros de acesso:</b> pelo menos 6 meses, como pede o Marco Civil da Internet.</li>
      </ul>

      <h2>8. Segurança</h2>
      <p>Usamos conexão protegida, senhas guardadas de forma protegida e regras no banco de dados para cada pessoa ver só as próprias informações. Nenhum sistema é 100% seguro. Se houver um incidente com risco relevante, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD).</p>

      <h2>9. Seus direitos</h2>
      <p>Você pode pedir, a qualquer momento:</p>
      <ul>
        <li>a confirmação de que tratamos seus dados e uma cópia deles;</li>
        <li>a correção de dados errados ou desatualizados;</li>
        <li>a exclusão dos seus dados, menos o que a lei manda guardar;</li>
        <li>a portabilidade dos dados para outro serviço;</li>
        <li>informações sobre com quem compartilhamos.</li>
      </ul>
      <p>Mande o pedido pelo <Suporte />. Respondemos em até 15 dias. Você também pode reclamar na ANPD.</p>
      <p>Se você é cliente de alguém que usa o app, fale primeiro com essa pessoa, porque é ela quem decide sobre seus dados. Se não conseguir, escreva para o mesmo WhatsApp e encaminharemos o pedido.</p>

      <h2>10. Cookies e armazenamento no navegador</h2>
      <p>Usamos só o armazenamento do navegador necessário para manter você conectado. Não usamos cookies de publicidade.</p>

      <h2>11. Crianças e adolescentes</h2>
      <p>A conta é só para maiores de 18 anos. Se quem assina cadastrar um aluno menor de idade, deve usar os dados do responsável sempre que possível.</p>

      <h2>12. Mudanças nesta política</h2>
      <p>Se mudarmos algo importante, avisaremos por e-mail ou no app. A data no topo mostra a versão atual.</p>
    </LegalPage>
  );
}
