/**
 * Especificacao OpenAPI servida em /docs. E a fonte da verdade do contrato:
 * se esta divergindo do codigo, o bug esta aqui.
 *
 * Caronas e reservas entram no D3/D4 - nao documentar antes de existir, para o
 * frontend nao construir tela em cima de endpoint que ainda nao responde.
 */

const erro = {
  type: 'object',
  properties: {
    erro: {
      type: 'string',
      enum: ['VALIDACAO', 'NAO_AUTENTICADO', 'SEM_PERMISSAO', 'NAO_ENCONTRADO', 'CONFLITO', 'REGRA_NEGOCIO'],
    },
    mensagem: { type: 'string', description: 'Texto em portugues, pronto para exibir ao usuario final.' },
    campo: { type: 'string', nullable: true, description: 'Campo do payload que causou o erro, quando aplicavel.' },
  },
  example: {
    erro: 'CONFLITO',
    mensagem: 'Ja existe um veiculo cadastrado com a placa MHT4A21.',
    campo: 'placa',
  },
} as const;

function respostaErro(descricao: string) {
  return {
    description: descricao,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
  };
}

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'ViaCar API',
    version: '1.0.0',
    description: [
      'API de gestao de caronas corporativas — Case 14, Equipe Draft.',
      '',
      '**Autenticacao:** todas as rotas exigem `Authorization: Bearer <token>`, exceto `/health` e `/auth/*`.',
      'O token vale 8 horas — a jornada de trabalho, para cobrir da ida ate a carona da volta.',
      '',
      '**Datas** em ISO 8601 UTC. **Ids** em UUID v4. **Corpo** em JSON camelCase.',
      '',
      '_Caronas e reservas entram no D3/D4 e ainda nao aparecem aqui._',
    ].join('\n'),
  },
  servers: [{ url: 'http://localhost:3333', description: 'Desenvolvimento local' }],
  tags: [
    { name: 'Sistema', description: 'Disponibilidade da API' },
    { name: 'Autenticacao', description: 'Cadastro e login de funcionarios' },
    { name: 'Perfil', description: 'Dados do funcionario logado' },
    { name: 'Veiculos', description: 'Carros do funcionario — a capacidade define o teto da RN-01' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Erro: erro,
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string' },
          email: { type: 'string', format: 'email' },
          matricula: { type: 'string' },
          telefone: { type: 'string', nullable: true },
          bairro: { type: 'string', description: 'Usado para aproximar quem mora perto na busca de caronas.' },
          ativo: { type: 'boolean' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
        example: {
          id: '9f1c4a2e-77b0-4d31-a0c8-1e5b3d9f0a12',
          nome: 'Willian Squena',
          email: 'willian@viacar.com.br',
          matricula: 'F-10428',
          telefone: '(47) 99812-4455',
          bairro: 'Costa e Silva',
          ativo: true,
          criadoEm: '2026-09-10T13:02:11.000Z',
        },
      },
      RespostaAutenticacao: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT valido por 8 horas.' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
      Veiculo: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          placa: { type: 'string', description: 'Normalizada em maiusculas, sem hifen.' },
          modelo: { type: 'string' },
          cor: { type: 'string' },
          capacidadePassageiros: {
            type: 'integer',
            minimum: 1,
            maximum: 8,
            description: 'NAO inclui o motorista. Um Civic de 5 lugares tem capacidade 4.',
          },
          ativo: { type: 'boolean' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
        example: {
          id: '3d7a11c4-9e02-4b8a-96f1-c0d4e7a51b33',
          usuarioId: '9f1c4a2e-77b0-4d31-a0c8-1e5b3d9f0a12',
          placa: 'MHT4A21',
          modelo: 'Honda Civic',
          cor: 'Prata',
          capacidadePassageiros: 4,
          ativo: true,
          criadoEm: '2026-09-11T09:15:00.000Z',
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Verifica API e banco',
        description: 'Consulta o banco de verdade — nao responde "ok" so por estar de pe.',
        security: [],
        responses: {
          200: {
            description: 'API e banco respondendo',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  servico: 'viacar-api',
                  banco: 'conectado',
                  ambiente: 'development',
                  horario: '2026-09-11T09:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/auth/registrar': {
      post: {
        tags: ['Autenticacao'],
        summary: 'Cadastra um funcionario',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'email', 'senha', 'matricula', 'bairro'],
                properties: {
                  nome: { type: 'string', minLength: 3, maxLength: 120 },
                  email: { type: 'string', format: 'email', maxLength: 160 },
                  senha: { type: 'string', minLength: 8, maxLength: 72 },
                  matricula: { type: 'string', minLength: 2, maxLength: 20 },
                  telefone: { type: 'string', maxLength: 20 },
                  bairro: { type: 'string', minLength: 2, maxLength: 80 },
                },
              },
              example: {
                nome: 'Willian Squena',
                email: 'willian@viacar.com.br',
                senha: 'viacar123',
                matricula: 'F-10428',
                telefone: '(47) 99812-4455',
                bairro: 'Costa e Silva',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Funcionario cadastrado e ja autenticado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RespostaAutenticacao' } },
            },
          },
          400: respostaErro('Payload invalido'),
          409: respostaErro('E-mail ou matricula ja cadastrados'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticacao'],
        summary: 'Autentica e devolve o token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  senha: { type: 'string' },
                },
              },
              example: { email: 'willian@viacar.com.br', senha: 'viacar123' },
            },
          },
        },
        responses: {
          200: {
            description: 'Autenticado',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RespostaAutenticacao' } },
            },
          },
          401: respostaErro('E-mail ou senha incorretos'),
          403: respostaErro('Cadastro inativo'),
        },
      },
    },
    '/usuarios/me': {
      get: {
        tags: ['Perfil'],
        summary: 'Dados do funcionario logado',
        responses: {
          200: {
            description: 'Perfil',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } },
          },
          401: respostaErro('Token ausente, invalido ou expirado'),
        },
      },
      patch: {
        tags: ['Perfil'],
        summary: 'Atualiza contato e bairro',
        description: 'Nome, e-mail e matricula sao dados funcionais e nao se editam por aqui.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  telefone: { type: 'string', nullable: true, maxLength: 20 },
                  bairro: { type: 'string', minLength: 2, maxLength: 80 },
                },
              },
              example: { telefone: '(47) 99812-4455', bairro: 'Bucarein' },
            },
          },
        },
        responses: {
          200: {
            description: 'Perfil atualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } },
          },
          400: respostaErro('Nenhum campo informado ou payload invalido'),
          401: respostaErro('Nao autenticado'),
        },
      },
    },
    '/veiculos': {
      post: {
        tags: ['Veiculos'],
        summary: 'Cadastra um veiculo',
        description:
          'A capacidade informada vira o teto da RN-01: nenhuma carona deste veiculo podera ofertar mais vagas do que isto.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['placa', 'modelo', 'cor', 'capacidadePassageiros'],
                properties: {
                  placa: { type: 'string', example: 'MHT4A21' },
                  modelo: { type: 'string', maxLength: 80 },
                  cor: { type: 'string', maxLength: 40 },
                  capacidadePassageiros: { type: 'integer', minimum: 1, maximum: 8 },
                },
              },
              example: { placa: 'MHT4A21', modelo: 'Honda Civic', cor: 'Prata', capacidadePassageiros: 4 },
            },
          },
        },
        responses: {
          201: {
            description: 'Veiculo cadastrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } },
          },
          400: respostaErro('Placa fora do formato ou capacidade fora de 1..8'),
          401: respostaErro('Nao autenticado'),
          409: respostaErro('Placa ja cadastrada'),
        },
      },
      get: {
        tags: ['Veiculos'],
        summary: 'Lista os veiculos do funcionario logado',
        description: 'Retorna apenas os ativos.',
        responses: {
          200: {
            description: 'Lista de veiculos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Veiculo' } },
              },
            },
          },
          401: respostaErro('Nao autenticado'),
        },
      },
    },
    '/veiculos/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Veiculos'],
        summary: 'Detalhe de um veiculo',
        responses: {
          200: {
            description: 'Veiculo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } },
          },
          401: respostaErro('Nao autenticado'),
          403: respostaErro('O veiculo pertence a outro funcionario'),
          404: respostaErro('Veiculo nao encontrado'),
        },
      },
      patch: {
        tags: ['Veiculos'],
        summary: 'Atualiza um veiculo',
        description:
          'Baixar a capacidade e bloqueado se alguma carona ja publicada oferta mais vagas do que a nova capacidade.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  placa: { type: 'string' },
                  modelo: { type: 'string' },
                  cor: { type: 'string' },
                  capacidadePassageiros: { type: 'integer', minimum: 1, maximum: 8 },
                },
              },
              example: { cor: 'Preto', capacidadePassageiros: 3 },
            },
          },
        },
        responses: {
          200: {
            description: 'Veiculo atualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Veiculo' } } },
          },
          400: respostaErro('Payload invalido'),
          401: respostaErro('Nao autenticado'),
          403: respostaErro('O veiculo pertence a outro funcionario'),
          404: respostaErro('Veiculo nao encontrado'),
          409: respostaErro('Placa ja usada por outro veiculo'),
          422: respostaErro('Capacidade menor que as vagas ja ofertadas em uma carona'),
        },
      },
      delete: {
        tags: ['Veiculos'],
        summary: 'Remove um veiculo',
        description:
          'Soft delete: o registro fica com `ativo: false`. O veiculo nunca e apagado porque as caronas passadas apontam para ele.',
        responses: {
          204: { description: 'Veiculo inativado' },
          401: respostaErro('Nao autenticado'),
          403: respostaErro('O veiculo pertence a outro funcionario'),
          404: respostaErro('Veiculo nao encontrado'),
          422: respostaErro('Veiculo com carona agendada'),
        },
      },
    },
  },
} as const;
