const db = require('./db');

console.log('🔍 Testando consulta de agendamentos...');

db.all('SELECT id, nome, data, hora, criado_em FROM agendamentos ORDER BY id DESC LIMIT 3', (err, rows) => {
  if (err) {
    console.error('Erro na consulta:', err);
    return;
  }
  
  console.log('📋 Últimos agendamentos:');
  rows.forEach(row => {
    console.log(`ID ${row.id}: ${row.nome}`);
    console.log(`  Data/Hora agendamento: ${row.data} ${row.hora}`);
    console.log(`  criado_em: "${row.criado_em}" (tipo: ${typeof row.criado_em})`);
    console.log(`  criado_em como Date: ${new Date(row.criado_em)}`);
    console.log(`  ---`);
  });
  
  db.close();
});