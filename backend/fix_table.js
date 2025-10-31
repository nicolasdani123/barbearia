const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agendamentos.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Verificando estrutura atual da tabela...');
  
  db.all("PRAGMA table_info(dias_indisponiveis)", (err, columns) => {
    if (err) {
      console.error('Erro ao verificar estrutura:', err);
      return;
    }
    
    console.log('Estrutura atual:', columns);
    
    db.all('SELECT * FROM dias_indisponiveis', (err2, rows) => {
      if (err2) {
        console.error('Erro ao buscar dados:', err2);
        return;
      }
      
      console.log('Dados atuais:', rows);
      
      // Recriar a tabela com a estrutura correta
      db.run(`DROP TABLE IF EXISTS dias_indisponiveis_backup`);
      
      db.run(`CREATE TABLE dias_indisponiveis_backup AS SELECT * FROM dias_indisponiveis`, (err3) => {
        if (err3) {
          console.error('Erro ao fazer backup:', err3);
          return;
        }
        
        console.log('Backup criado com sucesso');
        
        db.run(`DROP TABLE dias_indisponiveis`, (err4) => {
          if (err4) {
            console.error('Erro ao remover tabela antiga:', err4);
            return;
          }
          
          console.log('Tabela antiga removida');
          
          db.run(`CREATE TABLE dias_indisponiveis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            hora_inicio TEXT,
            hora_fim TEXT,
            motivo TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, (err5) => {
            if (err5) {
              console.error('Erro ao criar nova tabela:', err5);
              return;
            }
            
            console.log('Nova tabela criada com sucesso');
            
            db.run(`INSERT INTO dias_indisponiveis (data, motivo, criado_em) 
                    SELECT data, motivo, criado_em FROM dias_indisponiveis_backup`, (err6) => {
              if (err6) {
                console.error('Erro ao restaurar dados:', err6);
                return;
              }
              
              console.log('Dados restaurados com sucesso');
              
              db.run(`DROP TABLE dias_indisponiveis_backup`, () => {
                console.log('Backup removido. Estrutura da tabela corrigida!');
                db.close();
              });
            });
          });
        });
      });
    });
  });
});