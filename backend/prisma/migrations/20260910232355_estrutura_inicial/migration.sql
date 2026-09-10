-- CreateEnum
CREATE TYPE "Sentido" AS ENUM ('IDA', 'VOLTA');

-- CreateEnum
CREATE TYPE "StatusCarona" AS ENUM ('ABERTA', 'LOTADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('CONFIRMADA', 'CANCELADA', 'REALIZADA', 'NAO_COMPARECEU');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "matricula" VARCHAR(20) NOT NULL,
    "telefone" VARCHAR(20),
    "bairro" VARCHAR(80) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "placa" VARCHAR(8) NOT NULL,
    "modelo" VARCHAR(80) NOT NULL,
    "cor" VARCHAR(40) NOT NULL,
    "capacidade_passageiros" SMALLINT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota" (
    "id" UUID NOT NULL,
    "motorista_id" UUID NOT NULL,
    "apelido" VARCHAR(120) NOT NULL,
    "origem_endereco" VARCHAR(200) NOT NULL,
    "origem_bairro" VARCHAR(80) NOT NULL,
    "destino_endereco" VARCHAR(200) NOT NULL,
    "destino_bairro" VARCHAR(80) NOT NULL,
    "horario_partida" TIME(0) NOT NULL,
    "sentido" "Sentido" NOT NULL,
    "dias_semana" SMALLINT[],
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carona" (
    "id" UUID NOT NULL,
    "rota_id" UUID NOT NULL,
    "veiculo_id" UUID NOT NULL,
    "data_partida" TIMESTAMPTZ(3) NOT NULL,
    "vagas_ofertadas" SMALLINT NOT NULL,
    "status" "StatusCarona" NOT NULL DEFAULT 'ABERTA',
    "observacao" VARCHAR(255),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "carona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL,
    "carona_id" UUID NOT NULL,
    "passageiro_id" UUID NOT NULL,
    "status" "StatusReserva" NOT NULL DEFAULT 'CONFIRMADA',
    "ponto_embarque" VARCHAR(160),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelado_em" TIMESTAMPTZ(3),

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_matricula_key" ON "usuario"("matricula");

-- CreateIndex
CREATE INDEX "usuario_bairro_idx" ON "usuario"("bairro");

-- CreateIndex
CREATE UNIQUE INDEX "veiculo_placa_key" ON "veiculo"("placa");

-- CreateIndex
CREATE INDEX "veiculo_usuario_id_idx" ON "veiculo"("usuario_id");

-- CreateIndex
CREATE INDEX "rota_motorista_id_idx" ON "rota"("motorista_id");

-- CreateIndex
CREATE INDEX "rota_origem_bairro_destino_bairro_sentido_idx" ON "rota"("origem_bairro", "destino_bairro", "sentido");

-- CreateIndex
CREATE INDEX "carona_data_partida_status_idx" ON "carona"("data_partida", "status");

-- CreateIndex
CREATE UNIQUE INDEX "carona_rota_id_data_partida_key" ON "carona"("rota_id", "data_partida");

-- CreateIndex
CREATE INDEX "reserva_carona_id_idx" ON "reserva"("carona_id");

-- CreateIndex
CREATE INDEX "reserva_passageiro_id_idx" ON "reserva"("passageiro_id");

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carona" ADD CONSTRAINT "carona_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carona" ADD CONSTRAINT "carona_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_carona_id_fkey" FOREIGN KEY ("carona_id") REFERENCES "carona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_passageiro_id_fkey" FOREIGN KEY ("passageiro_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
