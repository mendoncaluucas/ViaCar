-- Uma carona por rota por DIA, ignorando as canceladas.
--
-- O índice antigo era `UNIQUE (rota_id, data_partida)` — comparava o instante
-- inteiro. Dois problemas verificados contra o banco:
--
--   1. Alterar `rota.horario_partida` mudava o instante gerado, e o mesmo dia
--      passava a aceitar uma segunda carona. A garantia documentada tinha furo.
--   2. Cancelar uma carona bloqueava aquele dia para sempre: reabrir produzia
--      exatamente o mesmo instante e esbarrava na constraint.
--
-- A troca resolve os dois: a unicidade passa a ser por dia-calendário, e
-- canceladas saem do índice. O Prisma não expressa índice único parcial nem
-- índice sobre expressão, por isso isto vive aqui e não no schema.prisma.

-- DropIndex
DROP INDEX "carona_rota_id_data_partida_key";

-- O dia é calculado no fuso da empresa. O offset entra como INTERVAL fixo, e não
-- como nome de fuso ('America/Sao_Paulo'): com nome, a função é STABLE — depende
-- do banco de fusos — e o Postgres recusa expressão não-IMMUTABLE em índice.
-- Usar o offset fixo é correto aqui porque o Brasil extinguiu o horário de verão
-- em 2019, então Joinville não muda de offset durante o ano.
CREATE UNIQUE INDEX "carona_unica_por_rota_e_dia"
  ON "carona" (
    "rota_id",
    (("data_partida" AT TIME ZONE INTERVAL '-03:00')::date)
  )
  WHERE "status" <> 'CANCELADA';
