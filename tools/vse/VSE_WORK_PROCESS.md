# VSE Work Process

Дата: июнь 2026

Цель документа: остановить хаотичные правки VSE, когда один фикс ломает другой слой, а источник ошибки становится непонятен.

## 1. Главный принцип

Каждая задача VSE должна проходить один и тот же путь:

```text
зафиксировать проблему
-> определить слой
-> выбрать canary nodes
-> сделать минимальный фикс
-> проверить canary
-> проверить контракт
-> только потом расширять на библиотеку
```

Нельзя одновременно чинить:

- классификацию;
- engine render;
- frontend UI;
- save-state;
- массовую перегенерацию;
- визуальный дизайн таблицы.

Один проход = один слой.

## 2. Слои VSE

Порядок слоев:

```text
orig.svg / original geometry
-> extraction / identity
-> detected_role
-> style_registry
-> node_annotations overrides
-> engine render
-> std.svg
-> UI display
```

Если ошибка видна в интерфейсе, сначала надо понять, на каком слое она появилась.

## 3. Типы задач

### 3.1 Classification

Пример: линия обрыва распознана как контур детали.

Можно менять:

- `roles.py`;
- classification helpers в `engine.py`;
- точечные правила `apply_node_role_override`, если это реально локальный случай.

Нельзя менять:

- UI;
- стили ролей;
- save-state;
- массово переписывать annotations.

### 3.2 Render

Пример: роль правильная, но в `std.svg` она выглядит неправильно.

Можно менять:

- `visual_standard.py`;
- render order в `engine.py`;
- trace attributes `data-elem-key`, `data-group-key`, `data-role`.

Нельзя менять:

- detected_role;
- node_annotations;
- UI-логику сохранения.

### 3.3 Save-State

Пример: роль сохранилась в JSON, но после reload пропала.

Можно менять:

- `api_server.py`;
- `node_annotations.json` loader/saver;
- contract trace.

Нельзя менять:

- стили ролей;
- classification heuristics;
- визуальный layout UI.

### 3.4 UI

Пример: данные правильные, но таблица показывает непонятно или не обновляется.

Можно менять:

- `VseReview.jsx`;
- `VseReview.css`.

Нельзя менять:

- `engine.py`;
- classification;
- persisted JSON.

## 4. Canary Nodes

Перед каждым исправлением выбрать 1-3 canary nodes.

Пример:

```text
SR00001 - zipper / buckle
AC00305 - visor break line
AC00002 - break line vs contour
RE00004 - group + element override
BH00001 - edge stitch
```

Canary фиксируется в отчете:

```text
node_id:
что не так:
ожидаемое поведение:
какой слой проверяем:
```

## 5. Обязательная диагностика перед фиксом

Перед изменением кода нужно получить минимум:

```text
GET /api/node-state/<node_id>
GET /api/node-contract-trace/<node_id>
std.svg data-role / data-group-key / data-elem-key
```

Для визуальных ролей также проверить:

```text
detected_role
override_role
final_role
rendered data-role
stroke
fill
stroke-width
stroke-dasharray
```

Скриншот пользователя полезен, но не является доказательством слоя ошибки.

## 6. Правило перегенерации

По умолчанию регенерировать только canary nodes.

Нельзя делать массовый regenerate всей библиотеки, пока:

- canary не прошел;
- причина ошибки не классифицирована;
- понятно, какие файлы изменятся.

Массовая перегенерация разрешена только отдельным этапом:

```text
baseline audit
-> upgrade/regenerate
-> after audit
-> compare before/after
```

## 7. Проверки после фикса

Минимум:

```powershell
python -m py_compile tools\vse\engine.py tools\vse\export_static.py tools\vse\api_server.py
npm run check:encoding
npx vite build --mode vse --outDir <temp-dir>
```

Для каждого canary:

```text
POST /api/regenerate-node/<node_id>
GET /api/node-state/<node_id>
GET /api/node-contract-trace/<node_id>
```

Контракт считается чистым, если:

```text
failed_groups = 0
failed_elements = 0
нет warning по проверяемому месту
std.svg содержит нужные data-* ключи
rendered_role == final_role
```

## 8. Batch Audit

Batch audit не заменяет canary.

Порядок:

```text
canary PASS
-> readonly audit
-> taxonomy remaining failures
-> fix by class
-> repeat readonly audit
```

Для всех 4116 узлов по умолчанию только readonly:

```powershell
python tools\vse\contract_audit.py --all --mode readonly
```

Destructive save/reload tests разрешены только для canary nodes.

## 9. Ручная проверка пользователем

Пользователю давать только один шаг за раз.

Правильно:

```text
Открой AC00305.
Наведи на строку "Линия обрыва".
Пришли скрин.
```

Неправильно:

```text
Проверь несколько узлов, поменяй роли, сохрани, обнови, посмотри монитор.
```

## 10. Стоп-условия

Работу надо остановить и классифицировать заново, если:

- новая ошибка появилась в другом слое;
- после фикса изменились десятки unrelated SVG;
- canary прошел, но batch audit резко ухудшился;
- UI показывает одно, а `node-state` другое;
- `std.svg` не содержит keyed trace;
- правка требует менять сразу classification и UI.

## 11. Формат отчета

Каждый отчет по VSE должен быть коротким и одинаковым:

```text
Задача:
Слой:
Canary:
Что было:
Что изменено:
Проверка:
Что осталось:
Следующий шаг:
```

Если есть FAIL, писать точку разрыва:

```text
node-state неверный
engine не применил final_role
std.svg не получил data-role
UI не перечитал node-state
monitor не смог сопоставить elem_key
```

## 12. Запрещено

Запрещено считать задачу закрытой по фразам:

- "визуально вроде работает";
- "JSON записался";
- "fallback сработал";
- "на одном скрине похоже нормально";
- "перегенерировал много узлов, стало лучше".

Нужно доказательство по конкретному `group_key` / `elem_key` или по конкретному классу batch audit.

