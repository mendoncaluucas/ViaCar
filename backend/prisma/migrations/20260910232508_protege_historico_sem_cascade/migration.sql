-- DropForeignKey
ALTER TABLE "reserva" DROP CONSTRAINT "reserva_carona_id_fkey";

-- DropForeignKey
ALTER TABLE "rota" DROP CONSTRAINT "rota_motorista_id_fkey";

-- DropForeignKey
ALTER TABLE "veiculo" DROP CONSTRAINT "veiculo_usuario_id_fkey";

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota" ADD CONSTRAINT "rota_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_carona_id_fkey" FOREIGN KEY ("carona_id") REFERENCES "carona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
