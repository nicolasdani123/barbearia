"use client";
import { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import { API_URL } from "@/config/api";

interface Agendamento {
  id: number;
  nome: string;
  telefone: string;
  servico: string;
  data: string;
  hora: string;
  duracao?: number; // em minutos
}

interface DiaIndisponivel {
  id: number;
  data: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo: string;
  criado_em: string;
}

interface CalendarProps {
  onSelectDateTime: (date: string, time: string) => void;
  serviceDuration?: number; // duração em minutos
}

export default function Calendar({ onSelectDateTime, serviceDuration = 30 }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [diasIndisponiveis, setDiasIndisponiveis] = useState<DiaIndisponivel[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [horariosCache, setHorariosCache] = useState<Record<string, string[]>>({});
  const [isLoadingHorarios, setIsLoadingHorarios] = useState(false);

  // Buscar horários disponíveis do backend considerando horário atual
  const buscarHorariosDisponiveis = async (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setIsLoadingHorarios(true);
    
    try {
      const response = await fetch(`${API_URL}/horarios-disponiveis?data=${dateStr}&duracao=${serviceDuration}`);
      if (response.ok) {
        const data = await response.json();
        const list = data.horariosDisponiveis || [];
        setHorariosDisponiveis(list);
        setHorariosCache(prev => ({ ...prev, [dateStr]: list }));
        console.log(`📅 Horários disponíveis para ${dateStr}:`, list);
      } else {
        console.error('Erro ao buscar horários disponíveis');
        setHorariosDisponiveis([]);
      }
    } catch (error) {
      console.error('Erro na requisição de horários:', error);
      setHorariosDisponiveis([]);
    }
    
    setIsLoadingHorarios(false);
  };
  
  // Gerar horários dinâmicos baseados na duração do serviço (FALLBACK)
  const getAvailableTimesForService = () => {
    const baseHours = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
    let times: string[] = [];
    
    // Para serviços de até 30 minutos, oferecer intervalos de 30 minutos
    if (serviceDuration <= 30) {
      baseHours.forEach(hour => {
        if (parseInt(hour) < 20) { // Não adicionar 20:30 para evitar trabalhar muito tarde
          times.push(`${hour}:00`);
          times.push(`${hour}:30`);
        } else {
          times.push(`${hour}:00`);
        }
      });
    }
    // Para serviços de 31-60 minutos, usar intervalos de 1 hora
    else if (serviceDuration <= 60) {
      times = baseHours.map(hour => `${hour}:00`);
    }
    // Para serviços mais longos, usar intervalos maiores e terminar mais cedo
    else {
      const maxEndHour = 20 - Math.ceil(serviceDuration / 60);
      times = baseHours
        .filter(hour => parseInt(hour) <= maxEndHour)
        .map(hour => `${hour}:00`);
    }
    
    return times;
  };

  const availableTimes = getAvailableTimesForService();

  useEffect(() => {
    // Buscar agendamentos existentes
    fetch(`${API_URL}/agendamentos`)
      .then(res => res.json())
      .then(data => setAgendamentos(data))
      .catch(err => console.error("Erro ao buscar agendamentos:", err));

    // Buscar dias indisponíveis
    fetch(`${API_URL}/dias-indisponiveis`)
      .then(res => res.json())
      .then(data => setDiasIndisponiveis(data))
      .catch(err => console.error("Erro ao buscar dias indisponíveis:", err));

    // Buscar horários de hoje para desativar automaticamente dias sem horários
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
    // Chamar buscarHorariosDisponiveis com o dia atual do mês
    buscarHorariosDisponiveis(hoje.getDate()).catch(() => {});
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  // Primeiro dia do mês e quantos dias tem
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Navegar entre meses
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
    setSelectedDay(null);
  };

  // Atualizar busca de horários quando selecionar um dia
  useEffect(() => {
    if (selectedDay) {
      buscarHorariosDisponiveis(selectedDay);
    }
  }, [selectedDay, serviceDuration]);

  // Verificar se um dia tem horários disponíveis
  const hasAvailableSlots = (day: number) => {
    // Se o dia inteiro está indisponível, não há slots
    if (isDayUnavailable(day)) {
      return false;
    }
    
    // Para hoje, sempre verificar no backend (pode ter horários que já passaram)
    const hoje = new Date();
    const diaData = new Date(year, month, day);
    const isHoje = diaData.toDateString() === hoje.toDateString();
    
    if (isHoje) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cached = horariosCache[dateStr];
      if (Array.isArray(cached)) {
        return cached.length > 0;
      }
      // Se não estiver no cache ainda, permitir o clique (buscará no backend ao selecionar)
      return true;
    }
    
    // Para outros dias, usar a lógica anterior
    const availableCount = availableTimes.filter(time => {
      const isOccupied = agendamentos.some(a => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return a.data === dateStr && a.hora === time;
      });
      const isUnavailable = isTimeUnavailable(day, time);
      const hasTime = hasEnoughTime(day, time);
      return !isOccupied && !isUnavailable && hasTime;
    }).length;
    
    return availableCount > 0;
  };

  // Verificar se um horário está indisponível
  const isTimeUnavailable = (day: number, time: string) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return diasIndisponiveis.some(diaIndisponivel => {
      if (diaIndisponivel.data !== dateStr) return false;
      
      const horaInicio = diaIndisponivel.hora_inicio;
      const horaFim = diaIndisponivel.hora_fim;
      
      // Se não há horário específico, o dia inteiro está indisponível
      if (!horaInicio || horaInicio.trim() === '' || !horaFim || horaFim.trim() === '') {
        return true;
      }
      
      // Converter horários para minutos para comparação mais precisa
      const [currentHour, currentMinute] = time.split(':').map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      const [startHour, startMinute] = horaInicio.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      
      const [endHour, endMinute] = horaFim.split(':').map(Number);
      const endTotalMinutes = endHour * 60 + endMinute;
      
      // Verificar se o horário atual está dentro da faixa indisponível
      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
    });
  };

  // Verificar se há tempo suficiente para um serviço a partir de um horário
  const hasEnoughTime = (day: number, startTime: string): boolean => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = startTotalMinutes + serviceDuration;
    
    // Verificar se o serviço terminaria depois do último horário (20:00)
    const lastHour = 20 * 60; // 20:00 em minutos
    if (endTotalMinutes > lastHour) {
      return false;
    }
    
    // Obter todos os agendamentos do dia com suas durações
    const dayAgendamentos = agendamentos.filter(a => a.data === dateStr);
    
    // Verificar conflitos com agendamentos existentes
    for (const agendamento of dayAgendamentos) {
      const [agendHour, agendMinute] = agendamento.hora.split(':').map(Number);
      const agendStartMinutes = agendHour * 60 + agendMinute;
      // Usar duração armazenada no agendamento, se disponível; fallback para 60
      const agendDuration = agendamento.duracao ? Number(agendamento.duracao) : 60;
      const agendEndMinutes = agendStartMinutes + agendDuration;
      
      // Verificar se há sobreposição
      if (
        (startTotalMinutes < agendEndMinutes && endTotalMinutes > agendStartMinutes)
      ) {
        return false; // Há conflito
      }
    }
    
    // Verificar indisponibilidades em intervalos de 30 minutos
    for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += 30) {
      const checkHour = Math.floor(minutes / 60);
      const checkMinute = minutes % 60;
      const timeToCheck = `${checkHour.toString().padStart(2, '0')}:${checkMinute.toString().padStart(2, '0')}`;
      
      // Verificar apenas os horários padrão que temos na lista
      const nearestHour = `${checkHour.toString().padStart(2, '0')}:00`;
      if (availableTimes.includes(nearestHour)) {
        const isUnavailable = isTimeUnavailable(day, nearestHour);
        if (isUnavailable) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Obter horários disponíveis e ocupados para um dia específico
  const getTimesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayAgendamentos = agendamentos.filter(a => a.data === dateStr);
    const occupiedTimes = dayAgendamentos.map(a => a.hora);
    
    return availableTimes.map(time => {
      const isOccupied = occupiedTimes.includes(time);
      const isUnavailable = isTimeUnavailable(day, time);
      const hasTime = hasEnoughTime(day, time);
      
      return {
        time,
        available: !isOccupied && !isUnavailable && hasTime,
        occupied: isOccupied,
        unavailable: isUnavailable
      };
    });
  };

  // Verificar se um dia está completamente indisponível (dia inteiro)
  const isDayUnavailable = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const result = diasIndisponiveis.some(diaIndisponivel => {
      if (diaIndisponivel.data !== dateStr) return false;
      
      // Verificar se é dia inteiro (sem horários específicos)
      const horaInicio = diaIndisponivel.hora_inicio;
      const horaFim = diaIndisponivel.hora_fim;
      
      // Considera dia inteiro se ambos os horários são null, undefined ou string vazia
      const hasNoHours = !horaInicio || horaInicio.trim() === '' || !horaFim || horaFim.trim() === '';
      
      return hasNoHours;
    });
    
    return result;
  };

  // Verificar se um dia já passou ou se é domingo/segunda ou está indisponível
  const isPastDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayOfWeek = dayDate.getDay(); // 0 = domingo, 1 = segunda, 2 = terça...
    
    // Não permite domingos (0) e segundas (1)
    if (dayOfWeek === 0 || dayOfWeek === 1) {
      return true;
    }
    
    // Não permite dias indisponíveis
    if (isDayUnavailable(day)) {
      return true;
    }
    
    return dayDate < todayDate;
  };

  const handleDayClick = (day: number) => {
    if (isPastDay(day) || !hasAvailableSlots(day)) return;
    setSelectedDay(selectedDay === day ? null : day);
  };

  const handleTimeSelect = (time: string, available: boolean) => {
    if (!available || !selectedDay) return;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    onSelectDateTime(dateStr, time);
    setSelectedDay(null);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Gerar dias do calendário
  const calendarDays = [];
  
  // Dias vazios do início
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
  }
  
  // Dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const isPast = isPastDay(day);
    const hasSlots = hasAvailableSlots(day);
    const isSelected = selectedDay === day;
    const isUnavailable = isDayUnavailable(day); // Só verdadeiro se o dia inteiro estiver indisponível
    
    let dayClasses = styles.day;
    let indicator = null;
    let title = '';
    
    if (isPast) {
      dayClasses += ` ${styles.pastDay}`;
      title = 'Data já passou ou dia não disponível';
    } else if (isUnavailable) {
      dayClasses += ` ${styles.unavailableDay}`;
      indicator = <div className={styles.unavailableIndicator}>✕</div>;
      title = 'Dia indisponível';
    } else if (!hasSlots) {
      dayClasses += ` ${styles.noSlots}`;
      title = 'Não há horários disponíveis';
    } else {
      indicator = <div className={styles.availableIndicator}></div>;
      title = 'Clique para ver horários disponíveis';
    }
    
    if (isSelected) {
      dayClasses += ` ${styles.selected}`;
    }
    
    calendarDays.push(
      <div
        key={day}
        className={dayClasses}
        onClick={() => handleDayClick(day)}
        title={title}
      >
        {day}
        {indicator}
      </div>
    );
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={goToPreviousMonth} className={styles.navButton}>‹</button>
        <h2>{monthNames[month]} {year}</h2>
        <button onClick={goToNextMonth} className={styles.navButton}>›</button>
      </div>
      
      <div className={styles.dayNames}>
        {dayNames.map(name => (
          <div key={name} className={styles.dayName}>{name}</div>
        ))}
      </div>
      
      <div className={styles.daysGrid}>
        {calendarDays}
      </div>
      
      {selectedDay && (
        <div className={styles.timeSlots}>
          <h3>Horários disponíveis - {selectedDay}/{month + 1}</h3>
          <p className={styles.serviceDurationInfo}>
            Duração do serviço: {serviceDuration} minutos
            {serviceDuration > 60 && <span className={styles.longServiceNote}> (Serviço longo - horários limitados)</span>}
          </p>
          
          {isLoadingHorarios ? (
            <div className={styles.loading}>Carregando horários...</div>
          ) : (
            <div className={styles.timesGrid}>
              {horariosDisponiveis.length > 0 ? (
                horariosDisponiveis.map(time => (
                  <button
                    key={time}
                    className={styles.timeSlot}
                    onClick={() => handleTimeSelect(time, true)}
                    title="Horário disponível"
                  >
                    {time}
                  </button>
                ))
              ) : (
                <div className={styles.noSlots}>
                  <p>Nenhum horário disponível para este dia.</p>
                  <p className={styles.hint}>
                    {new Date(year, month, selectedDay).toDateString() === new Date().toDateString() 
                      ? "Os horários do dia já passaram ou estão muito próximos."
                      : "Todos os horários estão ocupados ou indisponíveis."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}