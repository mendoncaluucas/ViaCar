/**
 * A coluna `rota.horario_partida` e TIME no Postgres - a modelagem correta para
 * hora do dia sem data. O Prisma devolve TIME como Date ancorado em 1970-01-01,
 * entao a API converte nas duas pontas e o frontend so ve "HH:mm".
 */

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Fuso da empresa. Fixo em -03:00 porque o Brasil extinguiu o horario de verao
 * em 2019 - Joinville nao muda de offset durante o ano.
 *
 * Existe porque `horario_partida` guarda hora de parede ("07:30 da manha") e
 * `data_partida` guarda o instante. Sem converter, uma carona das 07:30 seria
 * gravada como 07:30 UTC e apareceria como 04:30 na tela de quem esta no Brasil.
 */
const FUSO_DA_EMPRESA = '-03:00';

/** O mesmo offset em minutos, para converter instante em data local. */
const MINUTOS_DO_FUSO = -180;

export function horaParaTexto(hora: Date): string {
  return hora.toISOString().slice(11, 16);
}

export function textoParaHora(texto: string): Date {
  if (!FORMATO_HORA.test(texto)) {
    throw new Error(`Horario invalido: "${texto}". Use o formato HH:mm.`);
  }
  return new Date(`1970-01-01T${texto}:00.000Z`);
}

/**
 * Monta o instante de partida de uma carona a partir do dia desejado e do
 * horario da rota.
 *
 * Use SEMPRE isto ao criar carona, nunca o timestamp que o cliente mandou.
 * O indice `UNIQUE (rota_id, data_partida)` so impede carona duplicada no mesmo
 * dia se as duas requisicoes produzirem exatamente o mesmo valor - com timestamp
 * livre, um milissegundo de diferenca passa pela constraint.
 *
 * A API recebe o dia como texto "AAAA-MM-DD" justamente para nao ter ambiguidade
 * de fuso: um instante como "2026-09-15T22:00-03:00" cai em 16/09 pelo relogio
 * UTC, e o funcionario que pediu carona para o dia 15 receberia a do dia 16.
 *
 * @param dia "AAAA-MM-DD", ou um Date de cujo dia (em UTC) so a data e usada.
 * @param horarioDaRota O campo `horarioPartida` da rota.
 */
export function combinarDiaEHorario(dia: Date | string, horarioDaRota: Date): Date {
  const data = typeof dia === 'string' ? dia.slice(0, 10) : dia.toISOString().slice(0, 10);
  const hora = horaParaTexto(horarioDaRota);
  return new Date(`${data}T${hora}:00.000${FUSO_DA_EMPRESA}`);
}

/**
 * Meia-noite de hoje, no fuso da empresa.
 *
 * Use isto para "de hoje em diante". Aproximar com `agora - N horas` parece
 * funcionar e nao funciona: as 08:00 um recuo de 12h inclui as 20:00 de ontem,
 * e o resultado muda conforme a hora em que a consulta roda.
 */
export function inicioDoDiaAtual(): Date {
  const dataLocal = new Date(Date.now() + MINUTOS_DO_FUSO * 60_000).toISOString().slice(0, 10);
  return new Date(`${dataLocal}T00:00:00.000${FUSO_DA_EMPRESA}`);
}

/**
 * Comeco e fim de um dia no fuso da empresa, para filtrar caronas por data.
 *
 * Filtrar por dia em UTC pegaria das 21h do dia anterior as 21h do dia pedido -
 * a carona da volta, as 17:40, cairia no dia errado para quem busca.
 *
 * @param dia "AAAA-MM-DD"
 */
export function intervaloDoDia(dia: string): { inicio: Date; fim: Date } {
  const data = dia.slice(0, 10);
  const inicio = new Date(`${data}T00:00:00.000${FUSO_DA_EMPRESA}`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { inicio, fim };
}
