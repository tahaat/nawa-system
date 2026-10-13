// إدارة المستخدمين: node server/cli.js add <اسم> <دور: admin|meal|entry|coordinator|projects|facilitator> [مراكز مفصولة بفواصل]
//                  node server/cli.js list | disable <اسم> | passwd <اسم> [كلمة]
import { openDb, addUser, setPassword, genPassword } from './server.js';
const db = openDb(process.env.NAWA_DB || './nawa-data.sqlite'); const [cmd, name, role, centers] = process.argv.slice(2);
if (cmd === 'add') { const t = addUser(db, name, role || 'entry', centers ? centers.split(',') : []), pw = genPassword(); setPassword(db, name, pw, 1); console.log('المستخدم', name, '\nكلمة المرور المؤقتة:', pw, '\nرمز المزامنة:', t); }
else if (cmd === 'passwd') { const pw = process.argv[4] || genPassword(); setPassword(db, name, pw, 1); console.log('كلمة المرور الجديدة لـ', name + ':', pw); }
else if (cmd === 'list') console.table(db.prepare('SELECT name,role,centers,active FROM users').all());
else if (cmd === 'disable') { db.prepare('UPDATE users SET active=0 WHERE name=?').run(name); console.log('تم التعطيل'); }
else console.log('add | list | disable');
