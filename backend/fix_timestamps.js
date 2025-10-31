const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agendamentos.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Corrigindo timestamps existentes...');

// Primeiro, vamos ver quais registros existem
db.all('SELECT id, nome, criado_em FROM agendamentos ORDER BY id', (err, rows) => {
  if (err) {
    console.error('Erro ao buscar agendamentos:', err);
    return;
  }
  
  console.log('📋 Agendamentos encontrados:');
  rows.forEach(row => {
    console.log(`ID ${row.id}: ${row.nome} - criado_em: ${row.criado_em} (${typeof row.criado_em})`);
  });
  
  // Atualizar a coluna criado_em para usar horário local
  console.log('\n🔄 Atualizando timestamps...');
  
  db.run(`UPDATE agendamentos SET criado_em = datetime('now', 'localtime') WHERE criado_em IS NOT NULL`, function(err) {
    if (err) {
      console.error('Erro ao atualizar timestamps:', err);
      return;
    }
    
    console.log(`✅ ${this.changes} registros atualizados`);
    
    // Verificar os resultados
    db.all('SELECT id, nome, criado_em FROM agendamentos ORDER BY id', (err2, updatedRows) => {
      if (err2) {
        console.error('Erro ao verificar resultados:', err2);
        return;
      }
      
      console.log('\n📋 Agendamentos após atualização:');
      updatedRows.forEach(row => {
        console.log(`ID ${row.id}: ${row.nome} - criado_em: ${row.criado_em}`);
      });
      
      console.log('\n✅ Correção concluída!');
      db.close();
    });
  });
});