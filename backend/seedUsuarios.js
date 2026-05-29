require('dotenv').config();
const bcrypt = require('bcrypt');
const db     = require('./src/config/db');

const USUARIOS = [
  {
    Nombre:    'Administrador',
    Email:     'admin@kika.com',
    Password:  'Admin1234',
    ROL_idROL: 4,
  },
  {
    Nombre:    'Roja Fierro',
    Email:     'rojafierro1000@gmail.com',
    Password:  '123456789',
    ROL_idROL: 1,   // Materia Prima — ajusta si es otro rol
  },
  {
    Nombre:    'Costeo',
    Email:     'Costeo@kika.com',
    Password:  'costeo1234',
    ROL_idROL: 2,   // Costeo / Finanzas
  },
];

async function seedUsuarios() {
  try {
    // 1. Insertar roles
    console.log('📋 Insertando roles...');
    await db.execute(`
      INSERT IGNORE INTO ROL (idROL, Nombre, Descripcion) VALUES
      (1, 'Materia Prima',  'Gestión de telas e insumos'),
      (2, 'Costeo',         'Conformación de precios'),
      (4, 'Administrador',  'Acceso total al sistema')
    `);
    console.log('✅ Roles listos.');

    // 2. Insertar usuarios
    for (const u of USUARIOS) {
      const hash   = await bcrypt.hash(u.Password, 10);
      const existe = await db.query(
        'SELECT idUSUARIO FROM USUARIO WHERE Email = ?', [u.Email]
      );

      if (existe.length > 0) {
        await db.execute(
          'UPDATE USUARIO SET Password = ?, ROL_idROL = ?, Activo = 1 WHERE Email = ?',
          [hash, u.ROL_idROL, u.Email]
        );
        console.log(`🔄 Actualizado:  ${u.Email}`);
      } else {
        await db.execute(
          'INSERT INTO USUARIO (Nombre, Email, Password, Activo, ROL_idROL) VALUES (?, ?, ?, 1, ?)',
          [u.Nombre, u.Email, hash, u.ROL_idROL]
        );
        console.log(`✅ Creado:        ${u.Email}  (Rol ${u.ROL_idROL})`);
      }
    }

    console.log('\n─────────────────────────────────────────');
    console.log('Usuario               | Rol');
    console.log('─────────────────────────────────────────');
    USUARIOS.forEach(u => {
      console.log(`${u.Email.padEnd(22)}| ${u.ROL_idROL} — ${
        {1:'Materia Prima',2:'Costeo',4:'Administrador'}[u.ROL_idROL]
      }`);
    });
    console.log('─────────────────────────────────────────');
    console.log('¡Listo! Ya puedes iniciar sesión.\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seedUsuarios();
