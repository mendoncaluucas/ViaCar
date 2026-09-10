-- Regras de negocio no nivel do banco.
--
-- Migration escrita a mao: CHECK constraints, indice unico parcial e trigger nao
-- existem na linguagem do schema.prisma. Sem isso, as regras valeriam apenas para
-- quem passa pela API - qualquer seed, script ou acesso direto ao banco furaria.

-- ---------------------------------------------------------------------------
-- Sanidade do dominio
-- ---------------------------------------------------------------------------

-- Um veiculo comporta de 1 a 8 passageiros (sem contar o motorista).
ALTER TABLE "veiculo"
  ADD CONSTRAINT "veiculo_capacidade_valida"
  CHECK ("capacidade_passageiros" BETWEEN 1 AND 8);

-- Nao existe carona ofertando zero vagas.
ALTER TABLE "carona"
  ADD CONSTRAINT "carona_vagas_positivas"
  CHECK ("vagas_ofertadas" > 0);

-- dias_semana: 1 = segunda ... 7 = domingo, ao menos um dia, sem valor fora da faixa.
ALTER TABLE "rota"
  ADD CONSTRAINT "rota_dias_semana_validos"
  CHECK (
    COALESCE(array_length("dias_semana", 1), 0) BETWEEN 1 AND 7
    AND "dias_semana" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
  );

-- ---------------------------------------------------------------------------
-- Uma reserva confirmada por passageiro por carona
-- ---------------------------------------------------------------------------
-- Indice PARCIAL de proposito: a restricao vale so para CONFIRMADA. Assim o
-- passageiro que cancelou pode reservar a mesma carona de novo mais tarde.

CREATE UNIQUE INDEX "reserva_confirmada_unica_por_carona"
  ON "reserva" ("carona_id", "passageiro_id")
  WHERE "status" = 'CONFIRMADA';

-- ---------------------------------------------------------------------------
-- RN-01 (CRITICA): vagas ofertadas <= capacidade do veiculo
-- ---------------------------------------------------------------------------
-- A regra cruza duas tabelas, entao CHECK nao alcanca. A validacao principal
-- fica no carona.service.ts (mensagem amigavel em portugues); esta trigger e a
-- rede de seguranca para escrita que nao passa pela API.

CREATE OR REPLACE FUNCTION validar_capacidade_da_carona()
RETURNS TRIGGER AS $$
DECLARE
  capacidade SMALLINT;
BEGIN
  SELECT "capacidade_passageiros"
    INTO capacidade
    FROM "veiculo"
   WHERE "id" = NEW."veiculo_id";

  IF capacidade IS NULL THEN
    RAISE EXCEPTION 'RN-01: veiculo % nao encontrado', NEW."veiculo_id"
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW."vagas_ofertadas" > capacidade THEN
    RAISE EXCEPTION
      'RN-01: o veiculo comporta % passageiros, mas foram ofertadas % vagas',
      capacidade, NEW."vagas_ofertadas"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "carona_valida_capacidade"
  BEFORE INSERT OR UPDATE OF "vagas_ofertadas", "veiculo_id" ON "carona"
  FOR EACH ROW
  EXECUTE FUNCTION validar_capacidade_da_carona();
