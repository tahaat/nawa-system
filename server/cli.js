// إدارة المستخدمين: node server/cli.js add <اسم> <دور: admin|meal|entry|coordinator> [مراكز مفصولة بفواصل]
//                  node server/cli.js list | disable <اسم>
import { openDb, addUser } from './server.js';
const db = openDb(process.env.NAWA_DB || './nawa-data.sqlite'); const [cmd, name, role, centers] = process.argv.slice(2);
if (cmd === 'add') { console.log('رمز', name + ':', addUser(db, name, role || 'entry', centers ? centers.split(',') : [])); }
else if (cmd === 'list') console.table(db.prepare('SELECT name,role,centers,active FROM users').all());
else if (cmd === 'disable') { db.prepare('UPDATE users SET active=0 WHERE name=?').run(name); console.log('تم التعطيل'); }
else console.log('add | list | disable');
