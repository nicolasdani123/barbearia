// Simulando a função do frontend
function formatarDataHoraParaExibicao(dataHoraString) {
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
}

// Testando com os dados reais do banco
console.log('🧪 Testando função de formatação:');
console.log('Resultado 1:', formatarDataHoraParaExibicao("2025-10-28 09:40:30"));
console.log('Resultado 2:', formatarDataHoraParaExibicao("2025-10-28 06:36:28"));