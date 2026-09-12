import type { Veiculo } from '@prisma/client';

export interface VeiculoPublico {
  id: string;
  placa: string;
  modelo: string;
  cor: string;
  capacidadePassageiros: number;
  ativo: boolean;
  criadoEm: Date;
}

/** Versão reduzida, para aparecer embutida dentro de outro recurso. */
export interface VeiculoResumo {
  placa: string;
  modelo: string;
  cor: string;
  capacidadePassageiros: number;
}

/**
 * Único caminho pelo qual um Veículo sai da API. O `usuarioId` fica de fora:
 * quem lista os próprios veículos já sabe que são seus, e numa carona o dono
 * aparece no campo `motorista`.
 */
export function paraPublico(veiculo: Veiculo): VeiculoPublico {
  return {
    id: veiculo.id,
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    cor: veiculo.cor,
    capacidadePassageiros: veiculo.capacidadePassageiros,
    ativo: veiculo.ativo,
    criadoEm: veiculo.criadoEm,
  };
}

export function paraResumo(
  veiculo: Pick<Veiculo, 'placa' | 'modelo' | 'cor' | 'capacidadePassageiros'>,
): VeiculoResumo {
  return {
    placa: veiculo.placa,
    modelo: veiculo.modelo,
    cor: veiculo.cor,
    capacidadePassageiros: veiculo.capacidadePassageiros,
  };
}
