import { describe, expect, it } from 'vitest';
import { combinarDiaEHorario, horaParaTexto, textoParaHora } from '../../src/shared/utils/horario';

describe('conversão de hora do dia', () => {
  it('preserva o horário no ida e volta entre texto e TIME', () => {
    for (const hora of ['00:00', '07:30', '12:00', '17:40', '23:59']) {
      expect(horaParaTexto(textoParaHora(hora))).toBe(hora);
    }
  });

  it('recusa horário fora do formato HH:mm', () => {
    for (const invalido of ['7:30', '24:00', '07:60', '0730', 'manhã', '']) {
      expect(() => textoParaHora(invalido)).toThrow();
    }
  });
});

describe('combinarDiaEHorario', () => {
  it('converte a hora de parede da empresa para o instante UTC correto', () => {
    // 07:30 em Joinville (UTC-3) é 10:30 UTC. Gravar 07:30Z faria a interface
    // do funcionário exibir 04:30.
    const resultado = combinarDiaEHorario(new Date('2026-09-14T00:00:00Z'), textoParaHora('07:30'));

    expect(resultado.toISOString()).toBe('2026-09-14T10:30:00.000Z');
  });

  it('descarta a hora do dia informado e usa só a da rota', () => {
    const horario = textoParaHora('17:40');
    const deManha = combinarDiaEHorario(new Date('2026-09-14T02:15:33.123Z'), horario);
    const deNoite = combinarDiaEHorario(new Date('2026-09-14T22:47:09.887Z'), horario);

    expect(deManha.toISOString()).toBe(deNoite.toISOString());
  });

  /**
   * Esta é a garantia que sustenta o `UNIQUE (rota_id, data_partida)`.
   * A constraint só impede carona duplicada no mesmo dia se duas requisições
   * para aquele dia produzirem exatamente o mesmo timestamp — ver armadilha 3.1
   * em docs/debitos-tecnicos.md.
   */
  it('produz o mesmo instante para qualquer momento do mesmo dia', () => {
    const horario = textoParaHora('07:30');
    const momentos = [
      '2026-09-14T00:00:00.000Z',
      '2026-09-14T09:31:07.001Z',
      '2026-09-14T23:59:59.999Z',
    ].map((m) => combinarDiaEHorario(new Date(m), horario).toISOString());

    expect(new Set(momentos).size).toBe(1);
  });
});
