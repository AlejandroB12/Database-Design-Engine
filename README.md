# 📊 Database Design Engine — SQL-to-Diagram Modeler

> **Transforma scripts SQL en diagramas ER interactivos al instante.**  
> Una herramienta web completa, 100% local, para visualizar, editar y exportar esquemas de bases de datos relacionales.

---

## 🚀 Características

| Funcionalidad | Descripción |
|---|---|
| **🧠 Parseo Inteligente de SQL** | Analiza `CREATE TABLE`, `ALTER TABLE ADD FOREIGN KEY`, constraints inline (`PRIMARY KEY`, `NOT NULL`, `UNIQUE`, `AUTO_INCREMENT`, `REFERENCES`), `SERIAL`/`BIGSERIAL`, `ENUM` y cardinalidades vía comentarios (`-- 1:1`, `-- M:N`). Compatible con MySQL, PostgreSQL, SQL Server y SQLite. |
| **🎨 Diagrama Interactivo** | Diagramas SVG drag-and-drop con zoom (0.25×–3×), paneo, selección múltiple, rutas ortogonales editables con waypoints y detección de colisiones. |
| **⚡ Auto-Layout Inteligente** | 9 algoritmos de ordenamiento: topológico por capas, heurístico de barycenter, por nombre (A-Z / Z-A), por cantidad de columnas, por categoría, por color, por relaciones y en cuadrícula (3/4/5 columnas). |
| **🏷️ Capas y Categorías** | Crea regiones visuales coloreadas para agrupar tablas, asígnale categorías con color y borde distintivo. |
| **✏️ Editor de Tablas en Línea** | Renombra tablas, agrega/elimina columnas, togglea constraints (PK, AI, NN, UQ) y cambia tipos de dato sin salir del canvas. |
| **🔗 Editor de Relaciones** | Agrega relaciones FK manualmente, cambia cardinalidades (1:1, 1:M, M:1, M:M), edita rutas con waypoints y deshace cambios. M:M genera automáticamente tabla puente. |
| **🔄 Generación de SQL** | Re-genera scripts `CREATE TABLE` en MySQL o PostgreSQL desde el modelo visual, incluyendo constraints, FK y comentarios de cardinalidad. |
| **📤 Exportación PNG / PDF** | Renderizado nativo en Canvas 2D a 2× de resolución con vista previa interactiva (zoom + paneo). Sin dependencia de html2canvas. |
| **📂 Importación de Archivos** | Carga archivos `.sql` o pega código directamente en el editor con resaltado de sintaxis. |
| **📊 Dashboard de Estadísticas** | Vista general con conteo de tablas, columnas, relaciones, PKs y FKs. |
| **🌙 Tema Oscuro** | Interfaz inspirada en GitHub Dark Mode con paleta `#0d1117`, `#58a6ff`, `#3fb950`, `#a371f7`, `#d29922` y `#f85149`. |

---

## 🖼️ Vista Previa

```
┌─────────────────────────────────────────────────────────────┐
│  🗄️  SQL Editor                          📈  Dashboard      │
│  ┌──────────────────┐   ┌────────────────────────────────┐  │
│  │ CREATE TABLE      │   │  Tablas: 12   Columnas: 58    │  │
│  │ clientes (        │   │  Relaciones: 9   PK: 12       │  │
│  │   id INT PK AI,   │   └────────────────────────────────┘  │
│  │   nombre VARCHAR  │                                        │
│  │   ...             │   ┌────────────────────────────────┐  │
│  └──────────────────┘   │  📐 Diagrama ER Interactivo    │  │
│                         │                                │  │
│  🎨 Capas | 🏷️ Cats   │  ┌─────────┐   ┌─────────┐    │  │
│  🔗 Relaciones | 📤   │  │clientes │───│ pedidos │    │  │
│                        │  └─────────┘   └─────────┘    │  │
│                        └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧱 Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Backend** | Python + FastAPI + Uvicorn |
| **Frontend** | HTML + React 18 + Babel Standalone + Tailwind CSS (vía CDN) |
| **Parseo SQL** | Motor propio basado en expresiones regulares |
| **Renderizado** | SVG (diagrama interactivo) + Canvas 2D (exportación PNG/PDF) |
| **Exportación PDF** | pdf-lib |
| **Sin compilación** | Todo el JSX se transpila en el navegador. Sin Webpack, Vite ni build steps. |

---

## 📦 Instalación y Uso

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/Database-Design-Engine.git
cd Database-Design-Engine

# 2. Instala dependencias de Python
pip install -r requirements.txt

# 3. Inicia el servidor
python main.py
```

Luego abre **http://localhost:8000** en tu navegador.

| Ruta | Página |
|---|---|
| `/` | Landing page |
| `/generador` | Generador de diagramas completo |
| `/demo` | Demo con SQL precargado |
| `/login` / `/register` | Inicio de sesión y registro |

> 💡 **Nota:** Una vez cargada la página, toda la computación ocurre en el navegador.  
> No se requieren llamadas API — funciona **100% offline** después de la carga inicial.

---

## 📁 Estructura del Proyecto

```
Database-Design-Engine/
├── main.py                        # Servidor FastAPI (punto de entrada)
├── requirements.txt               # Dependencias Python
├── LICENSE                        # MIT License
│
├── assets/
│   ├── images/                    # Fondos y capturas de pantalla
│   └── style/                     # Estilos CSS heredados
│
├── frontend/
│   ├── lib/                       # Librerías CDN (React, Tailwind, pdf-lib, etc.)
│   ├── routes/
│   │   ├── utils.js               # Utilidades compartidas y resaltado SQL
│   │   ├── parser.js              # Parseador SQL → modelo de tablas
│   │   ├── generators.js          # Modelo → SQL (MySQL / PostgreSQL)
│   │   ├── layout.js              # Algoritmos de auto-layout
│   │   └── export.js              # Exportación a PNG / PDF (Canvas 2D)
│   └── views/
│       ├── index.html             # Página de aterrizaje
│       ├── login.html             # Inicio de sesión / registro
│       ├── demo-generator         # Demo ligero (SQL de ejemplo)
│       └── diagram-generator      # Generador de diagramas completo
```

---

## 🧠 Arquitectura

```
                   ┌──────────────────────────────────────┐
                   │          Navegador (Cliente)          │
                   │                                      │
    SQL ──────► parser.js ──► Modelo ──► SVG/Canvas       │
    (input)        │           (JSON)      │               │
                   │              │         │               │
                   │              ▼         ▼               │
                   │        generators.js  export.js        │
                   │              │         │               │
                   │              ▼         ▼               │
                   │        SQL output   PNG / PDF          │
                   │        (MySQL/PG)                      │
                   └──────────────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │  Servidor (main.py)   │
                   │  FastAPI · estático   │
                   └──────────────────────┘
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si encuentras un bug o tienes una idea para mejorar la herramienta, siéntete libre de abrir un issue o enviar un PR.

---

## 📄 Licencia

Distribuido bajo la licencia **MIT**. Consulta el archivo [`LICENSE`](LICENSE) para más información.

---

<p align="center">
  Hecho con ❤️ por <a href="https://github.com/AlejandroBriceno">Alejandro Briceno</a>
</p>
