# lekala-site (3DLastique)

Сайт «Лекала» + встроенные инструменты конструктора: техпаки, POM, каталог узлов и
редактор визуального стандарта (VSE). React + Vite.

## Запуск

```bash
npm run dev            # vite --host 0.0.0.0 --port 5175 --strictPort
npm run build
npm run lint
```

Dev-сервер: `http://localhost:5175/` — порт **жёстко закреплён** (`--strictPort`), если занят,
vite не поднимется на соседнем, а упадёт. Tech Pack: `http://localhost:5175/tools/techpack`.

## Проверки

```bash
npm run check:encoding    # python tools/check_encoding.py
npm run check:vse         # encoding + пробная сборка в dist-check
npm run install:hooks
```

## Инструменты

| Каталог | Что |
|---|---|
| `src/tools/pom/` | POM и техпаки: `PomBuilder`, `TechPackBuilder`, `TechPackHub`, `EditableTable`, экспорт (`exportTechPack.js`), справочники |
| `src/tools/vse/` | визуальный стандарт: `VseReview`, `LineEditor`, `pathTools.js` (+ тест `pathTools.test.mjs`) |
| `src/tools/nodes/` | `NodeCatalog` — каталог узлов |
| `src/components/` | лендинг: Hero, Products, Services, ForWhom, HowItWorks, Contact |

Справочники POM: `src/tools/pom/pom-reference.js` (`POM_REFERENCE`) и `pom-reference-acc.js`
(`POM_REFERENCE_ACC` + `POM_IMAGES_ACC`); библиотека узлов — `src/tools/pom/node-library.json`.

## VSE — известные дефекты (отложены)

Два структурных дефекта стандартизированного SVG. Продукт профессиональный, внимание к деталям
максимальное — оба нужно проработать, начинать со второго (даёт больший эффект).

1. **Перехлёст контурных линий.** Линии `contour_outer` иногда заходят за соседние вместо
   аккуратного касания. Причина — в исходном AI-файле сегменты нарисованы с перехлёстом,
   движок воспроизводит как есть. Варианты: clip-path по пересечениям (сложно) или
   `stroke-linecap: square → round` (косметика).
2. **Разрывы ритма в сквозной строчке.** `stitch_thru` состоит из нескольких отдельных
   path-объектов, а в SVG `dasharray` сбрасывается на каждом `M` и на каждом новом `<path>` —
   пунктир ломается на стыках. Решение: объединять все пути одной роли в один `<path>` с общей
   строкой `d`. Уберёт разрывы между объектами, но не внутри одного пути.

## Эталон для самопроверки разметки

Узел «Воротник/молния» (`sample_node.ai`, CH00001) содержит ровно:

- **5 выносок** (`callout_line`) — диагонали от подписей Zipper, Lining, Interlining, Lining,
  Zipper. `w=0.75`, `orient=D`, `data-sk="#1a1a1a|none|0.75|false|D"`
- **1 линию обрыва** (`break_line`) — горизонтальная, ~3.8°. `w=0.75`, `orient=H`,
  `data-sk="#1a1a1a|none|0.75|false"`
- **2 тесьмы молнии** (`hw_zipper_tape`) — `w=6` и `w=1.02`

Эти цифры проверяют корректность группировки: если в `VseReview` группа «Выноска» содержит
не 5 путей — значит проблема с `orient` или `data-sk`.
