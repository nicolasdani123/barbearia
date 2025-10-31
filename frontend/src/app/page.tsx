"use client";
import styles from "./page.module.css";
import { useState } from "react";
import Calendar from "../components/Calendar";
import { API_URL } from "@/config/api";

interface Servico {
  nome: string;
  duracao: number; // em minutos
  preco?: number;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'servico' | 'calendario' | 'dados'>('servico');
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    servico: "",
    data: "",
    hora: ""
  });
  const [mensagem, setMensagem] = useState("");
  
  const servicos: Servico[] = [
    { nome: "Cabelo", duracao: 30 },
    { nome: "Barba", duracao: 40 },
    { nome: "Barba e cabelo", duracao: 75 },
    { nome: "Barba, cabelo e sobrancelha", duracao: 80 },
    { nome: "Cabelo e sobrancelha", duracao: 40 },
    { nome: "Pezinho e barba", duracao: 45 },
    { nome: "Barba e sobrancelha", duracao: 45 },
    { nome: "Barba e hidratação de barba", duracao: 60 },
    { nome: "Barba, cabelo, sobrancelha e hidratação de barba", duracao: 105 }
  ];

  function formatarTelefone(valor: string) {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Formatar baseado na quantidade de dígitos
    if (numeros.length <= 2) {
      return `(${numeros}`;
    } else if (numeros.length <= 7) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else if (numeros.length <= 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else {
      // Limita a 11 dígitos
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    
    if (name === 'telefone') {
      const telefoneFormatado = formatarTelefone(value);
      setForm({ ...form, [name]: telefoneFormatado });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  function handleServiceSelect(serviceName: string) {
    setForm({ ...form, servico: serviceName });
    setCurrentStep('calendario');
  }

  function handleDateTimeSelect(date: string, time: string) {
    setForm({ ...form, data: date, hora: time });
    setCurrentStep('dados');
  }

  function getSelectedServiceDuration(): number {
    const selectedService = servicos.find(s => s.nome === form.servico);
    return selectedService ? selectedService.duracao : 30;
  }

  function formatarDataParaExibicao(dataString: string): string {
    if (!dataString) return '';
    
    // Split da string no formato YYYY-MM-DD
    const [ano, mes, dia] = dataString.split('-');
    
    // Criar data local sem problemas de fuso horário
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    
    // Formatar para pt-BR com dia da semana
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");
    
    // Validar se o telefone tem pelo menos 10 dígitos
    const numerosTelefone = form.telefone.replace(/\D/g, '');
    if (numerosTelefone.length < 10) {
      setMensagem("Por favor, digite um telefone válido com pelo menos 10 dígitos.");
      return;
    }
    
    try {
      const agendamentoData = {
        ...form,
        duracao: getSelectedServiceDuration()
      };
      
      const res = await fetch("${API_URL}/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agendamentoData)
      });
      if (res.ok) {
        setMensagem("Agendamento enviado! Em breve entraremos em contato pelo WhatsApp.");
        setForm({ nome: "", telefone: "", servico: "", data: "", hora: "" });
        setCurrentStep('servico');
      } else {
        setMensagem("Erro ao enviar agendamento. Tente novamente.");
      }
    } catch {
      setMensagem("Erro de conexão com o servidor.");
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Agende seu horário</h1>
        
        {/* Etapa 1: Seleção do Serviço */}
        {currentStep === 'servico' && (
          <div>
            <p className={styles.subtitle}>Primeiro, escolha o serviço desejado:</p>
            <div className={styles.servicesGrid}>
              {servicos.map((servico, index) => (
                <div 
                  key={index} 
                  className={styles.serviceCard}
                  onClick={() => handleServiceSelect(servico.nome)}
                >
                  <h3>{servico.nome}</h3>
                  <p className={styles.serviceDuration}>
                    Duração: {servico.duracao} minutos
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etapa 2: Seleção de Data e Horário */}
        {currentStep === 'calendario' && (
          <div>
            <div className={styles.selectedService}>
              <p><strong>Serviço selecionado:</strong> {form.servico}</p>
              <p><strong>Duração:</strong> {getSelectedServiceDuration()} minutos</p>
              <button 
                className={styles.changeButton}
                onClick={() => setCurrentStep('servico')}
              >
                Alterar serviço
              </button>
            </div>
            <p className={styles.subtitle}>Selecione uma data e horário disponível:</p>
            <Calendar 
              onSelectDateTime={handleDateTimeSelect} 
              serviceDuration={getSelectedServiceDuration()}
            />
          </div>
        )}

        {/* Etapa 3: Dados do Cliente */}
        {currentStep === 'dados' && (
          <div>
            <div className={styles.selectedInfo}>
              <p><strong>Serviço:</strong> {form.servico}</p>
              <p><strong>Data:</strong> {formatarDataParaExibicao(form.data)}</p>
              <p><strong>Horário:</strong> {form.hora}</p>
              <p><strong>Duração:</strong> {getSelectedServiceDuration()} minutos</p>
              <button 
                className={styles.changeButton}
                onClick={() => setCurrentStep('calendario')}
              >
                Alterar data/horário
              </button>
            </div>
            
            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Nome
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  required
                  placeholder="Seu nome"
                />
              </label>
              <label>
                Telefone (WhatsApp)
                <input
                  type="tel"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  required
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </label>
              <button className={styles.primary} type="submit">Confirmar Agendamento</button>
            </form>
          </div>
        )}
        
        {mensagem && <p className={styles.success}>{mensagem}</p>}
      </main>
    </div>
  );
}

