# VSE Classification Rules

Visual Standardization Engine — правила классификации путей из AI/PDF-файлов.
Файлы: `roles.py`, `engine.py`, `visual_standard.py`, `hardware_symbols.py`

---

## Архитектура: 4 уровня классификации

```
AI-файл → pymupdf path → Уровень 1 (геометрия) → Уровень 2 (контекст)
       → Уровень 3 (реестр стилей) → Уровень 4 (post-pass) → SVG
```

---

## Уровень 1 — Первичная классификация по геометрии (`roles.py: classify_path`)

Входные данные: цвет обводки, толщина, тип (открытый/закрытый), длина, кол-во items.

### Цветовые группы (`classify_color`)
| Цвет | Условие (RGB 0–1) |
|------|-------------------|
| RED | r>0.75, g<0.35, b<0.35 |
| GREEN | g>0.55, r<0.35, b<0.55 |
| CYAN | b>0.45, r<0.65, g>0.45 |
| BLUE | b>0.45, r<0.35, g<0.45 |
| BLACK | r<0.25, g<0.25, b<0.25 |
| WHITE | все каналы >0.9 |

### Правила по цвету и геометрии (порядок важен)

**Белые заливки** (`fill != None, color == WHITE, w >= 18, h >= 6`)
→ `fill_material_mask` — маска материала поверх аппаратуры

**Красные пути (RED):**
- `w >= 2.5` → `stitch_Bt` (закрепка / bar tack)
- дашед → `stitch_thru` (сквозная строчка)
- сплошная → `stitch_edge` (строчка по краю)

**Чёрные пути (BLACK):**
- закрытый + заливка → `fill_interlining` / `fill_fabric` / `fill_shape`
- плотный (много items) + дашед → zigzag → `stitch_zigzag`
- нейтрально-серый дашед → `contour_hidden`
- `w >= 1.5`, закрытый → `contour_outer`
- простая линия, длинная (>70pt), сплошная → `contour_outer`
- простая линия, короткая, рядом с текстом → `break_line`
- открытый, тонкий, w < 1.0, rw>80 или rh>80 → `break_line`

**Синие пути (BLUE, #1B4FA8):**
- `w 0.7–1.5`, size >= 6 → `callout_zoom` (выноска к увеличению)
- дашед → `boundary_zone`
- сплошная → `boundary_fragment`

**Зелёные пути (GREEN):**
- сплошная → `boundary_lining` (граница подкладки)
- дашед → `boundary_interlining` (граница флизелина)

**Заливки по тексту рядом:**
- текст содержит "elastic"/"резин" → `fill_elastic`
- текст содержит "cord"/"шнур" → `fill_cord`

**Молния:**
- плотный паттерн чёрных teeth → `hw_zipper`
- длинная тонкая лента → `hw_zipper_tape`

### Текстовые аннотации (`stitch_symbol`)

Текстовый span, где ВСЕ символы — одна буква "V" или "v", и кол-во символов ≥ 2 →
`stitch_symbol` (W-образный символ закрепки). Порог: `len(set(txt.lower())) == 1 and txt.lower()[0] == "v" and len(txt) >= 2`.
Конвертируется в SVG-путь (zigzag), оригинальный текст подавляется.

---

## Уровень 2 — Контекстные корректировки (`roles.py: near_text_contains`)

`near_text_contains(rect, text_words, tokens, threshold=55)` — проверяет есть ли рядом
текст с указанными токенами. Используется для fill_elastic, fill_cord.

`near_any_text(rect, text_words)` — есть ли рядом любой текст (используется для break_line).

---

## Уровень 3 — Реестр стилей (`engine.py: classify_with_registry`)

После первичной классификации применяется `role_registry_patch.json` —
словарь `style_key → role`, накопленный через workbench UI.

### Приоритеты реестра

Реестр имеет **абсолютный приоритет** для закрытых путей и сложных контуров.

**Исключения** — реестр НЕ перекрывает эвристику:
- `callout_line` — визуально назначенная выноска
- `break_line` — линия обрыва (короткий отрезок рядом с текстом)
- `stitch_Bt` — закрепка (w >= 2.5 красная)
- `hw_zipper_tape` — реестр может назначить tape, но эвристика проверяет длину

**Специальный случай:** длинная (>40pt) simple-stroke, у которой реестр говорит `break_line`
→ если длина > 40pt и нет текста рядом → `hw_zipper_tape` (зубья молнии)

### Per-file overrides (`engine.py: apply_node_role_override`)

Точечные исправления для конкретных файлов где геометрия неоднозначна:
- `ac00004.ai` — top/right crop edges → `break_line`
- `ac00002.ai` — shell fabric top/right edges → `break_line`
- `ac00007.ai` — zipper tape edge (вертикаль в зоне молнии) → `hw_zipper_tape_edge`
- `ac00007.ai` — короткие горизонтали в zipper pull → `contour_outer`
- `ac00200.ai` — closed thin outline (buckle) → `hw_buckle`
- `ac00200.ai` — D-ring body (w=1.0, near-closed, x=200-265, y=163-228) → `hw_buckle`
- `ac00200.ai` — buckle bar (w=1.0, x=213-250, y=168-182) → `hw_buckle`
- `ac00200.ai` — buckle pin circle (w=1.0, x=208-216, y=168-176, size≤6) → `hw_buckle` (без fill)
- `ac00200.ai` — короткие stitch_edge (h<5, w<5) → `stitch_thru`
- Любой файл: blue stroke w=0.7–1.5, size≥6, ранее `_skip/unknown/boundary_zone` → `callout_zoom`

---

## Уровень 4 — Post-processing (`engine.py`)

### Порядок post-pass

```
sanitize_color_role_conflicts
→ scale_stitch_bt_height (только stitch_symbol)
→ merge_stitch_thru_rows_for_render
→ add_buckle_fills_for_render
→ LAYER_ORDER sort
→ render SVG
```

### 4a. `sanitize_color_role_conflicts`

**Правило:** RED цвет + boundary_lining/interlining/fragment/zone → `stitch_thru` (дашед) или `stitch_edge` (сплошная).
Защита от ошибочных назначений реестра (красное не может быть подкладкой).

### 4b. `scale_stitch_bt_height` (только stitch_symbol)

**Задача:** уменьшить высоту W-символа строчки (stitch_symbol).
Масштабирует Y-координаты path items на 0.5 вокруг вертикального центра пути.
**Только для `stitch_symbol`** — `stitch_Bt` (закрепка) не масштабируется, сохраняет оригинальную длину.

### 4c. `normalize_fragmented_stitches`

**Задача:** короткие solid-фрагменты рядом с существующими stitch_thru строчками
→ переклассифицировать из `stitch_edge` в `stitch_thru`.

**Условия слияния горизонтальных:**
- `|y - ty| <= 2.5` (близкий Y)
- `|w - tw| <= 0.1` (одинаковая толщина)
- длина ≤ 8pt (короткий фрагмент)
- не дальше 90pt от ближайшей stitch_thru строчки

**Условия слияния вертикальных:**
- `|x - tx| <= 3.5`
- длина ≤ 25pt

### 4d. `reclassify_stitch_thru_crossing_contour` — ОТКЛЮЧЕНО

**Статус:** отключён из pipeline — слишком много ложных срабатываний.
`contour_outer` используется и для внешнего канта, и для внутренних разделителей зон,
поэтому автоматическое пересечение ненадёжно. Используй workbench для ручного исправления.

`sanitize_color_role_conflicts` (см. выше) решает основную проблему: красное ≠ lining.

### 4e. `merge_stitch_thru_rows_for_render`

**Задача:** фрагменты одной строчки (разбитые при экспорте из AI) → одна непрерывная линия.
Маленькие зазоры мержатся с bridge-линией `L` (вместо `M`) для цельного dash-паттерна.

**Горизонтальные (по Y-выравниванию):**
- Порог Y: `|Δy| <= 2.5pt`
- Порог X-gap: `gap <= 90pt`
- Зазор ≤ 15pt → мержим безусловно (stub за краем детали)
- Зазор > 15pt → `_contour_blocks_h_gap`

**Вертикальные (по X-выравниванию):**
- Порог X: `|Δx| <= 3.5pt`
- Порог Y-gap: `gap <= 30pt`
- Зазор ≤ 10pt → мержим безусловно
- Зазор > 10pt → `_contour_blocks_v_gap`

**Кривые и диагональные (`merge_stitch_chains`, threshold=12pt):**
- Endpoint proximity: `dist(end(A), start(B)) <= 12pt`
- Зазор ≤ 6pt → мержим безусловно (stub за краем)
- Зазор > 6pt → угловой фильтр (< 50°) + контурный фильтр зазора
- При мерже: зазор < 10pt → вставляем bridge `L` между звеньями

**Контурные сегменты** для блокировки мержа собираются из всех `contour_outer/cut/fold/hidden`,
включая bezier ("c")-items как хорду + 2 суб-хорды.

### 4f. `add_buckle_fills_for_render`

Под закрытые контуры пряжки (`hw_buckle`) добавляет непрозрачную заливку `hw_buckle_fill`.
Исключение: пути с rect.width ≤ 6 и rect.height ≤ 6 (pin hole) — без заливки.

### 4g. `render_zipper_clusters` (hardware_symbols.py)

Кластеры зубьев молнии → заменяются SVG-символом: две линии + слайдер.
Позиция слайдера = центр наибольшего filled-элемента в кластере.

### Порядок слоёв (LAYER_ORDER)

Снизу вверх (первый рендерится под всеми):
```
boundary_zone → fills (interlining, fabric, ...) → fill_material_mask → fill_cord
→ contour → seam → stitch → break_line
→ hw (zipper, buckle_fill, buckle, button, ...) → callout/arrow/unknown
```
Важно: `fill_material_mask` до `fill_cord` — маска не перекрывает шнур.
`hw_buckle_fill` до `hw_buckle` — заливка под контуром пряжки.

---

## Таблица ролей

| ID | Русское название | Цвет стандарта | Дашед |
|----|-----------------|----------------|-------|
| `contour_outer` | Контур детали | #1A1A1A w=1.5 | нет |
| `contour_fold` | Линия сгиба | #1A1A1A w=0.75 | 8-3-2-3 |
| `contour_cut` | Линия разреза | #1A1A1A w=1.0 | нет |
| `contour_hidden` | Невидимый контур | #8A8A8A w=0.65 | 4-2 |
| `seam_line` | Линия шва | #1A1A1A w=2.5 | нет |
| `seam_allowance` | Припуск на шов | #555555 w=0.5 | 4-2 |
| `stitch_edge` | Строчка по краю | #C8102E w=0.75 | нет |
| `stitch_thru` | Сквозная строчка | #C8102E w=0.75 | 3-1.5 |
| `stitch_topstitch` | Отделочная | #C8102E w=1.0 | 6-2 |
| `stitch_double` | Двойная строчка | #C8102E w=0.75 | 6-2 |
| `stitch_hidden` | Скрытая строчка | #C8102E w=0.5 | 2-4 |
| `stitch_cover` | Распошивальная | #C8102E w=1.0 | 4-1-1-1 |
| `stitch_overlock` | Оверлочная | #C8102E w=0.75 | 1-1 |
| `stitch_L` | Строчка L (301) | #C8102E w=0.75 | нет |
| `stitch_C` | Строчка C (401) | #C8102E w=0.75 | 4-2 |
| `stitch_O` | Оверлок O (504) | #C8102E w=1.0 | 2-1-2-1 |
| `stitch_F` | Распошивалка F | #C8102E w=1.2 | 4-1-1-1-4-1 |
| `stitch_zigzag` | Зигзаг | #C8102E w=0.75 | 2-0.5 |
| `stitch_Bt` | Закрепка (Bt/Bc) | **#C8102E w=3.0** | нет |
| `stitch_symbol` | Символ строчки (W) | #1A1A1A w=0.5 | нет |
| `boundary_fragment` | Граница фрагмента | #27A6DE w=1.5 | нет |
| `boundary_zone` | Граница зоны | #1B4FA8 w=0.75 | 6-3 |
| `boundary_lining` | Граница подкладки | #009B4D w=1.0 | нет |
| `boundary_interlining` | Граница флизелина | #009B4D w=0.75 | 4-2 |
| `fill_interlining` | Штриховка флизелина | #888888 w=0.5 | нет |
| `fill_fabric` | Штриховка ткани | #555555 w=0.5 | нет |
| `fill_fabric_gray` | Серая ткань | #9E9E9E w=0.5 | нет |
| `fill_dark_fabric` | Тёмная ткань | #444444 w=0.5 | нет |
| `fill_contrast` | Контрастная деталь | #B54422 w=0.5 | нет |
| `fill_tape` | Тесьма | #777777 w=0.5 | нет |
| `fill_binding` | Окантовка | #B8763A w=0.5 | нет |
| `fill_elastic` | Резинка | #666666 w=0.5 | нет |
| `fill_cord` | **Шнур** | **#57585B fill** | нет |
| `fill_pu_tape` | PU-лента | #6B6B6B w=0.5 | нет |
| `fill_piping` | Кант | #9B741B w=0.5 | нет |
| `fill_glue` | Клей | #7E6A3A w=0.5 | 3-2 |
| `fill_gradient` | Градиент | #777777 w=0.5 | нет |
| `fill_fur` | Мех | #6B4A2E w=0.5 | нет |
| `fill_shadow` | Металл/тень | #6F6F6F w=0.5 | нет |
| `fill_material_mask` | Маска материала | белая заливка | нет |
| `fill_shape` | Заливка формы | fill:#E8E8E8 | нет |
| `construction_aux` | Вспомог. линия | #555555 w=0.5 | нет |
| `break_line` | Линия обрыва | #1d1c1a w=0.75 | нет |
| `callout_line` | Выноска | #221f1f w=0.75 | нет |
| `callout_zoom` | Выноска к увелич. | #214099 w=1.0 | нет |
| `dim_line` | Размерная линия | #221f1f w=0.5 | нет |
| `arrow` | Стрелка | #333333 w=0.6 | нет |
| `line_gathered_edge` | Сборка | #777777 w=0.45 | нет |
| `hw_zipper` | Молния | #1A1A1A w=1.2 | нет |
| `hw_zipper_tape` | Лента молнии | #1A1A1A w=1.0 | нет |
| `hw_buckle` | Пряжка | **#1A1A1A w=0.75** | нет |
| `hw_buckle_fill` | Заливка пряжки | fill:#F7F2DD | нет |
| `hw_button` | Пуговица | #1A1A1A w=1.0 | нет |
| `hw_buttonhole` | Петля (Bh) | #1A1A1A w=1.0 | нет |
| `hw_snap` | Кнопка | #1A1A1A w=1.0 | нет |
| `hw_other` | Прочая фурнитура | #1A1A1A w=1.0 | нет |
| `label` | Текстовая метка | — | — |
| `unknown` | Не определено | #999999 w=0.5 | нет |

---

## UI — Workbench (VseReview.jsx)

### Таблица ролей (`roleGroupsFromSvg`)
- Читает **stdSvg** (не origSvg) — роли после всех post-pass
- Группирует пути по: role + stroke + fill + width + dashed
- **Слияние похожих цветов:** Manhattan distance < 90 для stroke → одна строка
- **Слияние близких толщин:** |Δwidth| < 0.6 при одинаковой роли и цвете
- Сортировка: по роли (алфавит), внутри роли — по count (desc)

### Группы ролей в dropdown
- Контуры: contour_outer, fold, cut, hidden
- Швы: seam_line, seam_allowance
- Строчки: stitch_edge, thru, topstitch, double, hidden, cover, overlock, zigzag, L/C/O/F, Bt, **symbol**
- Слои и зоны: boundary_*
- Заливки: fill_*
- Фурнитура: hw_*
- Выноски: callout_line/zoom, dim_line, arrow
- Смысловые линии: guide, line_*, break_line

---

## Открытые проблемы

### ✅ P1 — Endpoint-proximity для reclassify — РЕШЕНО
Добавлена поддержка bezier контуров (хорда + суб-хорды). Строгое пересечение EPS.

### ✅ P8 — M...M... в кривых строчках — ЧАСТИЧНО РЕШЕНО
Bridge `L` вставляется при сборке merged_items для зазоров < 10pt. Крупные зазоры (>10pt) всё ещё дают M.

### 🔴 P2 — Bezier direction check в merge_stitch_chains
`_path_exit_direction` для "c"-items использует control-point, а не tangent. Может ошибаться для кривых.

### 🟡 P3 — reclassify отключён
Автоматическое `stitch_thru → stitch_edge` по пересечению контура отключено из-за ложных срабатываний.
Используй workbench для ручного назначения. `sanitize_color_role_conflicts` покрывает основной случай (красное ≠ lining).

### 🟡 P4 — fill_interlining: разные семантики
fill_interlining используется для штриховки флизелина, padding, артефактных заливок. Нужен fill_padding.

### 🟡 P5 — Молния: slider position
Иногда filled-элемент = стопор, не слайдер.

### 🟡 P6 — Параллельные строчки
Близкие диагональные строчки с dist < 8pt и схожим направлением могут смержиться.

### 🟢 P7 — Workbench: ~196 unassigned стилей
Требуется ручная работа в workbench UI.

---

## Файловая структура

```
tools/vse/
  roles.py              — Уровень 1-2: первичная классификация
  engine.py             — Уровень 3-4: реестр, post-pass, merge, render
  visual_standard.py    — Визуальные стили (stroke/fill/opacity) для каждой роли
  hardware_symbols.py   — SVG-символы для молний
  export_static.py      — Пакетный экспорт AI → SVG (4116 нодов)
  api_server.py         — Flask API: сохранение реестра, apply-unknown-roles
  role_registry_patch.json — Накопленный реестр стилей (style_key → role)
  nodes.json            — Каталог нодов (file, id, label, code, category)
  CLASSIFICATION_RULES.md — Этот файл

src/tools/vse/
  VseReview.jsx         — UI: workbench, сравнение orig/std, назначение ролей
  VseReview.css         — Стили UI
```
