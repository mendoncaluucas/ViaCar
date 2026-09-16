import { useEffect, useState } from "react";
import "./App.css";

import {
  criarCarona,
  criarReserva,
  getMeuPerfil,
  getUsuarioSalvo,
  isAuthenticated,
  listarCaronas,
  listarMinhasCaronas,
  listarMinhasReservas,
  listarRotas,
  listarVeiculos,
  login,
  logoutUsuario,
  registrarUsuario,
} from "../api";

import type {
  Carona,
  Reserva,
  Rota,
  Usuario,
  Veiculo,
} from "./types";

type Tela =
  | "dashboard"
  | "buscar"
  | "minhas-caronas"
  | "reservas"
  | "veiculos"
  | "rotas"
  | "perfil"
  | "oferecer";

function App() {
  const [autenticado, setAutenticado] = useState(isAuthenticated());

  const [usuario, setUsuario] = useState<Usuario | null>(
    getUsuarioSalvo()
  );

  const [tela, setTela] = useState<Tela>("dashboard");

  function handleLogin(usuarioLogado: Usuario) {
    setUsuario(usuarioLogado);
    setAutenticado(true);
    setTela("dashboard");
  }

  function handleLogout() {
    logoutUsuario();
    setUsuario(null);
    setAutenticado(false);
  }

  if (!autenticado) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Sidebar
        tela={tela}
        usuario={usuario}
        onNavigate={setTela}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Header usuario={usuario} />

        {tela === "dashboard" && (
          <Dashboard
            usuario={usuario}
            onNavigate={setTela}
          />
        )}

        {tela === "buscar" && <BuscarCaronas />}

        {tela === "oferecer" && (
  <OferecerCarona
    onSuccess={() => setTela("minhas-caronas")}
    onNavigate={setTela}
  />
)}
        {tela === "minhas-caronas" && (
          <MinhasCaronas />
        )}

        {tela === "reservas" && (
          <MinhasReservas />
        )}

        {tela === "veiculos" && (
          <MeusVeiculos />
        )}

        {tela === "rotas" && (
          <MinhasRotas />
        )}

        {tela === "perfil" && (
          <MeuPerfil
            usuario={usuario}
            onUpdate={setUsuario}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// LOGIN / CADASTRO
// ==========================================

// ==========================================
// LOGIN / CADASTRO
// ==========================================

function LoginScreen({
  onLogin,
}: {
  onLogin: (usuario: Usuario) => void;
}) {
  const [modoCadastro, setModoCadastro] = useState(false);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [bairro, setBairro] = useState("");
  const [telefone, setTelefone] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function trocarModo() {
    setModoCadastro((atual) => !atual);
    setErro("");
    setSucesso("");
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      const response = await login(email, senha);

      onLogin(response.usuario);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCadastro(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      const response = await registrarUsuario({
        nome,
        email,
        senha,
        matricula,
        bairro,
        telefone: telefone || undefined,
      });

      localStorage.setItem("viacar_token", response.token);

      localStorage.setItem(
        "viacar_usuario",
        JSON.stringify(response.usuario)
      );

      setSucesso("Conta criada com sucesso.");

      setTimeout(() => {
        onLogin(response.usuario);
      }, 400);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar sua conta."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="brand">
          <div className="brand-icon">V</div>

          <div>
            <h1>ViaCar</h1>
            <span>Carona corporativa</span>
          </div>
        </div>

        <div className="login-header">
          <span className="auth-kicker">
            {modoCadastro ? "NOVO CADASTRO" : "ACESSO"}
          </span>

          <h2>
            {modoCadastro
              ? "Crie sua conta"
              : "Bem-vindo de volta"}
          </h2>

          <p>
            {modoCadastro
              ? "Cadastre seus dados para começar a utilizar o ViaCar."
              : "Entre para encontrar ou oferecer uma carona."}
          </p>
        </div>

        {modoCadastro ? (
          <form onSubmit={handleCadastro}>

            <div className="form-section-title">
              Dados pessoais
            </div>

            <label>
              Nome completo

              <input
                type="text"
                value={nome}
                onChange={(event) =>
                  setNome(event.target.value)
                }
                placeholder="Digite seu nome completo"
                required
              />
            </label>

            <label>
              E-mail corporativo

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="seu@email.com"
                required
              />
            </label>

            <div className="form-row">

              <label>
                Bairro

                <input
                  type="text"
                  value={bairro}
                  onChange={(event) =>
                    setBairro(event.target.value)
                  }
                  placeholder="Ex.: Centro"
                  required
                />
              </label>

              <label>
                Telefone

                <span className="optional-label">
                  opcional
                </span>

                <input
                  type="tel"
                  value={telefone}
                  onChange={(event) =>
                    setTelefone(event.target.value)
                  }
                  placeholder="(47) 99999-9999"
                />
              </label>

            </div>

            <div className="form-section-title">
              Dados corporativos
            </div>

            <div className="form-row">

              <label>
                Matrícula

                <input
                  type="text"
                  value={matricula}
                  onChange={(event) =>
                    setMatricula(event.target.value)
                  }
                  placeholder="Ex.: W001"
                  required
                />
              </label>

              <label>
                Senha

                <input
                  type="password"
                  value={senha}
                  onChange={(event) =>
                    setSenha(event.target.value)
                  }
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  required
                />
              </label>

            </div>

            <div className="password-hint">
              A senha deve possuir pelo menos 8 caracteres.
            </div>

            {erro && (
              <div className="error-message">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="success-message">
                {sucesso}
              </div>
            )}

            <button
              className="primary-button auth-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Criando conta..."
                : "Criar minha conta"}
            </button>

            <div className="login-switch">
              <span>Já possui uma conta?</span>

              <button
                type="button"
                onClick={trocarModo}
              >
                Entrar
              </button>
            </div>

          </form>
        ) : (
          <form onSubmit={handleLogin}>

            <label>
              E-mail

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="seu@email.com"
                required
              />
            </label>

            <label>
              Senha

              <input
                type="password"
                value={senha}
                onChange={(event) =>
                  setSenha(event.target.value)
                }
                placeholder="Sua senha"
                required
              />
            </label>

            {erro && (
              <div className="error-message">
                {erro}
              </div>
            )}

            <button
              className="primary-button auth-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="login-switch">
              <span>Não possui uma conta?</span>

              <button
                type="button"
                onClick={trocarModo}
              >
                Criar conta
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

// ==========================================
// SIDEBAR
// ==========================================

function Sidebar({
  tela,
  usuario,
  onNavigate,
  onLogout,
}: {
  tela: Tela;
  usuario: Usuario | null;
  onNavigate: (tela: Tela) => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">V</div>

        <div>
          <strong>ViaCar</strong>
          <span>Corporativo</span>
        </div>
      </div>

      <nav>
        <button
          className={
            tela === "dashboard"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("dashboard")}
        >
          <span>⌂</span>
          Início
        </button>

        <button
          className={
            tela === "buscar"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("buscar")}
        >
          <span>⌕</span>
          Buscar carona
        </button>

        <button
        className={
            tela === "oferecer"
              ? "nav-item active"
              : "nav-item"
         }
          onClick={() => onNavigate("oferecer")}
        >
         <span>➕</span>
          Oferecer carona
        </button>

        <button
          className={
            tela === "minhas-caronas"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() =>
            onNavigate("minhas-caronas")
          }
        >
          <span>🚗</span>
          Minhas caronas
        </button>

        <button
          className={
            tela === "reservas"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("reservas")}
        >
          <span>🎫</span>
          Minhas reservas
        </button>

        <div className="nav-section">
          <span>GERENCIAMENTO</span>
        </div>

        <button
          className={
            tela === "veiculos"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("veiculos")}
        >
          <span>🚙</span>
          Meus veículos
        </button>

        <button
          className={
            tela === "rotas"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("rotas")}
        >
          <span>🛣️</span>
          Minhas rotas
        </button>

        <button
          className={
            tela === "perfil"
              ? "nav-item active"
              : "nav-item"
          }
          onClick={() => onNavigate("perfil")}
        >
          <span>👤</span>
          Meu perfil
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-mini">
          <div className="avatar">
            {usuario?.nome
              ?.charAt(0)
              .toUpperCase() || "U"}
          </div>

          <div>
            <strong>
              {usuario?.nome || "Usuário"}
            </strong>

            <span>
              {usuario?.bairro || ""}
            </span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          Sair
        </button>
      </div>
    </aside>
  );
}

// ==========================================
// HEADER
// ==========================================

function Header({
  usuario,
}: {
  usuario: Usuario | null;
}) {
  return (
    <header className="topbar">
      <div>
        <span className="topbar-label">
          VIAJAR JUNTOS
        </span>

        <h1>
          Olá, {usuario?.nome?.split(" ")[0] || "usuário"}!
        </h1>
      </div>

      <div className="topbar-user">
        <div className="avatar">
          {usuario?.nome
            ?.charAt(0)
            .toUpperCase() || "U"}
        </div>

        <div>
          <strong>{usuario?.nome}</strong>
          <span>{usuario?.email}</span>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// DASHBOARD
// ==========================================

function Dashboard({
  usuario,
  onNavigate,
}: {
  usuario: Usuario | null;
  onNavigate: (tela: Tela) => void;
}) {
  const [catches, setCatches] = useState<Carona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listarCaronas();

        setCatches(data);
      } catch {
        setCatches([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const primeiroNome =
    usuario?.nome?.split(" ")[0] || "Usuário";

  return (
    <div className="dashboard">

      {/* ==========================================
          BOAS-VINDAS
      ========================================== */}

      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-kicker">
            PAINEL PRINCIPAL
          </span>

          <h1>
            Olá, {primeiroNome}.
          </h1>

          <p>
            Encontre uma carona ou ofereça uma vaga
            para seus colegas.
          </p>
        </div>

        <div className="dashboard-welcome-actions">

          <button
            className="secondary-button"
            onClick={() => onNavigate("oferecer")}
          >
            Oferecer carona
          </button>

          <button
            className="primary-button"
            onClick={() => onNavigate("oferecer")}
          >
            Buscar carona
          </button>

        </div>
      </section>

      {/* ==========================================
          ESTATÍSTICAS
      ========================================== */}

      <section className="dashboard-stats">

        <button
          className="dashboard-stat"
          onClick={() => onNavigate("buscar")}
        >
          <div className="dashboard-stat-icon blue">
            🚗
          </div>

          <div>
            <span>Carona disponíveis</span>

            <strong>
              {loading ? "—" : catches.length}
            </strong>
          </div>
        </button>

        <button
          className="dashboard-stat"
          onClick={() => onNavigate("reservas")}
        >
          <div className="dashboard-stat-icon green">
            ✓
          </div>

          <div>
            <span>Minhas reservas</span>

            <strong>—</strong>
          </div>
        </button>

        <button
          className="dashboard-stat"
          onClick={() => onNavigate("minhas-caronas")}
        >
          <div className="dashboard-stat-icon orange">
            ↑
          </div>

          <div>
            <span>Minhas caronas</span>

            <strong>—</strong>
          </div>
        </button>

      </section>

      {/* ==========================================
          ACESSO RÁPIDO
      ========================================== */}

      <section className="dashboard-shortcuts">

        <div className="section-heading">

          <div>
            <span className="section-kicker">
              ACESSO RÁPIDO
            </span>

            <h2>
              O que você deseja fazer?
            </h2>
          </div>

        </div>

        <div className="shortcut-grid">

          <button
            className="shortcut-card"
            onClick={() => onNavigate("buscar")}
          >
            <div className="shortcut-icon blue">
              🔎
            </div>

            <div>
              <strong>
                Buscar carona
              </strong>

              <p>
                Encontre funcionários que fazem
                um trajeto próximo ao seu.
              </p>
            </div>

            <span className="shortcut-arrow">
              →
            </span>
          </button>

          <button
            className="shortcut-card"
            onClick={() => onNavigate("minhas-caronas")}
          >
            <div className="shortcut-icon green">
              🚘
            </div>

            <div>
              <strong>
                Oferecer carona
              </strong>

              <p>
                Publique uma carona e compartilhe
                suas vagas com colegas.
              </p>
            </div>

            <span className="shortcut-arrow">
              →
            </span>
          </button>

          <button
            className="shortcut-card"
            onClick={() => onNavigate("veiculos")}
          >
            <div className="shortcut-icon orange">
              🚙
            </div>

            <div>
              <strong>
                Meus veículos
              </strong>

              <p>
                Consulte os veículos cadastrados
                no seu perfil.
              </p>
            </div>

            <span className="shortcut-arrow">
              →
            </span>
          </button>

        </div>

      </section>

      {/* ==========================================
          PRÓXIMAS CARONAS
      ========================================== */}

      <section className="section">

        <div className="section-heading">

          <div>
            <span className="section-kicker">
              DISPONÍVEIS AGORA
            </span>

            <h2>
              Próximas caronas
            </h2>
          </div>

          <button
            className="text-button"
            onClick={() => onNavigate("buscar")}
          >
            Ver todas →
          </button>

        </div>

        {loading ? (
          <div className="loading">
            Carregando caronas...
          </div>
        ) : catches.length === 0 ? (
          <EmptyState
            title="Nenhuma carona disponível"
            description="Ainda não existem caronas cadastradas. Que tal oferecer a primeira?"
          />
        ) : (
          <div className="ride-grid">

            {catches.slice(0, 3).map((carona) => (
              <CaronaCard
                key={carona.id}
                carona={carona}
                onReserve={() => onNavigate("buscar")}
              />
            ))}

          </div>
        )}

      </section>

      {/* ==========================================
          INFORMAÇÕES DO USUÁRIO
      ========================================== */}

      <section className="dashboard-footer-grid">

        <div className="dashboard-profile-card">

          <div className="dashboard-profile-avatar">
            {primeiroNome.charAt(0).toUpperCase()}
          </div>

          <div>

            <span className="section-kicker">
              SEU PERFIL
            </span>

            <h3>
              {usuario?.nome || "Usuário"}
            </h3>

            <p>
              {usuario?.bairro
                ? `Morador do bairro ${usuario.bairro}`
                : "Bairro não informado"}
            </p>

          </div>

          <button
            className="text-button"
            onClick={() => onNavigate("perfil")}
          >
            Ver perfil →
          </button>

        </div>

        <div className="dashboard-impact-card">

          <div className="dashboard-impact-icon">
            🌱
          </div>

          <div>

            <span className="section-kicker">
              IMPACTO COLETIVO
            </span>

            <h3>
              Compartilhar transforma o trajeto.
            </h3>

            <p>
              Menos carros nas ruas, redução de custos
              e mais integração entre os funcionários.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}
// ==========================================
// OFERECER CARONA
// ==========================================

function OferecerCarona({
  onSuccess,
  onNavigate,
}: {
  onSuccess: () => void;
  onNavigate: (tela: Tela) => void;
}) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);

  const [rotaId, setRotaId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [data, setData] = useState("");
  const [vagasOfertadas, setVagasOfertadas] = useState(1);
  const [observacao, setObservacao] = useState("");

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      setErro("");

      try {
        const [rotasData, veiculosData] = await Promise.all([
          listarRotas(),
          listarVeiculos(),
        ]);

        setRotas(rotasData);
        setVeiculos(veiculosData);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar suas rotas e veículos."
        );
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  const rotaSelecionada = rotas.find(
    (rota) => rota.id === rotaId
  );

  const veiculoSelecionado = veiculos.find(
    (veiculo) => veiculo.id === veiculoId
  );

  useEffect(() => {
    if (veiculoSelecionado) {
      setVagasOfertadas(
        Math.min(
          vagasOfertadas,
          veiculoSelecionado.capacidadePassageiros
        )
      );
    }
  }, [veiculoSelecionado]);

  async function publicarCarona(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErro("");
    setSucesso("");

    if (!rotaId) {
      setErro("Selecione uma rota.");
      return;
    }

    if (!veiculoId) {
      setErro("Selecione um veículo.");
      return;
    }

    if (!data) {
      setErro("Informe a data da carona.");
      return;
    }

    if (!vagasOfertadas || vagasOfertadas < 1) {
      setErro("Ofereça pelo menos uma vaga.");
      return;
    }

    if (
      veiculoSelecionado &&
      vagasOfertadas >
        veiculoSelecionado.capacidadePassageiros
    ) {
      setErro(
        `Este veículo comporta no máximo ${veiculoSelecionado.capacidadePassageiros} passageiros.`
      );
      return;
    }

    setEnviando(true);

    try {
      await criarCarona({
        rotaId,
        veiculoId,
        data,
        vagasOfertadas,
        observacao: observacao.trim() || undefined,
      });

      setSucesso("Carona publicada com sucesso!");

      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar a carona."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageTitle
          kicker="MOTORISTA"
          title="Oferecer carona"
          description="Publique uma vaga para compartilhar seu trajeto com colegas."
        />

        <div className="loading">
          Carregando suas rotas e veículos...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        kicker="MOTORISTA"
        title="Oferecer carona"
        description="Escolha uma rota, um veículo e disponibilize suas vagas."
      />

      {rotas.length === 0 || veiculos.length === 0 ? (
        <div className="offer-empty-card">
          <div className="empty-icon">
            🚗
          </div>

          <h3>
            Prepare seu cadastro antes de oferecer
          </h3>

          <p>
            Para publicar uma carona, você precisa ter
            pelo menos uma rota e um veículo cadastrados.
          </p>

          <div className="offer-empty-actions">
            {rotas.length === 0 && (
              <button
                 type="button"
                 className="secondary-button"
                 onClick={() => onNavigate("rotas")}
              >
            Cadastrar rota
              </button>
                )}

            {veiculos.length === 0 && (
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate("veiculos")}
  >
    Cadastrar veículo
  </button>
              )}
          </div>
        </div>
      ) : (
        <form
          className="offer-form"
          onSubmit={publicarCarona}
        >
          <div className="offer-form-card">

            <div className="offer-form-header">
              <div>
                <span className="section-kicker">
                  DADOS DA CARONA
                </span>

                <h3>
                  Configure sua oferta
                </h3>

                <p>
                  O horário da carona será definido
                  automaticamente pela rota selecionada.
                </p>
              </div>
            </div>

            <div className="offer-form-grid">

              <label>
                Rota

                <select
                  value={rotaId}
                  onChange={(event) =>
                    setRotaId(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Selecione uma rota
                  </option>

                  {rotas.map((rota) => (
                    <option
                      key={rota.id}
                      value={rota.id}
                    >
                      {rota.apelido ||
                        `${rota.origemBairro} → ${rota.destinoBairro}`}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Veículo

                <select
                  value={veiculoId}
                  onChange={(event) =>
                    setVeiculoId(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Selecione um veículo
                  </option>

                  {veiculos.map((veiculo) => (
                    <option
                      key={veiculo.id}
                      value={veiculo.id}
                    >
                      {veiculo.modelo} ·{" "}
                      {veiculo.placa}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Data da carona

                <input
                  type="date"
                  value={data}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(event) =>
                    setData(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Vagas oferecidas

                <input
                  type="number"
                  min={1}
                  max={
                    veiculoSelecionado?.capacidadePassageiros ||
                    8
                  }
                  value={vagasOfertadas}
                  onChange={(event) =>
                    setVagasOfertadas(
                      Number(event.target.value)
                    )
                  }
                  required
                />

                {veiculoSelecionado && (
                  <small className="form-help">
                    Capacidade do veículo:{" "}
                    {veiculoSelecionado.capacidadePassageiros}{" "}
                    passageiros.
                  </small>
                )}
              </label>

            </div>

            {rotaSelecionada && (
              <div className="offer-preview">

                <div>
                  <span className="section-kicker">
                    ROTA SELECIONADA
                  </span>

                  <h3>
                    {rotaSelecionada.apelido ||
                      `${rotaSelecionada.origemBairro} → ${rotaSelecionada.destinoBairro}`}
                  </h3>
                </div>

                <div className="offer-preview-details">

                  <div>
                    <small>Origem</small>

                    <strong>
                      {rotaSelecionada.origemBairro}
                    </strong>

                    <span>
                      {rotaSelecionada.origemEndereco}
                    </span>
                  </div>

                  <div>
                    <small>Destino</small>

                    <strong>
                      {rotaSelecionada.destinoBairro}
                    </strong>

                    <span>
                      {rotaSelecionada.destinoEndereco}
                    </span>
                  </div>

                  <div>
                    <small>Horário</small>

                    <strong>
                      {rotaSelecionada.horarioPartida}
                    </strong>

                    <span>
                      {rotaSelecionada.sentido === "IDA"
                        ? "Ida"
                        : "Volta"}
                    </span>
                  </div>

                </div>
              </div>
            )}

            {veiculoSelecionado && (
              <div className="offer-vehicle-preview">

                <div className="vehicle-icon">
                  🚙
                </div>

                <div>
                  <span className="section-kicker">
                    VEÍCULO
                  </span>

                  <strong>
                    {veiculoSelecionado.modelo}
                  </strong>

                  <span>
                    {veiculoSelecionado.cor} ·{" "}
                    {veiculoSelecionado.placa}
                  </span>
                </div>

              </div>
            )}

            <label className="offer-observation">
              Observação

              <textarea
                value={observacao}
                onChange={(event) =>
                  setObservacao(event.target.value)
                }
                placeholder="Ex.: Posso combinar pontos de embarque próximos ao trajeto."
                maxLength={255}
                rows={4}
              />

              <small className="form-help">
                Opcional · máximo de 255 caracteres.
              </small>
            </label>

            {erro && (
              <div className="error-message">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="success-message">
                {sucesso}
              </div>
            )}

            <div className="offer-form-footer">

              <div>
                <strong>
                  Pronto para compartilhar?
                </strong>

                <span>
                  Sua carona ficará disponível para outros funcionários.
                </span>
              </div>

              <button
                className="primary-button"
                type="submit"
                disabled={enviando}
              >
                {enviando
                  ? "Publicando..."
                  : "Publicar carona"}
              </button>

            </div>

          </div>
        </form>
      )}
    </div>
  );
}

// ==========================================
// BUSCAR CARONAS
// ==========================================

function BuscarCaronas() {
  const [bairro, setBairro] = useState("");

  const [data, setData] = useState("");

  const [sentido, setSentido] = useState<
    "" | "IDA" | "VOLTA"
  >("");

  const [caronas, setCaronas] = useState<Carona[]>([]);

  const [loading, setLoading] = useState(false);

  const [erro, setErro] = useState("");

  const [caronaSelecionada, setCaronaSelecionada] =
    useState<Carona | null>(null);

  async function buscar() {
    setLoading(true);
    setErro("");

    try {
      const resultado = await listarCaronas({
        bairroOrigem: bairro || undefined,
        data: data || undefined,
        sentido: sentido || undefined,
      });

      setCaronas(resultado);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível buscar caronas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    buscar();
  }, []);

  return (
    <div>
      <PageTitle
        kicker="ENCONTRE SUA CARONA"
        title="Buscar caronas"
        description="Encontre colegas que fazem um trajeto parecido com o seu."
      />

      <div className="search-panel">
        <label>
          Bairro de origem

          <input
            value={bairro}
            onChange={(event) =>
              setBairro(event.target.value)
            }
            placeholder="Ex.: Costa e Silva"
          />
        </label>

        <label>
          Data

          <input
            type="date"
            value={data}
            onChange={(event) =>
              setData(event.target.value)
            }
          />
        </label>

        <label>
          Sentido

          <select
            value={sentido}
            onChange={(event) =>
              setSentido(
                event.target.value as
                  | ""
                  | "IDA"
                  | "VOLTA"
              )
            }
          >
            <option value="">Todos</option>
            <option value="IDA">Ida</option>
            <option value="VOLTA">Volta</option>
          </select>
        </label>

        <button
          className="primary-button search-button"
          onClick={buscar}
        >
          Buscar
        </button>
      </div>

      {erro && (
        <div className="error-message">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="loading">
          Buscando caronas...
        </div>
      ) : caronas.length === 0 ? (
        <EmptyState
          title="Nenhuma carona encontrada"
          description="Tente alterar os filtros de busca."
        />
      ) : (
        <div className="ride-list">
          {caronas.map((carona) => (
            <CaronaCard
              key={carona.id}
              carona={carona}
              onReserve={() =>
                setCaronaSelecionada(carona)
              }
            />
          ))}
        </div>
      )}

      {caronaSelecionada && (
        <ReservaModal
          carona={caronaSelecionada}
          onClose={() =>
            setCaronaSelecionada(null)
          }
          onSuccess={() => {
            setCaronaSelecionada(null);
            buscar();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// CARD DE CARONA
// ==========================================

function CaronaCard({
  carona,
  onReserve,
}: {
  carona: Carona;
  onReserve: () => void;
}) {
  const data = new Date(
    carona.dataPartida
  ).toLocaleDateString("pt-BR");

  const podeReservar =
    carona.status === "ABERTA" &&
    carona.vagasDisponiveis > 0;

  return (
    <article className="ride-card">
      <div className="ride-card-top">
        <div className="date-badge">
          <strong>
            {new Date(
              carona.dataPartida
            ).getDate()}
          </strong>

          <span>
            {new Date(
              carona.dataPartida
            ).toLocaleDateString(
              "pt-BR",
              { month: "short" }
            )}
          </span>
        </div>

        <div>
          <span className="status-badge">
            {getStatusLabel(carona.status)}
          </span>

          <h3>
            {carona.rota.apelido ||
              `${carona.rota.origemBairro} → ${carona.rota.destinoBairro}`}
          </h3>

          <span className="ride-date">
            {data} ·{" "}
            {carona.rota.horarioPartida}
          </span>
        </div>
      </div>

      <div className="route-line">
        <div>
          <span className="route-dot" />
          <strong>
            {carona.rota.origemBairro}
          </strong>
          <small>
            {carona.rota.origemEndereco}
          </small>
        </div>

        <div className="route-connector" />

        <div>
          <span className="route-dot destination" />
          <strong>
            {carona.rota.destinoBairro}
          </strong>
          <small>
            {carona.rota.destinoEndereco}
          </small>
        </div>
      </div>

      <div className="ride-details">
        <div>
          <span>👤</span>
          <div>
            <small>Motorista</small>
            <strong>
              {carona.motorista.nome}
            </strong>
          </div>
        </div>

        <div>
          <span>🚙</span>
          <div>
            <small>Veículo</small>
            <strong>
              {carona.veiculo.modelo}
            </strong>
          </div>
        </div>

        <div>
          <span>🪑</span>
          <div>
            <small>Vagas</small>
            <strong>
              {carona.vagasDisponiveis} disponíveis
            </strong>
          </div>
        </div>
      </div>

      {carona.observacao && (
        <div className="ride-observation">
          <strong>Observação:</strong>{" "}
          {carona.observacao}
        </div>
      )}

      <div className="ride-footer">
        <span>
          {carona.veiculo.cor} ·{" "}
          {carona.veiculo.placa}
        </span>

        <button
          className="primary-button small"
          disabled={!podeReservar}
          onClick={onReserve}
        >
          {podeReservar
            ? "Reservar vaga"
            : getStatusLabel(carona.status)}
        </button>
      </div>
    </article>
  );
}

// ==========================================
// MODAL RESERVA
// ==========================================

function ReservaModal({
  carona,
  onClose,
  onSuccess,
}: {
  carona: Carona;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pontoEmbarque, setPontoEmbarque] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [erro, setErro] = useState("");

  async function reservar() {
    setLoading(true);
    setErro("");

    try {
      await criarReserva(
        carona.id,
        pontoEmbarque || undefined
      );

      onSuccess();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a reserva."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <span className="section-kicker">
          RESERVA
        </span>

        <h2>
          Confirmar sua vaga?
        </h2>

        <p>
          Você vai reservar uma vaga com{" "}
          <strong>
            {carona.motorista.nome}
          </strong>.
        </p>

        <div className="modal-summary">
          <strong>
            {carona.rota.apelido ||
              `${carona.rota.origemBairro} → ${carona.rota.destinoBairro}`}
          </strong>

          <span>
            {new Date(
              carona.dataPartida
            ).toLocaleDateString("pt-BR")}{" "}
            às{" "}
            {carona.rota.horarioPartida}
          </span>
        </div>

        <label>
          Ponto de embarque

          <input
            value={pontoEmbarque}
            onChange={(event) =>
              setPontoEmbarque(event.target.value)
            }
            placeholder="Opcional"
          />
        </label>

        {erro && (
          <div className="error-message">
            {erro}
          </div>
        )}

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="primary-button"
            onClick={reservar}
            disabled={loading}
          >
            {loading
              ? "Reservando..."
              : "Confirmar reserva"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MINHAS CARONAS
// ==========================================

function MinhasCaronas() {
  const [caronas, setCaronas] = useState<Carona[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setCaronas(
          await listarMinhasCaronas()
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div>
      <PageTitle
        kicker="MOTORISTA"
        title="Minhas caronas"
        description="Acompanhe as caronas que você oferece."
      />

      {loading ? (
        <div className="loading">
          Carregando...
        </div>
      ) : caronas.length === 0 ? (
        <EmptyState
          title="Você ainda não oferece caronas"
          description="Crie uma rota e disponibilize uma carona."
        />
      ) : (
        <div className="ride-list">
          {caronas.map((carona) => (
            <CaronaCard
              key={carona.id}
              carona={carona}
              onReserve={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// RESERVAS
// ==========================================

function MinhasReservas() {
  const [reservas, setReservas] =
    useState<Reserva[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setReservas(
          await listarMinhasReservas()
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div>
      <PageTitle
        kicker="PASSAGEIRO"
        title="Minhas reservas"
        description="Acompanhe suas reservas de carona."
      />

      {loading ? (
        <div className="loading">
          Carregando reservas...
        </div>
      ) : reservas.length === 0 ? (
        <EmptyState
          title="Nenhuma reserva"
          description="Quando você reservar uma carona, ela aparecerá aqui."
        />
      ) : (
        <div className="reservation-list">
          {reservas.map((reserva) => (
            <div
              className="reservation-card"
              key={reserva.id}
            >
              <div>
                <span className="status-badge">
                  {getStatusReservaLabel(
                    reserva.status
                  )}
                </span>

                <h3>
                  {reserva.carona.rota.origemBairro}
                  {" → "}
                  Destino
                </h3>

                <p>
                  Motorista:{" "}
                  {reserva.carona.motorista.nome}
                </p>

                {reserva.pontoEmbarque && (
                  <p>
                    Embarque:{" "}
                    {reserva.pontoEmbarque}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// VEÍCULOS
// ==========================================

function MeusVeiculos() {
  const [veiculos, setVeiculos] =
    useState<Veiculo[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setVeiculos(
          await listarVeiculos()
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div>
      <PageTitle
        kicker="MOTORISTA"
        title="Meus veículos"
        description="Gerencie os veículos que você utiliza para oferecer caronas."
      />

      {loading ? (
        <div className="loading">
          Carregando veículos...
        </div>
      ) : veiculos.length === 0 ? (
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para começar a oferecer caronas."
        />
      ) : (
        <div className="vehicle-grid">
          {veiculos.map((veiculo) => (
            <div
              className="vehicle-card"
              key={veiculo.id}
            >
              <div className="vehicle-icon">
                🚙
              </div>

              <div>
                <span className="section-kicker">
                  VEÍCULO
                </span>

                <h3>{veiculo.modelo}</h3>

                <p>
                  {veiculo.cor} ·{" "}
                  {veiculo.placa}
                </p>

                <span>
                  {veiculo.capacidadePassageiros}{" "}
                  passageiros
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// ROTAS
// ==========================================

function MinhasRotas() {
  const [rotas, setRotas] =
    useState<Rota[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setRotas(await listarRotas());
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div>
      <PageTitle
        kicker="MOTORISTA"
        title="Minhas rotas"
        description="Gerencie os trajetos que você costuma realizar."
      />

      {loading ? (
        <div className="loading">
          Carregando rotas...
        </div>
      ) : rotas.length === 0 ? (
        <EmptyState
          title="Nenhuma rota cadastrada"
          description="Cadastre seu trajeto para começar."
        />
      ) : (
        <div className="route-grid">
          {rotas.map((rota) => (
            <div
              className="route-card"
              key={rota.id}
            >
              <span className="section-kicker">
                {rota.sentido}
              </span>

              <h3>
                {rota.apelido ||
                  `${rota.origemBairro} → ${rota.destinoBairro}`}
              </h3>

              <p>
                {rota.origemEndereco}
              </p>

              <span>↓</span>

              <p>
                {rota.destinoEndereco}
              </p>

              <div className="route-meta">
                <strong>
                  🕐 {rota.horarioPartida}
                </strong>

                <span>
                  {rota.diasSemana?.join(", ") ||
                    "Dias não informados"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PERFIL
// ==========================================

function MeuPerfil({
  usuario,
  onUpdate,
}: {
  usuario: Usuario | null;
  onUpdate: (usuario: Usuario) => void;
}) {
  const [perfil, setPerfil] =
    useState<Usuario | null>(usuario);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMeuPerfil();

        setPerfil(data);
        onUpdate(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        kicker="CONTA"
        title="Meu perfil"
        description="Seus dados no ViaCar."
      />

      <div className="profile-card">
        <div className="profile-avatar">
          {perfil?.nome
            ?.charAt(0)
            .toUpperCase()}
        </div>

        <h2>{perfil?.nome}</h2>

        <p>{perfil?.email}</p>

        <div className="profile-info">
          <div>
            <small>Matrícula</small>
            <strong>
              {perfil?.matricula}
            </strong>
          </div>

          <div>
            <small>Bairro</small>
            <strong>
              {perfil?.bairro}
            </strong>
          </div>

          <div>
            <small>Telefone</small>
            <strong>
              {perfil?.telefone ||
                "Não informado"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function PageTitle({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="section-kicker">
        {kicker}
      </span>

      <h2>{title}</h2>

      <p>{description}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">🚗</div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

function getStatusLabel(
  status: Carona["status"]
): string {
  switch (status) {
    case "ABERTA":
      return "Vagas abertas";

    case "LOTADA":
      return "Lotada";

    case "EM_ANDAMENTO":
      return "A caminho";

    case "CONCLUIDA":
      return "Concluída";

    case "CANCELADA":
      return "Cancelada";

    default:
      return status;
  }
}

function getStatusReservaLabel(
  status: Reserva["status"]
): string {
  switch (status) {
    case "CONFIRMADA":
      return "Confirmada";

    case "CANCELADA":
      return "Cancelada";

    case "REALIZADA":
      return "Realizada";

    case "NAO_COMPARECEU":
      return "Não compareceu";

    default:
      return status;
  }
}

export default App;
