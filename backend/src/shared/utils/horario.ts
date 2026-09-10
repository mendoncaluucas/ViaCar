/**
 * A coluna `rota.horario_partida` e TIME no Postgres - a modelagem correta para
 * hora do dia sem data. O Prisma devolve TIME como Date ancorado em 1970-01-01,
 * entao a API converte nas duas pontas e o frontend so ve "HH:mm".
 */

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaParaTexto(hora: Date): string {
  return hora.toISOString().slice(11, 16);
}

export function textoParaHora(texto: string): Date {
  if (!FORMATO_HORA.test(texto)) {
    throw new Error(`Horario invalido: "${texto}". Use o formato HH:mm.`);
  }
  return new Date(`1970-01-01T${texto}:00.000Z`);
}
