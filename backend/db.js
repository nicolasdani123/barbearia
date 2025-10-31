const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'agendamentos.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Criar tabela principal se não existir
  db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    servico TEXT NOT NULL,
    data TEXT NOT NULL,
    hora TEXT NOT NULL,
    criado_em DATETIME DEFAULT (datetime('now', 'localtime'))
  )`);
  
  // Criar tabela de dias indisponíveis
  db.run(`CREATE TABLE IF NOT EXISTS dias_indisponiveis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL,
    hora_inicio TEXT,
    hora_fim TEXT,
    motivo TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Verificar e adicionar colunas apenas se não existirem
  db.all("PRAGMA table_info(agendamentos)", (err, columns) => {
    if (err) {
      console.error('Erro ao verificar estrutura da tabela:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    
    // Adicionar coluna status se não existir
    if (!columnNames.includes('status')) {
      db.run(`ALTER TABLE agendamentos ADD COLUMN status TEXT DEFAULT 'pendente'`, (err) => {
        if (err) {
          console.error('Erro ao adicionar coluna status:', err);
        } else {
          console.log('Coluna status adicionada com sucesso');
          // Atualizar registros existentes
          db.run(`UPDATE agendamentos SET status = 'pendente' WHERE status IS NULL`);
        }
      });
    }
    
    // Adicionar coluna duracao se não existir
    if (!columnNames.includes('duracao')) {
      db.run(`ALTER TABLE agendamentos ADD COLUMN duracao INTEGER DEFAULT 30`, (err) => {
        if (err) {
          console.error('Erro ao adicionar coluna duracao:', err);
        } else {
          console.log('Coluna duracao adicionada com sucesso');
          // Atualizar registros existentes com duração padrão
          db.run(`UPDATE agendamentos SET duracao = 30 WHERE duracao IS NULL`);
        }
      });
    }
    
    // Adicionar coluna atualizado_em se não existir (sem valor padrão)
    if (!columnNames.includes('atualizado_em')) {
      db.run(`ALTER TABLE agendamentos ADD COLUMN atualizado_em DATETIME`, (err) => {
        if (err) {
          console.error('Erro ao adicionar coluna atualizado_em:', err);
        } else {
          console.log('Coluna atualizado_em adicionada com sucesso');
        }
      });
    }
  });

  // Verificar e atualizar estrutura da tabela dias_indisponiveis
  db.all("PRAGMA table_info(dias_indisponiveis)", (err, columns) => {
    if (err) {
      console.error('Erro ao verificar estrutura da tabela dias_indisponiveis:', err);
      return;
    }
    
    const columnNames = columns.map(col => col.name);
    console.log('Colunas da tabela dias_indisponiveis:', columnNames);
    
    // Adicionar coluna hora_inicio se não existir
    if (!columnNames.includes('hora_inicio')) {
      db.run(`ALTER TABLE dias_indisponiveis ADD COLUMN hora_inicio TEXT`, (err) => {
        if (err) {
          console.error('Erro ao adicionar coluna hora_inicio:', err);
        } else {
          console.log('Coluna hora_inicio adicionada com sucesso');
        }
      });
    }
    
    // Adicionar coluna hora_fim se não existir
    if (!columnNames.includes('hora_fim')) {
      db.run(`ALTER TABLE dias_indisponiveis ADD COLUMN hora_fim TEXT`, (err) => {
        if (err) {
          console.error('Erro ao adicionar coluna hora_fim:', err);
        } else {
          console.log('Coluna hora_fim adicionada com sucesso');
        }
      });
    }
  });
});

module.exports = db;
