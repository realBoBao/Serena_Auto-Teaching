import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./vectors.db');
db.exec("DELETE FROM algo_daily WHERE key IN ('solved_history','solved','current_problem')");
db.close();
console.log('✅ Algo reset → easy');
