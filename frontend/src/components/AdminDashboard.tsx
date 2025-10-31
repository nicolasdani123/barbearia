"use client";
import { useEffect, useState } from "react";
import styles from "./AdminDashboard.module.css";

interface Agendamento {
  id: number;
  nome: string;
  telefone: string;
  servico: string;
  data: string;
  hora: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
}

interface DiaIndisponivel {
  id: number;
  data: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo: string;
  criado_em: string;
}

export default function AdminDashboard() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [diasIndisponiveis, setDiasIndisponiveis] = useState<DiaIndisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [viewMode, setViewMode] = useState<"hoje" | "pendentes" | "todos">("pendentes");
  const [mostrarApenasValidos, setMostrarApenasValidos] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"agendamentos" | "disponibilidade">("agendamentos");
  const [novaDataIndisponivel, setNovaDataIndisponivel] = useState("");
  const [motivoIndisponivel, setMotivoIndisponivel] = useState("");
  const [tipoIndisponibilidade, setTipoIndisponibilidade] = useState<"dia" | "horario">("dia");
  const [horaInicioIndisponivel, setHoraInicioIndisponivel] = useState("");
  const [horaFimIndisponivel, setHoraFimIndisponivel] = useState("");
  const [editandoIndisponibilidade, setEditandoIndisponibilidade] = useState<number | null>(null);

  // Função para formatar data sem problemas de fuso horário
  const formatarDataParaExibicao = (dataString: string): string => {
    if (!dataString) return '';
    
    // Split da string no formato YYYY-MM-DD
    const [ano, mes, dia] = dataString.split('-');
    
    // Criar data local sem problemas de fuso horário
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    
    // Formatar para pt-BR
    return data.toLocaleDateString('pt-BR');
  };

  // Função para formatar data e hora corretamente
  const formatarDataHoraParaExibicao = (dataHoraString: string): string => {
    if (!dataHoraString) return '';
    
    try {
      console.log('Formatando data/hora:', dataHoraString, 'Tipo:', typeof dataHoraString);
      
      // Se for um timestamp Unix (número)
      if (typeof dataHoraString === 'number' || !isNaN(Number(dataHoraString))) {
        const data = new Date(Number(dataHoraString));
        return data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se vier no formato ISO (com T), usar diretamente
      if (dataHoraString.includes('T')) {
        const data = new Date(dataHoraString);
        return data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se vier no formato SQLite (YYYY-MM-DD HH:mm:ss)
      const [datePart, timePart] = dataHoraString.split(' ');
      if (datePart && timePart) {
        const [ano, mes, dia] = datePart.split('-');
        const [hora, minuto, segundo] = timePart.split(':');
        
        // Criar a data diretamente como horário local (sem conversão de timezone)
        const data = new Date(
          parseInt(ano), 
          parseInt(mes) - 1, 
          parseInt(dia), 
          parseInt(hora), 
          parseInt(minuto), 
          parseInt(segundo) || 0
        );
        
        console.log('Data formatada SQLite:', {
          original: dataHoraString,
          parsed: data.toString(),
          formatted: data.toLocaleString('pt-BR')
        });
        
        return data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Se vier apenas no formato de data (YYYY-MM-DD), tratar como SQLite sem hora
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataHoraString)) {
        const [ano, mes, dia] = dataHoraString.split('-');
        const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return data.toLocaleDateString('pt-BR');
      }
      
      // Fallback para formato padrão
      const data = new Date(dataHoraString);
      if (isNaN(data.getTime())) {
        console.error('Data inválida:', dataHoraString);
        return dataHoraString;
      }
      
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    } catch (error) {
      console.error('Erro ao formatar data/hora:', error, 'String original:', dataHoraString);
      return dataHoraString; // Retorna o valor original se houver erro
    }
  };

  // Função para verificar se uma data é um dia válido para agendamentos
  const isDiaValido = (dataStr: string) => {
    // Dividir a data em partes (formato YYYY-MM-DD)
    const [year, month, day] = dataStr.split('-').map(num => parseInt(num));
    const data = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
    const dayOfWeek = data.getDay(); // 0 = domingo, 1 = segunda
    
    const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    
    // Não permite domingos e segundas
    if (dayOfWeek === 0 || dayOfWeek === 1) {
      console.log(`❌ REJEITADO: ${dataStr} é ${dayNames[dayOfWeek]}`);
      return false;
    }
    
    // Verificar se o dia inteiro está indisponível
    const diaIndisponivel = diasIndisponiveis.some(dia => {
      return dia.data === dataStr && (!dia.hora_inicio || dia.hora_inicio.trim() === '' || !dia.hora_fim || dia.hora_fim.trim() === '');
    });
    
    if (diaIndisponivel) {
      console.log(`❌ REJEITADO: ${dataStr} está indisponível`);
      return false;
    }
    
    console.log(`✅ ACEITO: ${dataStr} é ${dayNames[dayOfWeek]}`);
    return true;
  };

  const hoje = new Date().toISOString().split('T')[0];

  useEffect(() => {
    buscarAgendamentos();
    buscarDiasIndisponiveis();
  }, [filtroData, filtroStatus, viewMode]);

  const buscarDiasIndisponiveis = async () => {
    try {
      const res = await fetch('http://localhost:4000/dias-indisponiveis');
      if (res.ok) {
        const data = await res.json();
        setDiasIndisponiveis(Array.isArray(data) ? data : []);
      } else {
        console.error("Erro na resposta da API:", res.status);
        setDiasIndisponiveis([]);
      }
    } catch (error) {
      console.error("Erro ao buscar dias indisponíveis:", error);
      setDiasIndisponiveis([]);
    }
  };

  const adicionarDiaIndisponivel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDataIndisponivel) return;

    // Validar horários se for do tipo horario
    if (tipoIndisponibilidade === "horario") {
      if (!horaInicioIndisponivel || !horaFimIndisponivel) {
        alert("Para marcar horários como indisponíveis, você deve informar tanto a hora de início quanto a hora de fim.");
        return;
      }
      if (horaInicioIndisponivel >= horaFimIndisponivel) {
        alert("A hora de início deve ser anterior à hora de fim.");
        return;
      }
    }

    try {
      const body: any = {
        data: novaDataIndisponivel,
        motivo: motivoIndisponivel || 'Indisponível'
      };

      if (tipoIndisponibilidade === "horario") {
        body.hora_inicio = horaInicioIndisponivel;
        body.hora_fim = horaFimIndisponivel;
      }

      const isEditing = editandoIndisponibilidade !== null;
      const url = isEditing 
        ? `http://localhost:4000/dias-indisponiveis/${editandoIndisponibilidade}`
        : 'http://localhost:4000/dias-indisponiveis';
      
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setNovaDataIndisponivel("");
        setMotivoIndisponivel("");
        setHoraInicioIndisponivel("");
        setHoraFimIndisponivel("");
        setTipoIndisponibilidade("dia");
        setEditandoIndisponibilidade(null);
        buscarDiasIndisponiveis();
        
        const successMessage = isEditing ? "Indisponibilidade atualizada com sucesso!" :
          (tipoIndisponibilidade === "horario" ? 
            "Horário marcado como indisponível com sucesso!" : 
            "Dia marcado como indisponível com sucesso!");
        alert(successMessage);
      } else {
        const error = await res.json();
        alert(error.error || (isEditing ? "Erro ao atualizar indisponibilidade" : "Erro ao marcar como indisponível"));
      }
    } catch (error) {
      console.error("Erro ao processar indisponibilidade:", error);
      alert("Erro ao conectar com o servidor");
    }
  };

  const editarIndisponibilidade = (dia: DiaIndisponivel) => {
    setEditandoIndisponibilidade(dia.id);
    setNovaDataIndisponivel(dia.data);
    setMotivoIndisponivel(dia.motivo);
    
    if (dia.hora_inicio && dia.hora_fim) {
      setTipoIndisponibilidade("horario");
      setHoraInicioIndisponivel(dia.hora_inicio);
      setHoraFimIndisponivel(dia.hora_fim);
    } else {
      setTipoIndisponibilidade("dia");
      setHoraInicioIndisponivel("");
      setHoraFimIndisponivel("");
    }
  };

  const cancelarEdicao = () => {
    setEditandoIndisponibilidade(null);
    setNovaDataIndisponivel("");
    setMotivoIndisponivel("");
    setHoraInicioIndisponivel("");
    setHoraFimIndisponivel("");
    setTipoIndisponibilidade("dia");
  };

  const removerIndisponibilidade = async (id: number, descricao: string) => {
    if (!confirm(`Deseja remover esta indisponibilidade: ${descricao}?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/dias-indisponiveis/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        buscarDiasIndisponiveis();
        alert("Indisponibilidade removida com sucesso!");
      } else {
        const error = await res.json();
        alert(error.error || "Erro ao remover indisponibilidade");
      }
    } catch (error) {
      console.error("Erro ao remover indisponibilidade:", error);
      alert("Erro ao conectar com o servidor");
    }
  };

  const buscarAgendamentos = async () => {
    setLoading(true);
    try {
      let url = "http://localhost:4000/agendamentos?";
      const params = new URLSearchParams();
      
      if (viewMode === "hoje") {
        params.append("data", hoje);
      } else if (viewMode === "pendentes") {
        params.append("status", "pendente");
      }
      
      if (filtroData) params.append("data", filtroData);
      if (filtroStatus) params.append("status", filtroStatus);
      
      const res = await fetch(url + params.toString());
      if (res.ok) {
        const data = await res.json();
        
        // Debug: verificar formato das datas
        if (data.length > 0) {
          console.log('Exemplo de agendamento:', data[0]);
          console.log('Campo criado_em:', data[0].criado_em);
          console.log('Tipo do criado_em:', typeof data[0].criado_em);
        }
        
        // Garantir que sempre seja um array
        setAgendamentos(Array.isArray(data) ? data : []);
      } else {
        console.error("Erro na resposta da API:", res.status);
        setAgendamentos([]);
      }
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      setAgendamentos([]);
    }
    setLoading(false);
  };

  const atualizarStatus = async (id: number, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:4000/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus })
      });
      
      if (res.ok) {
        buscarAgendamentos();
      } else {
        alert("Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro de conexão");
    }
  };

  const abrirWhatsApp = (telefone: string, nome: string) => {
    // Remove formatação do telefone para o WhatsApp
    const numeroLimpo = telefone.replace(/\D/g, '');
    // Adiciona código do país se não tiver
    const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    
    const mensagem = encodeURIComponent(`Olá ${nome}! Estou entrando em contato sobre seu agendamento no salão.`);
    const urlWhatsApp = `https://wa.me/${numeroCompleto}?text=${mensagem}`;
    
    window.open(urlWhatsApp, '_blank');
  };

  const deletarAgendamento = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este agendamento?")) return;
    
    try {
      const res = await fetch(`http://localhost:4000/agendamentos/${id}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        buscarAgendamentos();
      } else {
        alert("Erro ao deletar agendamento");
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro de conexão");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "#f59e0b";
      case "confirmado": return "#10b981";
      case "cancelado": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente": return "Pendente";
      case "confirmado": return "Confirmado";
      case "cancelado": return "Cancelado";
      default: return status;
    }
  };

  // Filtrar agendamentos considerando dias válidos
  const agendamentosFiltrados = mostrarApenasValidos 
    ? agendamentos.filter(a => {
        const valido = isDiaValido(a.data);
        if (!valido) {
          console.log(`🚫 Filtrando agendamento do dia ${a.data} (inválido)`);
        }
        return valido;
      })
    : agendamentos;

  console.log(`📊 Total agendamentos: ${agendamentos.length}, Filtrados: ${agendamentosFiltrados.length}, Mostrar apenas válidos: ${mostrarApenasValidos}`);

  const agendamentosHoje = Array.isArray(agendamentosFiltrados) ? agendamentosFiltrados.filter(a => a.data === hoje) : [];
  const agendamentosPendentes = Array.isArray(agendamentosFiltrados) ? agendamentosFiltrados.filter(a => a.status === "pendente") : [];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Painel do Barbeiro</h1>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{agendamentosHoje.length}</span>
            <span className={styles.statLabel}>Hoje</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{agendamentosPendentes.length}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${abaAtiva === 'agendamentos' ? styles.tabActive : ''}`}
          onClick={() => setAbaAtiva('agendamentos')}
        >
          📅 Agendamentos
        </button>
        <button 
          className={`${styles.tab} ${abaAtiva === 'disponibilidade' ? styles.tabActive : ''}`}
          onClick={() => setAbaAtiva('disponibilidade')}
        >
          🚫 Dias Indisponíveis
        </button>
      </div>

      {abaAtiva === 'agendamentos' && (
        <>
          <div className={styles.controls}>
            <div className={styles.viewModes}>
              <button 
                className={`${styles.viewButton} ${viewMode === "hoje" ? styles.active : ""}`}
                onClick={() => setViewMode("hoje")}
              >
                Hoje
              </button>
              <button 
                className={`${styles.viewButton} ${viewMode === "pendentes" ? styles.active : ""}`}
                onClick={() => setViewMode("pendentes")}
              >
                Pendentes
              </button>
              <button 
                className={`${styles.viewButton} ${viewMode === "todos" ? styles.active : ""}`}
                onClick={() => setViewMode("todos")}
              >
                Todos
              </button>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginLeft: '16px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                <input 
                  type="checkbox" 
                  checked={mostrarApenasValidos}
                  onChange={(e) => setMostrarApenasValidos(e.target.checked)}
                />
                Apenas dias válidos
              </label>
            </div>

            <div className={styles.filters}>
              <input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className={styles.filterInput}
              />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Carregando agendamentos...</div>
          ) : (() => {
            let agendamentosParaExibir = agendamentosFiltrados;
            
            if (viewMode === "hoje") {
              agendamentosParaExibir = agendamentosHoje;
              console.log(`📅 Modo HOJE: ${agendamentosHoje.length} agendamentos`);
            } else if (viewMode === "pendentes") {
              agendamentosParaExibir = agendamentosPendentes;
              console.log(`⏳ Modo PENDENTES: ${agendamentosPendentes.length} agendamentos`);
            } else {
              console.log(`📋 Modo TODOS: ${agendamentosFiltrados.length} agendamentos`);
            }
            
            console.log('🎯 Agendamentos para exibir:', agendamentosParaExibir.map(a => `${a.data} (${formatarDataParaExibicao(a.data)})`));
            
            return !Array.isArray(agendamentosParaExibir) || agendamentosParaExibir.length === 0 ? (
              <div className={styles.empty}>Nenhum agendamento encontrado.</div>
            ) : (
              <div className={styles.agendamentosList}>
                {agendamentosParaExibir.map((agendamento) => (
                <div key={agendamento.id} className={styles.agendamentoCard}>
              <div className={styles.agendamentoHeader}>
                <div className={styles.clienteInfo}>
                  <h3>{agendamento.nome}</h3>
                  <p 
                    className={styles.telefoneLink}
                    onClick={() => abrirWhatsApp(agendamento.telefone, agendamento.nome)}
                    title="Clique para abrir WhatsApp"
                  >
                    📱 {agendamento.telefone}
                  </p>
                </div>
                <div 
                  className={styles.status}
                  style={{ backgroundColor: getStatusColor(agendamento.status) }}
                >
                  {getStatusText(agendamento.status)}
                </div>
              </div>
              
              <div className={styles.agendamentoDetails}>
                <div className={styles.detail}>
                  <strong>Serviço:</strong> {agendamento.servico}
                </div>
                <div className={styles.detail}>
                  <strong>Data:</strong> {formatarDataParaExibicao(agendamento.data)}
                </div>
                <div className={styles.detail}>
                  <strong>Horário:</strong> {agendamento.hora}
                </div>
                <div className={styles.detail}>
                  <strong>Agendado em:</strong> {formatarDataHoraParaExibicao(agendamento.criado_em)}
                </div>
              </div>

              <div className={styles.actions}>
                {agendamento.status === "pendente" && (
                  <>
                    <button
                      className={`${styles.actionButton} ${styles.confirm}`}
                      onClick={() => atualizarStatus(agendamento.id, "confirmado")}
                    >
                      Confirmar
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.cancel}`}
                      onClick={() => atualizarStatus(agendamento.id, "cancelado")}
                    >
                      Cancelar
                    </button>
                  </>
                )}
                
                {agendamento.status === "confirmado" && (
                  <button
                    className={`${styles.actionButton} ${styles.cancel}`}
                    onClick={() => atualizarStatus(agendamento.id, "cancelado")}
                  >
                    Cancelar
                  </button>
                )}
                
                <button
                  className={`${styles.actionButton} ${styles.delete}`}
                  onClick={() => deletarAgendamento(agendamento.id)}
                >
                  Deletar
                </button>
              </div>
                </div>
              ))}
            </div>
            );
          })()}
        </>
      )}

      {abaAtiva === 'disponibilidade' && (
        <div className={styles.disponibilidade}>
          {/* Formulário para adicionar dia indisponível */}
          <div className={styles.adicionarIndisponivel}>
            <h2>{editandoIndisponibilidade ? "Editar Indisponibilidade" : "Marcar como Indisponível"}</h2>
            <form onSubmit={adicionarDiaIndisponivel} className={styles.formIndisponivel}>
              <div className={styles.inputGroup}>
                <label htmlFor="tipo">Tipo de Indisponibilidade:</label>
                <select
                  id="tipo"
                  value={tipoIndisponibilidade}
                  onChange={(e) => setTipoIndisponibilidade(e.target.value as "dia" | "horario")}
                  className={styles.inputSelect}
                >
                  <option value="dia">Dia inteiro</option>
                  <option value="horario">Apenas alguns horários</option>
                </select>
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="data">Data:</label>
                <input
                  type="date"
                  id="data"
                  value={novaDataIndisponivel}
                  onChange={(e) => setNovaDataIndisponivel(e.target.value)}
                  min={hoje}
                  required
                  className={styles.inputData}
                />
              </div>

              {tipoIndisponibilidade === "horario" && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="horaInicio">Hora Início:</label>
                    <select
                      id="horaInicio"
                      value={horaInicioIndisponivel}
                      onChange={(e) => setHoraInicioIndisponivel(e.target.value)}
                      required
                      className={styles.inputSelect}
                    >
                      <option value="">Selecione</option>
                      {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(hora => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label htmlFor="horaFim">Hora Fim:</label>
                    <select
                      id="horaFim"
                      value={horaFimIndisponivel}
                      onChange={(e) => setHoraFimIndisponivel(e.target.value)}
                      required
                      className={styles.inputSelect}
                    >
                      <option value="">Selecione</option>
                      {["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(hora => (
                        <option key={hora} value={hora}>{hora}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              
              <div className={styles.inputGroup}>
                <label htmlFor="motivo">Motivo (opcional):</label>
                <input
                  type="text"
                  id="motivo"
                  value={motivoIndisponivel}
                  onChange={(e) => setMotivoIndisponivel(e.target.value)}
                  placeholder="Ex: Férias, Compromisso pessoal..."
                  className={styles.inputMotivo}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button type="submit" className={styles.botaoAdicionar}>
                  {editandoIndisponibilidade ? "✅ Atualizar" : "🚫 Marcar como Indisponível"}
                </button>
                
                {editandoIndisponibilidade && (
                  <button 
                    type="button" 
                    onClick={cancelarEdicao}
                    className={styles.botaoCancelar}
                  >
                    ❌ Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de dias indisponíveis */}
          <div className={styles.listaIndisponiveis}>
            <h2>Dias Indisponíveis ({diasIndisponiveis.length})</h2>
            {diasIndisponiveis.length === 0 ? (
              <p className={styles.empty}>Nenhum dia marcado como indisponível.</p>
            ) : (
              <div className={styles.diasGrid}>
                {diasIndisponiveis.map((dia) => {
                  // Split da string no formato YYYY-MM-DD
                  const [ano, mes, diaNum] = dia.data.split('-');
                  // Criar data local sem problemas de fuso horário
                  const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(diaNum));
                  const dataFormatada = data.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  
                  const descricao = dia.hora_inicio && dia.hora_fim 
                    ? `${dataFormatada} (${dia.hora_inicio} às ${dia.hora_fim})`
                    : dataFormatada;
                  
                  return (
                    <div key={dia.id} className={styles.diaCard}>
                      <div className={styles.diaInfo}>
                        <div className={styles.diaData}>
                          📅 {dataFormatada}
                        </div>
                        {dia.hora_inicio && dia.hora_fim && (
                          <div className={styles.diaHorario}>
                            🕒 {dia.hora_inicio} às {dia.hora_fim}
                          </div>
                        )}
                        <div className={styles.diaMotivo}>
                          💭 {dia.motivo}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => editarIndisponibilidade(dia)}
                          className={styles.botaoEditar}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          onClick={() => removerIndisponibilidade(dia.id, descricao)}
                          className={styles.botaoRemover}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}