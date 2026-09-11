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
 * @param dia Qualquer instante dentro do dia desejado; a hora e descartada.
 * @param horarioDaRota O campo `horarioPartida` da rota.
 */
export function combinarDiaEHorario(dia: Date, horarioDaRota: Date): Date {
  const data = dia.toISOString().slice(0, 10);
  const hora = horaParaTexto(horarioDaRota);
  return new Date(`${data}T${hora}:00.000${FUSO_DA_EMPRESA}`);
}
