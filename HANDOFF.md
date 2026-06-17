# VSE — Handoff Document

**Дата:** июнь 2026  
**Проект:** Visual Standardization Engine — инструмент стандартизации технических чертежей одежды  
**Репозиторий:** `F:/Projects/lekala-site`

---

## Суть проекта

Конструкторы одежды создают технические чертежи в Adobe Illustrator (~4116 файлов).  
Каждый файл — один конструктивный узел (молния, шов, кромка, усиление и т.д.).  
Чертежи нарисованы вручную, у каждого свои цвета, толщины, стили.

**VSE** читает AI-файлы через PyMuPDF, классифицирует каждый путь по роли (контур детали, строчка, выноска, шнур...) и выдаёт стандартизированный SVG с единой цветовой схемой.

**Цель:** библиотека из ~4116 нодов в едином визуальном стандарте для Tech Pack.

---

## Где что лежит

```
F:/Projects/lekala-site/
│
├── INFO/unzip/1.Узлы and Workmanship/   ← ИСХОДНЫЕ AI-ФАЙЛЫ (~4111 из 4116 есть)
│   ├── ! Усиление/
│   ├── !Застёжка-молния спереди/
│   └── ... (~40 категорий)
│
├── tools/vse/                           ← PYTHON BACKEND
│   ├── engine.py                        — pipeline: AI → стандартизированный SVG
│   ├── roles.py                         — первичная классификация путей
│   ├── visual_standard.py               — таблица ролей: стили (цвет, толщина, dash)
│   ├── hardware_symbols.py              — SVG-генераторы молний, пряжек, колец
│   ├── export_static.py                 — пакетный экспорт → public/vse/
│   ├── api_server.py                    — Flask API (порт 7070)
│   ├── bbox.py                          — обрезка белых полей
│   ├── callout_graph.py                 — анализ выносок между нодами
│   ├── nodes.json                       — каталог 4116 нодов (id, label, code, file)
│   ├── style_registry.json              — реестр 277 стилей с назначенными ролями
│   ├── approved_nodes.json              — ноды помеченные как "утверждённые"
│   ├── elem_overrides.json              — per-element overrides по path_d
│   └── CLASSIFICATION_RULES.md         — документация архитектуры классификации
│
├── src/tools/vse/
│   ├── VseReview.jsx                    ← REACT WORKBENCH (~1800 строк)
│   └── VseReview.css
│
└── public/vse/                          ← ЭКСПОРТИРОВАННЫЕ SVG (статика, в git)
    ├── manifest.json                    — 4116 нодов с путями к SVG
    ├── {id}_orig.svg                    — исходный SVG с data-role, data-sk
    ├── {id}_std.svg                     — стандартизированный SVG
    ├── style_registry.json              — копия реестра для UI
    └── callout_graph.json               — граф выносок
```

---

## Как запустить

### 1. Dev-сервер (React UI)
```powershell
cd F:/Projects/lekala-site
npm run dev
# → http://localhost:5175/tools/vse
```

### 2. Python API (обязательно для работы Workbench)
```powershell
cd F:/Projects/lekala-site/tools/vse
python api_server.py
# → http://localhost:7070
```
Или через VS Code таск: **Lekala Site: VSE API server (7070)**  
(таск находится в `F:/dev-workspace.code-workspace`)

### 3. Зависимости Python
```powershell
pip install flask flask-cors pymupdf
```

### 4. Экспорт одного нода (быстро, ~5-10 сек)
```powershell
cd F:/Projects/lekala-site/tools/vse
$env:VSE_NODE_ID_FILTER="re00004"; python export_static.py
```

### 5. Полный экспорт всех нодов (долго, несколько часов)
```powershell
cd F:/Projects/lekala-site/tools/vse
python export_static.py
```

---

## Pipeline классификации

```
AI-файл
  ↓  PyMuPDF: извлечь пути, цвета, толщины, items
  ↓
[Уровень 1] roles.py — классификация по цвету и геометрии
  — красный → stitch_edge / stitch_thru
  — синий → callout_zoom
  — дашед → stitch_thru
  — замкнутый + большой → boundary_fragment
  ↓
[Уровень 2] roles.py — контекстные уточнения по тексту рядом
  — "cord" → fill_cord, "elastic" → fill_elastic
  ↓
[Уровень 3] engine.py — реестр стилей (style_registry.json)
  — ищет совпадение по ключу stroke|fill|width|dashed|orient|sz
  — если есть — перекрывает уровни 1-2
  ↓
[Уровень 4] engine.py — post-processing
  — normalize_fragmented_stitches: объединить фрагменты строчки
  — sanitize_color_role_conflicts: красный ≠ подкладка
  — render_zipper_clusters: нарисовать SVG-символ молнии
  — add_buckle_fills: белая заливка под пряжки
  ↓
[Уровень 5] elem_overrides.json — per-element overrides
  — переопределяет роль конкретного пути по первым 40 символам d=""
  ↓
{id}_std.svg — итоговый стандартизированный SVG
```

---

## Основные роли

| Роль | Цвет | px | Назначение |
|---|---|---|---|
| `contour_outer` | #1A1A1A | 1.5 | Контур детали |
| `contour_fold` | #1A1A1A | 0.75 | Линия сгиба |
| `construction_line` | #1A1A1A | 0.5 | Конструктивная линия |
| `stitch_edge` | #C8102E | 0.75 | Строчка по краю |
| `stitch_thru` | #C8102E | 0.75 дашед | Сквозная строчка |
| `stitch_Bt` | #C8102E | 3.0 | Закрепка (bar tack) |
| `boundary_fragment` | #27A6DE | 1.5 | Прокладка / вставка |
| `boundary_lining` | #009B4D | 1.0 | Подкладка |
| `fill_cord` | #333333 | 0.5 | Шнур / cord |
| `hw_zipper_tape` | #1A1A1A | 1.0 | Тесьма молнии |
| `callout_zoom` | #1B4FA8 | 0.75 | Выноска к увеличению |
| `callout_line` | #333333 | 0.6 | Выноска |
| `break_line` | #1A1A1A | 0.5 | Линия обрыва |
| `line_gathered_edge` | #777777 | 0.45 | Сборенный край |

Полный список (80+ ролей): `tools/vse/CLASSIFICATION_RULES.md`, `visual_standard.py`, `VseReview.jsx` (константа `ROLE_STYLES`).

---

## React Workbench — VseReview.jsx

URL: `http://localhost:5175/tools/vse`

### Вкладки
- **Разметка** — основная рабочая вкладка: оригинал + стандарт бок о бок, таблица ролей
- **Выноски и обозначения** — граф выносок между нодами
- **Реестр стилей** — просмотр всех записей style_registry.json

### Флоу работы с нодом
1. Выбрать нод из списка слева (поиск по коду/названию/id)
2. В таблице ролей справа — сменить роль в dropdown если классификация неверна
3. Нажать **"Сгенерировать стандарт →"** — API сохраняет реестр и перегенерирует только этот нод
4. Нажать **"✓ Утвердить"** когда нод выглядит правильно

### Per-element override (для одного элемента, не всей группы)
1. Кликнуть на элемент в панели оригинала — он подсветится жёлтым
2. В таблице появится строка с золотым фоном
3. Сменить роль в этой строке
4. Нажать **✓** в строке — override сохраняется в `elem_overrides.json`
5. Нажать **"Сгенерировать стандарт →"** для применения

### Live preview
Смена роли в dropdown сразу меняет стиль в SVG-панели стандарта через CSS-override с `!important`. Это только визуальный preview — реально SVG пересобирается только после нажатия кнопки.

---

## API Server (порт 7070)

| Метод | URL | Назначение |
|---|---|---|
| POST | `/api/save-registry` | Сохранить реестр + перегенерировать нод (node_id обязателен для одиночного экспорта) |
| POST | `/api/save-unknown-roles` | Сохранить назначения неизвестных стилей |
| POST | `/api/apply-unknown-roles` | Применить unknown roles → реестр + экспорт |
| GET | `/api/status` | Статус последней операции генерации |
| GET/POST | `/api/elem-override` | Получить/сохранить per-element overrides |
| GET/POST | `/api/node-status` | Получить/изменить статус нода (approved/complex) |

**Важно:** сервер должен быть запущен для работы Workbench. Слушает на `0.0.0.0:7070` — доступен с других устройств в сети.

---

## Известные проблемы и ограничения

### Критические
- **Генерация нода через Workbench регенерирует все 4116 нодов** вместо одного — баг в `_export_node_bg` в `api_server.py`, исправление в текущей версии (используется `sys.executable` и правильный `cwd=ROOT`), требует тестирования после перезапуска API

### Качество классификации
- Категории аксессуаров (200+, фурнитура) требуют ручной правки ролей
- VSE visual issues: перехлёст контурных линий на сложных нодах
- Разрывы ритма строчки при нестандартных интервалах

### Запланировано
- Интарсия-зоны: конвертация фрагментов через intersect/diffMulti
- Per-node layer order для правильного наложения деталей

---

## Ключевые файлы для изменений

| Задача | Файл |
|---|---|
| Добавить/изменить роль (стиль) | `tools/vse/visual_standard.py` + `VseReview.jsx` (ROLE_STYLES, ROLE_LABELS) |
| Изменить логику классификации | `tools/vse/roles.py` |
| Изменить post-processing | `tools/vse/engine.py` |
| Изменить UI Workbench | `src/tools/vse/VseReview.jsx` |
| Добавить API эндпоинт | `tools/vse/api_server.py` |

---

## Статус (июнь 2026)

- Реестр стилей: **277 записей** (накоплен на части нодов)
- Нодов утверждено: **0** (процесс ревью в начале)
- AI-файлов: **4111 из 4116** есть локально
- Manifest.json: **4116 нодов** (восстановлен из git после инцидента с перезаписью)
