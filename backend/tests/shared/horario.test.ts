import { describe, expect, it } from 'vitest';
import {
  combinarDiaEHorario,
  horaParaTexto,
  inicioDoDiaAtual,
  intervaloDoDia,
  textoParaHora,
} from '../../src/shared/utils/horario';

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

describe('inicioDoDiaAtual', () => {
  it('devolve meia-noite no fuso da empresa, não uma hora arbitrária', () => {
    // Meia-noite em UTC-3 é 03:00 UTC.
    expect(inicioDoDiaAtual().toISOString()).toMatch(/T03:00:00\.000Z$/);
  });

  it('cai no passado, mas nunca mais de 24 horas atrás', () => {
    const inicio = inicioDoDiaAtual().getTime();
    const agora = Date.now();

    expect(inicio).toBeLessThanOrEqual(agora);
    expect(agora - inicio).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('coincide com o começo do intervalo do dia de hoje', () => {
    const hojeLocal = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

    expect(inicioDoDiaAtual().toISOString()).toBe(intervaloDoDia(hojeLocal).inicio.toISOString());
  });
});

describe('intervaloDoDia', () => {
  it('cobre exatamente 24 horas a partir da meia-noite local', () => {
    const { inicio, fim } = intervaloDoDia('2026-09-15');

    expect(inicio.toISOString()).toBe('2026-09-15T03:00:00.000Z');
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('inclui a carona da volta das 17:40, que em UTC cai no mesmo dia', () => {
    const { inicio, fim } = intervaloDoDia('2026-09-15');
    const volta = combinarDiaEHorario('2026-09-15', textoParaHora('17:40'));

    expect(volta.getTime()).toBeGreaterThanOrEqual(inicio.getTime());
    expect(volta.getTime()).toBeLessThan(fim.getTime());
  });
});
