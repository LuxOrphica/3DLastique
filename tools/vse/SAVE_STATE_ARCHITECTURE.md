# VSE Save-State Architecture

Дата: июнь 2026  
Проект: `F:/Projects/lekala-site`

## 0. Коротко: что есть сейчас

Сейчас система устроена так:

1. Мы берем исходный узел: `AI -> orig.svg`.
2. `engine.py` классифицирует пути и строит `std.svg`.
3. UI показывает `orig.svg` и `std.svg` рядом.
4. Пользователь вручную меняет роли:
   - либо у группы справа в таблице;
   - либо у одного конкретного элемента.
5. Эти изменения пытаются сохраняться в JSON-файлы.
6. После reload UI пытается восстановить эти изменения.

Главная проблема сейчас такая:

**сохранение есть частично, но восстановление состояния после reload ненадежно.**

То есть пользователь видит это так:

- изменил роль;
- нажал сохранить или сгенерировать;
- после обновления страницы изменение пропало.

---

## 1. Что реально работает сейчас

### 1.1 Рендер standard

Работает:

- исходный `AI` читается;
- `orig.svg` и `std.svg` собираются;
- роли применяются;
- канонические стили ролей применяются в standard render.

### 1.2 Глобальный реестр стилей

Работает файл:

- `tools/vse/style_registry.json`

Он хранит глобальные style-to-role правила.

### 1.3 Точечные element overrides

Работает файл:

- `tools/vse/elem_overrides.json`

Туда реально можно записать override для одного path.

### 1.4 Node-level group overrides

Есть файл:

- `tools/vse/node_style_overrides.json`

И backend уже умеет его читать и применять при рендере.

---

## 2. Что сейчас не работает надежно

### 2.1 Reload после ручной правки

Главная боль сейчас здесь.

Проблема не только в записи файла, а в том, что после reload UI не всегда может правильно восстановить:

- какую группу пользователь правил;
- какой конкретно элемент пользователь правил.

### 2.2 Почему пользователь видит это как «сохранение не работает»

Потому что практический критерий такой:

1. назначил роль;
2. пересобрал;
3. обновил страницу;
4. увидел то же самое.

Если шаг 4 не сработал, значит с точки зрения пользователя **сохранение не работает**, даже если какой-то JSON формально обновился.

---

## 3. Какие сейчас есть слои данных

### 3.1 Original

Это исходная геометрия узла.

Источники:

- AI-файл;
- `public/vse/{id}_orig.svg`

Это нужно для:

- извлечения path;
- исходных style-признаков;
- группировки сущностей.

### 3.2 Standard

Это результат рендера:

- `public/vse/{id}_std.svg`

Это нужно для:

- просмотра стандартизированной версии;
- сравнения «до / после».

Важно:

**`standard.svg` не должен быть источником истины для сохранения.**

### 3.3 Persisted save-state

Сейчас ручные назначения размазаны по трем местам:

- `style_registry.json` — глобальные стилевые правила;
- `node_style_overrides.json` — group override на уровне узла;
- `elem_overrides.json` — override конкретного элемента.

Именно это создает путаницу.

---

## 4. Как сейчас идет поток данных

Текущая схема примерно такая:

```text
AI / original geometry
  -> classification in roles.py / engine.py
  -> apply style_registry / node_style_overrides / elem_overrides
  -> build standard.svg
  -> UI reload
  -> UI читает standard.svg и пытается снова собрать группы / элементы
  -> UI пытается заново сопоставить сохраненные назначения
```

Слабое место здесь в конце:

**UI после reload пытается восстановить edit-state через уже сгенерированный `standard.svg`.**

И вот это архитектурно ненадежно.

---

## 5. Почему восстановление плавает

Потому что `standard.svg` — это output, а не база данных.

При пересборке в нем могут меняться:

- порядок path;
- состав групп;
- merged fragments;
- render-only элементы;
- `path_d`;
- стили после канонизации.

Из-за этого после reload UI часто уже смотрит не на те сущности, которые пользователь правил до этого.

Именно поэтому сейчас возможна ситуация:

- запись в JSON произошла;
- но UI не смог правильно сопоставить ее обратно;
- и визуально кажется, что ничего не сохранилось.

---

## 6. Что должно быть источником истины

Нормальная модель должна быть такой:

### 6.1 Original

Отвечает на вопрос:

**что это за сущность?**

### 6.2 Save-state

Отвечает на вопрос:

**что пользователь назначил этой сущности?**

### 6.3 Standard

Отвечает на вопрос:

**как это теперь показать в стандартизированном виде?**

То есть:

- `original` = база геометрии;
- `save-state` = база ручных назначений;
- `standard` = только output.

---

## 7. Что значит «стабильный ключ»

Это самый важный вопрос всей архитектуры.

Когда пользователь меняет роль, нам надо потом после reload найти **ровно ту же сущность**.

### 7.1 Для группы

Нам нужен ключ группы внутри конкретного узла.

Не глобально по библиотеке.

Почему:

- одинаковый `key_str` может встречаться в разных узлах;
- одинаковый стиль может означать разные роли.

Поэтому для group override правильная привязка такая:

- `node_id`;
- `group_key`;
- плюс `key_strs[]` как запасной reference.

Здесь важно главное:

**group key должен строиться от original, а не от standard.**

### 7.2 Для одного элемента

Нужен стабильный ключ элемента.

Сейчас мы временно живем на `path_d`, но это слабый способ.

Нормальная цель:

- иметь `elem_key`, рассчитанный по исходной геометрии original;
- а `path_d_prefix` использовать только как временный fallback.

---

## 8. Что хотим получить в итоге

Нужен **один понятный node-level source of truth**.

Но важный нюанс:

нам нужен не просто файл `node_annotations.json`, а **node-state contract**, который backend собирает и отдает UI в готовом виде.

То есть UI не должен сам выводить смысл из `std.svg`.  
UI должен получать уже подготовленную модель node-state.

### 8.1 Целевой ответ backend для UI

Примерно так:

```json
{
  "node_id": "ac00202",
  "source_hash": "...",
  "groups": [
    {
      "group_key": "...",
      "key_strs": ["..."],
      "detected_role": "construction_line",
      "override_role": "break_line",
      "final_role": "break_line",
      "count": 12
    }
  ],
  "elements": [
    {
      "elem_key": "...",
      "path_d_prefix": "M 148.54 ...",
      "detected_role": "stitch_edge",
      "override_role": null,
      "final_role": "stitch_edge"
    }
  ]
}
```

Смысл такой:

- backend знает исходные сущности;
- backend знает сохраненные annotations;
- backend сам считает `final_role`;
- UI выступает редактором уже собранной модели.

### 8.2 Формат persisted файла

Хранить `node_annotations.json` лучше не массивами, а словарями по ключу.

Так проще:

- обновлять;
- удалять;
- не плодить дубли;
- проверять наличие записи по `group_key` или `elem_key`.

Предлагаемый формат:

```json
{
  "version": 1,
  "nodes": {
    "ac00202": {
      "source_hash": "...",
      "review_status": "approved",
      "group_overrides": {
        "group_key_1": {
          "role": "break_line",
          "key_strs": ["..."],
          "updated_at": "2026-06-05T12:00:00Z"
        }
      },
      "element_overrides": {
        "elem_key_1": {
          "role": "stitch_edge",
          "path_d_prefix": "M 148.54 ...",
          "updated_at": "2026-06-05T12:00:00Z"
        }
      }
    }
  }
}
```

Это и должно стать главным persisted-слоем.

---

## 9. Что тогда будет делать UI

При открытии узла UI должен:

1. запросить node-state у backend;
2. получить уже готовые `groups` и `elements`;
3. получить `review_status`;
4. показать пользователю `detected_role`, `override_role`, `final_role`;
5. показать статус узла: `pending | complex | approved`;
6. редактировать только override-слой и review-статус;
7. после сохранения писать обратно именно в node-level annotations.

То есть UI не должен угадывать назначение обратно из `standard.svg`.

`standard.svg` нужен только как визуальный результат.

---

## 10. Как считать стабильные ключи

### 10.1 Для группы

`group_key` нельзя строить только из `style key`.

Стиль — это признак, а не сущность.

Один и тот же стиль даже внутри одного узла может относиться к разным конструктивным группам.

Поэтому `group_key` должен быть результатом группировки original-сущностей.

Рабочая формула:

```text
group_key = node_id + group_signature
```

Где `group_signature` может учитывать:

- `style_key`;
- `role_candidate`;
- `bbox bucket`;
- `orientation`;
- `size class`;
- `closed/open`;
- `element_count`.

### 10.2 Для элемента

`elem_key` должен быть стабильнее, чем `path_d_prefix`.

Рабочая цель:

```text
elem_key = hash(normalized original path geometry + bbox + style_key + local index fallback)
```

`path_d_prefix` оставляем только как:

- fallback;
- debug-поле;
- мост для миграции старых override.

### 10.3 Версионирование identity и extraction

Кроме `source_hash`, backend должен явно возвращать:

- `identity_version`
- `extraction_version`

Зачем это нужно:

- `extraction_version` меняется, если меняется алгоритм извлечения сущностей из `original`;
- `identity_version` меняется, если меняется формула расчета `group_key` или `elem_key`.

Если `identity_version` не совпадает с тем, под чем были созданы annotations:

- annotations не должны считаться надежно совпавшими автоматически;
- backend должен применять только fallback matching;
- `match_status` должен отражать это как минимум через:
  - `fallback_matched`
  - или `unmatched`.

---

## 11. Какой должен быть порядок применения слоев

Контракт должен быть таким:

```text
original paths
  -> extract entities
  -> geometry-changing post-processing, если он нужен до финальной сущности
  -> stabilize identity: group_key / elem_key
  -> base classification
  -> global style_registry
  -> node_annotations.group_overrides
  -> node_annotations.element_overrides
  -> render std.svg
```

После формирования `group_key` / `elem_key` запрещены операции, которые меняют состав сущностей, порядок сущностей или их ключи.

---

## 12. Какой API нужен сначала

На старте не обязательно плодить много endpoint'ов.

Минимальный надежный цикл такой:

- `GET /api/node-state/<node_id>`
- `PUT /api/node-annotations/<node_id>`
- `POST /api/regenerate-node/<node_id>`

`review_status` лучше считать частью `node_annotations`, а не отдельным боковым состоянием вне node-state.

Почему так лучше:

- меньше мест, где frontend и backend могут разойтись;
- сначала появляется единый state cycle;
- потом уже можно добавлять точечные `PATCH`/`DELETE`.

Позже можно добавить:

- `PATCH /api/node-annotations/<node_id>/groups/<group_key>`
- `PATCH /api/node-annotations/<node_id>/elements/<elem_key>`
- `DELETE ...`

---

## 13. Как мигрировать текущие файлы

Сейчас уже есть:

- `style_registry.json`
- `node_style_overrides.json`
- `elem_overrides.json`

Их не надо удалять сразу.

Правильный режим перехода:

- `style_registry.json` оставить как глобальный слой;
- `node_style_overrides.json` мигрировать в `node_annotations.group_overrides`;
- `elem_overrides.json` мигрировать в `node_annotations.element_overrides`.

На переходном этапе можно делать так:

```text
read old files
  -> convert in memory
  -> build node-state
  -> write node_annotations.json
```

То есть:

- сначала обеспечиваем совместимость;
- только потом объявляем старые override-файлы deprecated.

---

## 14. Зачем нужен source_hash

Нужен `source_hash`, чтобы не применять старые annotations вслепую к новой геометрии.

Сценарий риска:

- исходный AI или `orig.svg` изменился;
- annotations остались от старой версии;
- UI молча применяет их как будто все совпадает.

Нормальное поведение должно быть таким:

- backend считает `source_hash` для current original;
- в node annotations хранится `source_hash`, с которым они были созданы;
- если hash не совпадает, UI получает предупреждение;
- backend и UI применяют только то, что можно надежно сопоставить.

---

## 15. Что мы меняем по факту

Не все сразу.

### Этап 1

Описываем и вводим единый persisted файл:

- `node_annotations.json`

### Этап 2

Backend получает минимальный state API:

- `GET /api/node-state/<node_id>`
- `PUT /api/node-annotations/<node_id>`
- `POST /api/regenerate-node/<node_id>`

### Этап 3

Frontend читает готовый node-state от backend, а не пытается восстановить state из `standard.svg`.

### Этап 4

`engine.py` применяет:

1. базовую классификацию;
2. глобальный `style_registry.json`;
3. node-level overrides;
4. element-level overrides.

### Этап 5

Добавляем `source_hash` и проверку совместимости annotations с current original.

---

## 16. Что можно считать успехом

Архитектура считается рабочей, когда проходит такой сценарий:

1. открыть узел;
2. сменить роль группы;
3. сменить роль элемента;
4. сохранить;
5. пересобрать;
6. обновить страницу;
7. увидеть те же назначения.

И отдельно:

- изменение в одном узле не ломает другой узел;
- можно удалить `std.svg`, пересобрать его заново и не потерять ручные назначения.

---

## 17. Самый важный вывод

Сейчас проблема не в одной кнопке и не в одном endpoint.

Проблема в том, что:

- редактирование идет на уровне сущностей;
- а восстановление состояния после reload идет через производный `standard.svg`.

Это и делает систему хрупкой.

Нормальная архитектура должна перевести source of truth в:

- явный node-level persisted JSON;
- backend-собранный node-state contract;
- и только потом в render output.

---

## 18. Технический план внедрения

Ниже не общая идея, а практический порядок работ.

### 18.1 Что считаем новой нормой

После миграции должно быть так:

- UI читает состояние узла только из `GET /api/node-state/<node_id>`;
- UI сохраняет ручные правки только в `PUT /api/node-annotations/<node_id>`;
- `engine.py` применяет node-level overrides только из `node_annotations.json`;
- `std.svg` больше не участвует в восстановлении edit-state.

Важно: это не означает отказ от `style_registry.json`.

Правильная иерархия слоев такая:

```text
base classification
  -> global style_registry
  -> node_annotations.group_overrides
  -> node_annotations.element_overrides
  -> render std.svg
```

То есть:

- `style_registry.json` остается глобальным классификационным слоем;
- `node_annotations` становится единственным node-level persisted state;
- `node_style_overrides.json` и `elem_overrides.json` становятся только legacy bridge.

### 18.2 Что оставляем как legacy bridge

На переходном этапе оставляем:

- `style_registry.json` — как глобальный слой классификации;
- `node_style_overrides.json` — только как источник миграции старых group overrides;
- `elem_overrides.json` — только как источник миграции старых element overrides;
- `approved_nodes.json` — только как legacy-источник review status.

Но новая логика не должна зависеть от этих файлов как от основного source of truth.

### 18.3 Изменения в backend (`api_server.py`)

Сделать backend единственным местом сборки node-state.

Это первый реальный этап внедрения. Пока backend не отдает одну законченную модель состояния узла, фронт стабилизировать рано.

#### Шаг A

Довести `GET /api/node-state/<node_id>` до статуса основного контракта:

- всегда возвращать `node_id`;
- всегда возвращать `source_hash`;
- всегда возвращать `review_status`;
- всегда возвращать `groups[]`;
- всегда возвращать `elements[]`.

Кроме того, `node-state` должен возвращать для групп и элементов:

- `detected_role`;
- `override_role`;
- `final_role`;
- `match_status`;
- `warnings[]`, если annotations не удалось надежно сопоставить.

Минимальные значения `match_status`:

- `matched`
- `fallback_matched`
- `unmatched`
- `source_hash_mismatch`

#### Шаг B

Довести `PUT /api/node-annotations/<node_id>` до статуса единого сохранения:

- принимать весь override-state узла;
- перезаписывать `group_overrides`;
- перезаписывать `element_overrides`;
- при необходимости обновлять `review_status`;
- обновлять `source_hash`.
- записывать `updated_at`.

После `PUT` backend должен сразу уметь вернуть обновленное состояние без reload сервера.

Важно:

**`PUT` имеет replace-семантику.**

Это означает:

- отсутствующая запись считается удаленной;
- backend не должен молча сохранять старые overrides, которых уже нет в payload.

Также важно:

- backend сам вычисляет `source_hash`;
- backend сам вычисляет `identity_version`;
- backend сам вычисляет `extraction_version`.

UI может передавать эти значения только как optimistic check, но не как авторитетные значения.

Также запись должна быть атомарной:

```text
write temp file
  -> fsync
  -> rename
```

Нельзя оставлять частично записанный `node_annotations.json`.

#### Шаг C

Оставить legacy endpoints только как bridge:

- `save-registry`
- `elem-override`
- `node-status`

Они могут временно:

- писать в старые файлы;
- зеркалить данные в `node_annotations.json`.

Но UI должен постепенно перестать на них опираться.

Новая запись manual state должна идти только в `node_annotations.json`.

### 18.4 Изменения в engine (`engine.py`)

Сделать `node_annotations.json` единственным node-level override-слоем.

#### Шаг A

Сначала стабилизировать идентичность сущностей:

- группировка от `original`;
- формирование `group_key`;
- формирование `elem_key`.

#### Шаг B

После стабилизации identity pipeline должен быть таким:

```text
original paths
  -> extract entities
  -> geometry-changing post-processing, если он нужен до финальной сущности
  -> stabilize identity: group_key / elem_key
  -> base classification
  -> global style_registry
  -> node_annotations.group_overrides
  -> node_annotations.element_overrides
  -> render std.svg
```

Иерархия силы должна быть жестко зафиксирована:

- `element override` сильнее `group override`;
- `group override` сильнее `style_registry`;
- `style_registry` сильнее `base classification`.

#### Шаг C

Убрать зависимость применения overrides от `std.svg` и его текущего порядка path.

Ключевое правило:

**post-processing не должен менять identity сущностей после применения manual overrides.**

Более жесткая формулировка:

**после формирования `group_key` / `elem_key` запрещены операции, которые меняют состав сущностей, порядок сущностей или их ключи.**

Если post-processing объединяет или разделяет пути, он должен выполняться до стабилизации identity.

### 18.5 Изменения во frontend (`VseReview.jsx`)

UI должен быть редактором backend-модели, а не реконструктором состояния.

#### Шаг A

При открытии узла:

- запрашивать только `GET /api/node-state/<node_id>`;
- строить правую таблицу из `groups[]`;
- строить точечные overrides из `elements[]`.

#### Шаг B

При изменении роли:

- обновлять только локальный draft-state;
- не пытаться выводить состояние обратно из `std.svg`.

#### Шаг C

При сохранении:

- отправлять `PUT /api/node-annotations/<node_id>`;
- затем вызывать `POST /api/regenerate-node/<node_id>`;
- затем перечитывать `GET /api/node-state/<node_id>`.

То есть цикл должен быть строго таким:

```text
edit draft
  -> save annotations
  -> regenerate node
  -> reload node-state
```

#### Шаг D

UI должен уметь не только назначать роль, но и снимать ручное назначение.

Правило:

- `override_role = null` означает удалить ручной override;
- после этого используется автоматически рассчитанная роль:
  - `detected_role`
  - с учетом `style_registry`, если он ее меняет.

### 18.6 Порядок внедрения

Чтобы не ломать все сразу, идти так:

1. backend node-state contract сделать полным и стабильным;
2. `node_annotations.json` сделать главным persisted слоем;
3. engine перевести на применение `node_annotations`;
4. проверить backend + engine без UI;
5. frontend перевести на чтение только из `node-state`;
6. frontend перевести на сохранение только в `node_annotations`;
7. legacy файлы оставить только как миграционный bridge;
8. после успешного сценария reload объявить legacy overrides deprecated.

### 18.7 Контрольный тест после внедрения

Нельзя считать миграцию завершенной без одного сквозного теста.

Нужен такой сценарий:

1. открыть `node_id`;
2. изменить роль группы;
3. изменить роль одного элемента;
4. сохранить;
5. проверить `node_annotations.json`;
6. пересобрать узел;
7. обновить страницу;
8. проверить `GET /api/node-state/<node_id>`;
9. удалить `std.svg`;
10. пересобрать узел;
11. снова проверить UI и `node-state`.

Если этот сценарий проходит, можно считать базовый save/reload contract рабочим.

Если нет, надо фиксировать точку разрыва:

- не записалось в `node_annotations`;
- записалось, но не попало в `node-state`;
- попало в `node-state`, но не применилось в `engine`;
- применилось в `engine`, но не восстановилось в UI;
- после удаления `std.svg` состояние потерялось.

---

## 19. Жесткий критерий для этапа 1

Этап 1 считается выполненным только если проходит такой минимальный backend-контракт:

1. `PUT /api/node-annotations/<node_id>`
2. затем `GET /api/node-state/<node_id>`
3. и в ответе видны те же:
   - `override_role`
   - `final_role`

Если это не проходит, фронт трогать рано.

Именно backend должен первым доказать, что:

- annotations записались;
- node-state их увидел;
- node-state вернул их в стабильной модели.

---

## 20. JSON Schema node_annotations

Ниже не формальный JSON Schema draft, а обязательный контракт полей.

### 20.1 Корневой объект

Обязательные поля:

- `version`
- `nodes`

### 20.2 Узел `nodes[node_id]`

Обязательные поля:

- `source_hash`
- `identity_version`
- `extraction_version`
- `review_status`
- `group_overrides`
- `element_overrides`

### 20.3 Разрешенные значения `review_status`

Только:

- `pending`
- `complex`
- `approved`

### 20.4 Формат `group_overrides`

Это объект-словарь:

- ключ = `group_key`
- значение = объект override

Обязательные поля значения:

- `role`
- `key_strs`
- `updated_at`

Допустимо хранить дополнительно:

- `from_role`
- `notes`

### 20.5 Формат `element_overrides`

Это объект-словарь:

- ключ = `elem_key`
- значение = объект override

Обязательные поля значения:

- `role`
- `path_d_prefix`
- `updated_at`

Допустимо хранить дополнительно:

- `from_role`
- `notes`

### 20.6 Разрешенные значения `role`

На практике это должен быть whitelist ролей из системы.

`role` должен быть одним из поддерживаемых ролей системы.

Практически это означает:

- одним из ключей, поддерживаемых `ROLE_STYLES` / `visual_standard.py`;
- дополнительно допускается `unknown`.

Важно:

- для удаления override используется `override_role = null`;
- не `role = null` внутри persisted override.

---

## 21. Как считать source_hash

`source_hash` считается:

- от normalized original geometry;
- плюс `extraction_version`.

Важно:

- `source_hash` не считается от `std.svg`;
- `source_hash` не зависит от render output;
- если меняется алгоритм извлечения сущностей, должен меняться `extraction_version`.

Иначе возможна ложная ситуация:

- ключи уже считаются по-новому;
- а `source_hash` формально выглядит прежним.

Разделение ответственности такое:

- `source_hash` проверяет совместимость текущей `original`-геометрии;
- `identity_version` проверяет совместимость формулы `group_key` / `elem_key`;
- `extraction_version` проверяет совместимость алгоритма извлечения сущностей.
