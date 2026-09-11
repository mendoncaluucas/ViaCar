import type { Carona, Rota, Usuario, Veiculo } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { combinarDiaEHorario, textoParaHora } from '../src/shared/utils/horario';

/**
 * Fábricas de dados para os testes. Cada uma preenche valores padrão plausíveis
 * e aceita sobrescrita parcial, para que cada teste declare só o que é relevante
 * para ele — e quem lê o teste enxergue a regra, não o preenchimento.
 */

let contador = 0;
const proximo = (): number => ++contador;

export async function criarUsuario(dados: Partial<Usuario> = {}): Promise<Usuario> {
  const n = proximo();
  return prisma.usuario.create({
    data: {
      nome: `Funcionario ${n}`,
      email: `funcionario${n}@viacar.com.br`,
      senhaHash: 'hash-de-teste',
      matricula: `F-${String(n).padStart(5, '0')}`,
      bairro: 'Costa e Silva',
      ...dados,
    },
  });
}

export async function criarVeiculo(
  usuarioId: string,
  dados: Partial<Veiculo> = {},
): Promise<Veiculo> {
  const n = proximo();
  return prisma.veiculo.create({
    data: {
      usuarioId,
      placa: `TST${String(n).padStart(1, '0')}A${String(n % 100).padStart(2, '0')}`,
      modelo: 'Honda Civic',
      cor: 'Prata',
      capacidadePassageiros: 4,
      ...dados,
    },
  });
}

export async function criarRota(motoristaId: string, dados: Partial<Rota> = {}): Promise<Rota> {
  return prisma.rota.create({
    data: {
      motoristaId,
      apelido: 'Costa e Silva -> Empresa',
      origemEndereco: 'Rua Ministro Calogeras, 1200',
      origemBairro: 'Costa e Silva',
      destinoEndereco: 'Rod. Paulo Schroeder, 3000',
      destinoBairro: 'Zona Industrial Norte',
      horarioPartida: textoParaHora('07:30'),
      sentido: 'IDA',
      diasSemana: [1, 2, 3, 4, 5],
      ...dados,
    },
  });
}

/** Data deslocada em dias a partir de agora. Use negativo para o passado. */
export function emDias(dias: number): Date {
  const data = new Date();
  data.setUTCDate(data.getUTCDate() + dias);
  return data;
}

export async function criarCarona(
  rota: Rota,
  veiculoId: string,
  dados: Partial<Carona> & { dia?: Date } = {},
): Promise<Carona> {
  const { dia, ...resto } = dados;
  return prisma.carona.create({
    data: {
      rotaId: rota.id,
      veiculoId,
      dataPartida: combinarDiaEHorario(dia ?? emDias(1), rota.horarioPartida),
      vagasOfertadas: 3,
      ...resto,
    },
  });
}
