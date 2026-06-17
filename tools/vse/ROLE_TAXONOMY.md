# VSE Role Taxonomy

Дата: июнь 2026

Этот документ описывает новый смысловой слой ролей VSE. Он не заменяет текущие `ROLE_STYLES`, `style_registry.json` и `node_annotations.json`. На первом этапе это только безопасный каталог поверх старых ролей.

## 1. Зачем это нужно

Сейчас legacy-роль одновременно отвечает за несколько вещей:

- что нарисовано;
- что это значит;
- как это рендерить;
- как показывать в UI;
- как сохранять override.

Из-за этого `hw_zipper`, `fill_elastic`, `callout_line`, `contour_outer`, `stitch_edge` лежат в одном плоском списке, хотя они описывают разные уровни.

Новая модель разделяет эти уровни.

## 2. Уровни

### Entity Type

Что это геометрически:

- `stroke` - линия или обводка;
- `fill` - заливка;
- `symbol` - условный знак;
- `text` - текст;
- `composite` - составной объект;
- `annotation` - выноска, размер, zoom-связь;
- `technical` - служебная сущность.

### Family

Крупная смысловая группа:

- `contour`;
- `break`;
- `stitch` - строчки / швы;
- `material`;
- `hardware`;
- `annotation`;
- `construction`;
- `unknown`.

### Object Role

Какому объекту относится сущность:

- `hardware.zipper`;
- `fastener.velcro`;
- `fastener.snap_button`;
- `hardware.buckle`;
- `hardware.loop`;
- `component.half_belt`;
- `material.sweat_band`;
- `material.elastic_band`.

### Part Role

Какая часть объекта:

- `hardware.zipper.teeth`;
- `hardware.zipper.tape`;
- `hardware.zipper.slider`;
- `fastener.velcro.hook_tape`;
- `fastener.velcro.loop_tape`;
- `fastener.snap_button.upper_part`;
- `fastener.snap_button.bottom_part`.
- `hardware.loop.body`;
- `component.half_belt.body`;
- `material.sweat_band.body`.

## 3. Принцип совместимости

Legacy-роли остаются источником текущего поведения:

```text
legacy_role -> role_catalog semantic fields
```

Пример:

```json
{
  "legacy_role": "hw_zipper",
  "role_id": "hardware.zipper.teeth",
  "object_role": "hardware.zipper",
  "part_role": "hardware.zipper.teeth",
  "entity_type": "symbol"
}
```

Ни один текущий override не должен мигрировать автоматически, пока каталог не пройдет ручную проверку.

## 4. Составные объекты

### Молния

Молния не является одной плоской ролью.

```text
hardware.zipper
  hardware.zipper.slider      замок / бегунок
  hardware.zipper.teeth       зубцы
  hardware.zipper.tape        тесьма
  hardware.zipper.tape_edge   край тесьмы
  hardware.zipper.stop        ограничитель
  hardware.zipper.pull        пуллер
```

Текущие legacy-роли:

```text
hw_zipper           -> hardware.zipper.teeth
hw_zipper_tape      -> hardware.zipper.tape
hw_zipper_tape_edge -> hardware.zipper.tape_edge
```

### Липучка

```text
fastener.velcro
  fastener.velcro.hook_tape
  fastener.velcro.loop_tape
  fastener.velcro.outline
```

Подписи `Velcro /hook/` и `Velcro /loop/` должны использоваться как источник уточнения `part_role` и активной роли:

- `Velcro /hook/` -> `fill_velcro_hook`;
- `Velcro /loop/` -> `fill_velcro_loop`;
- просто `Velcro` без уточнения -> `fill_velcro`.

### Кнопка-застежка

```text
fastener.snap_button
  fastener.snap_button.upper_part
  fastener.snap_button.bottom_part
  fastener.snap_button.ring
  fastener.snap_button.center
```

Подписи `Snap-button /upper part/` и `Snap-button /bottom part/` должны уточнять часть кнопки.

### Резинка

```text
material.elastic_band
  material.elastic_band.fill
  material.elastic_band.outline
```

Резинка может иметь заливку и обводку. Это не две независимые роли, а две части одного объекта.

Строчка или линия шва рядом с резинкой, молнией или липучкой не является частью объекта. Это отдельная сущность из family `stitch`, которая может иметь связь с объектом: пришивает, проходит по нему или обозначает технологическую операцию.

## 5. Выноски

Выноска не является объектом, который она подписывает.

Правильная модель:

```text
annotation.label
-> annotation.callout.line
-> target entity
-> target object_role / part_role
```

Пример:

```text
label "Velcro /hook/"
-> callout line
-> target shape
-> fastener.velcro.hook_tape
```

## 6. Первый этап внедрения

Сейчас добавлен только каталог:

```text
tools/vse/role_catalog.json
```

На первом этапе можно:

- читать каталог в UI;
- показывать рядом с legacy-ролью `object_role` и `part_role`;
- использовать каталог в Contract Monitor;
- делать audit отсутствующих legacy-ролей.

Нельзя пока:

- менять persisted role ids;
- автоматически мигрировать `node_annotations.json`;
- удалять старые роли из `ROLE_STYLES`;
- переписывать `style_registry.json` по новой taxonomy.

## 7. Следующий безопасный шаг

Добавить read-only endpoint:

```text
GET /api/role-catalog
```

И в UI показывать дополнительную диагностику:

```text
legacy_role
role_id
object_role
part_role
entity_type
family
```

Это позволит проверять новую структуру на живых узлах без риска потерять текущие сохранения.

## 8. Рабочая таблица текущих составных объектов

Эта таблица описывает только то, что уже есть в текущих legacy-ролях. Она не вводит новые роли и не меняет сохранение.

| Объект | Часть / слой | Текущая legacy-роль | Entity type | Что означает сейчас | Комментарий |
|---|---|---|---|---|---|
| Молния | зубцы | `hw_zipper` | `symbol` | зубцы / гребенка молнии | Не вся молния целиком. |
| Молния | тесьма | `hw_zipper_tape` | `stroke` | тесьма, на которой крепятся зубцы | Может идти рядом со строчкой, но строчка отдельно. |
| Молния | край тесьмы | удалено → `unknown` | `stroke` | край тесьмы молнии | Раньше было `hw_zipper_tape_edge`, удалено как редкое. |
| Молния | замок / бегунок | пока нет отдельной роли | `symbol` / `composite` | бегунок молнии | Раньше мог попадать в `hw_other`; теперь это `unknown`, пока не введена новая роль. |
| Липучка | поверхность без уточнения | `fill_velcro` | `component` | площадка липучки | Fallback, если нет `hook` / `loop`. Заливка/обводка — параметры слоя. |
| Липучка | контур | удалено → `unknown` | `stroke` | обводка липучки | Раньше было `line_velcro`, удалено как редкое. |
| Липучка | hook tape | `fill_velcro_hook` | `component` | часть `Velcro /hook/` | Крючковая часть текстильной застежки. Заливка/обводка — параметры слоя. |
| Липучка | loop tape | `fill_velcro_loop` | `component` | часть `Velcro /loop/` | Петельная часть текстильной застежки. Не путать с обычной петлей/рамкой `Loop`. |
| Полупояс | тело детали | `component_half_belt` | `component` | `Half-belt` | Полупояс / регулировочный хлястик. |
| Внутренняя поясная лента | тело детали | `material_sweat_band` | `component` | `Sweat band` | Не резинка, если в подписи нет `Elastic`. |
| Петля / рамка | тело фурнитуры | `hw_loop` | `component` | `Loop` | Жесткая петля/рамка, не `Velcro /loop/`. |
| Кнопка-застежка | верхняя часть | удалено → `unknown` | `symbol` | `Snap-button /upper part/` | Раньше было `hw_snap`; роль удалена как неиспользуемая. |
| Кнопка-застежка | нижняя часть | удалено → `unknown` | `symbol` | `Snap-button /bottom part/` | Раньше было `hw_snap`; роль удалена как неиспользуемая. |
| Пуговица | тело | удалено → `unknown` | `symbol` | пуговица | Раньше было `hw_button`, удалено как редкое. |
| Петля | тело | удалено → `unknown` | `symbol` | петля под пуговицу | Раньше было `hw_buttonhole`, удалено как редкое. |
| Пряжка | рамка | удалено → `unknown` | `composite` | контур / форма пряжки | Раньше было `hw_buckle`, удалено как редкое. |
| Пряжка | заливка | удалено → `unknown` | `fill` | заливка пряжки | Раньше было `hw_buckle_fill`, удалено как редкое. |
| Кольцо | тело | `hw_ring` | `symbol` / `stroke` | кольцо / ring | Толстая обводка. |
| Резинка | заливка | `fill_elastic` | `fill` | тело резинки | Должна показываться как заливка. |
| Резинка | обводка | `line_elastic` | `stroke` | обводка / край резинки | Не контур детали. |
| Шнур | тело | `fill_cord` | `fill` / `stroke` | шнур / cord | Может потребовать уточнения на тело и наконечник. |
| Строчка | строчка по краю | `stitch_edge` | `stroke` | сплошная строчка | Отдельная сущность, не часть материала или фурнитуры. |
| Строчка | сквозная строчка | `stitch_thru` | `stroke` | пунктирная сквозная строчка | Отдельная сущность, не часть материала или фурнитуры. |
| Выноска | линия | `callout_line` | `annotation` | линия выноски | Не является объектом, который подписывает. |
| Выноска | zoom | `callout_zoom` | `annotation` | окружность / связь увеличения | Не является объектом, который подписывает. |

## 9. Полная таблица активных ролей

Это текущая рабочая раскладка оставшихся активных ролей после чистки списка. Здесь `legacy_role` остается техническим id для сохранения и рендера, а остальные колонки описывают смысл.

Колонка `уровень`:

- `самостоятельная сущность` - роль сама описывает объект или линию;
- `часть объекта` - роль описывает слой/часть составного объекта;
- `аннотация` - подпись, выноска, стрелка, zoom;
- `техническая` - служебная роль для маски, неизвестного или внутреннего состояния.

| legacy_role | Название | Уровень | Entity type | Family | Object role | Part role | Как понимать |
|---|---|---|---|---|---|---|---|
| `contour_outer` | Контур детали | самостоятельная сущность | `stroke` | `contour` | — | — | Основной контур детали. Не путать с обводкой резинки, липучки или фурнитуры. |
| `contour_hidden` | Скрытый контур | самостоятельная сущность | `stroke` | `contour` | — | — | Невидимый / вспомогательный контур, который все еще относится к форме детали. |
| `construction_line` | Конструктивная линия | самостоятельная сущность | `stroke` | `construction` | — | — | Линия построения или внутренняя конструктивная геометрия. |
| `break_line` | Линия обрыва | самостоятельная сущность | `stroke` | `break` | — | — | Линия разрыва вида. Должна быть тоньше контура детали. |
| `seam_line` | Линия шва | самостоятельная сущность | `stroke` | `stitch` | — | — | Шов как линия соединения. В UI выбирается в общей группе строчек и швов. |
| `stitch_edge` | Строчка по краю | самостоятельная сущность | `stroke` | `stitch` | — | — | Сплошная строчка. Не является частью резинки, молнии или ткани. |
| `stitch_thru` | Сквозная строчка | самостоятельная сущность | `stroke` | `stitch` | — | — | Пунктирная сквозная строчка. Не является частью объекта, по которому проходит. |
| `stitch_Bt` | Закрепка | самостоятельная сущность | `symbol` | `stitch` | — | — | Bar tack / закрепка как условный знак строчки. |
| `stitch_symbol` | Символ строчки | самостоятельная сущность | `symbol` | `stitch` | — | — | Текстовый или графический символ типа `vvvv`, связанный со строчкой. |
| `boundary_fragment` | Граница прокладки | часть объекта | `stroke` | `material` | `material.padding` | `material.padding.boundary` | Контур/граница прокладки, не контур детали. |
| `boundary_interlining` | Граница флизелина | часть объекта | `stroke` | `material` | `material.interlining` | `material.interlining.boundary` | Граница флизелина или внутреннего клеевого слоя. |
| `fill_interlining` | Флизелин | часть объекта | `fill` | `material` | `material.interlining` | `material.interlining.fill` | Заливка флизелина. |
| `fill_fabric` | Ткань | часть объекта | `fill` | `material` | `material.fabric` | `material.fabric.fill` | Обычная заливка ткани. |
| `fill_fabric_gray` | Серая ткань | часть объекта | `fill` | `material` | `material.fabric` | `material.fabric.fill` | Серая/нейтральная заливка ткани. |
| `fill_dark_fabric` | Темная ткань | часть объекта | `fill` | `material` | `material.fabric` | `material.fabric.fill` | Темная заливка ткани или детали. |
| `fill_contrast` | Контрастная деталь | часть объекта | `fill` | `material` | `material.contrast` | `material.contrast.fill` | Контрастная вставка или материал. |
| `fill_tape` | Тесьма / лента | часть объекта | `fill` | `material` | `material.tape` | `material.tape.fill` | Лента или тесьма как материал, не обязательно молния. |
| `fill_elastic` | Резинка: заливка | часть объекта | `fill` | `material` | `material.elastic_band` | `material.elastic_band.fill` | Тело резинки. |
| `line_elastic` | Резинка: обводка | часть объекта | `stroke` | `material` | `material.elastic_band` | `material.elastic_band.outline` | Обводка резинки. Не контур детали. |
| `fill_cord` | Шнур | часть объекта | `composite` | `material` | `material.cord` | `material.cord.body` | Шнур как составной материал/форма. |
| `fill_velcro` | Липучка: не уточнено | часть объекта | `component` | `hardware` | `fastener.velcro` | `fastener.velcro.unknown_tape` | Fallback для площадки липучки без уточнения hook/loop. |
| `fill_velcro_hook` | Липучка: крючковая часть | часть объекта | `component` | `hardware` | `fastener.velcro` | `fastener.velcro.hook_tape` | Соответствует подписи `Velcro /hook/`. |
| `fill_velcro_loop` | Липучка: петельная часть | часть объекта | `component` | `hardware` | `fastener.velcro` | `fastener.velcro.loop_tape` | Соответствует подписи `Velcro /loop/`. |
| `component_half_belt` | Полупояс / регулировочный хлястик | самостоятельная сущность | `component` | `material` | `component.half_belt` | `component.half_belt.body` | Half-belt. |
| `material_sweat_band` | Внутренняя поясная лента | самостоятельная сущность | `component` | `material` | `material.sweat_band` | `material.sweat_band.body` | Sweat band. |
| `hw_loop` | Петля / рамка | самостоятельная сущность | `component` | `hardware` | `hardware.loop` | `hardware.loop.body` | Loop как жесткая петля/рамка, не Velcro loop. |
| `fill_pu_tape` | PU tape | часть объекта | `fill` | `material` | `material.pu_tape` | `material.pu_tape.fill` | Полиуретановая лента или зона. |
| `fill_piping` | Кант / piping | часть объекта | `fill` | `material` | `material.piping` | `material.piping.fill` | Кант как материал/полоса. |
| `fill_glue` | Клеевая зона | часть объекта | `fill` | `material` | `material.glue` | `material.glue.fill` | Клеевая область. |
| `line_fur` | Мех: линия | часть объекта | `stroke` | `material` | `material.fur` | `material.fur.stroke` | Линия/штрих меха или ворса. |
| `line_gathered_edge` | Мятый / собранный край | часть объекта | `stroke` | `material` | `material.fabric` | `material.fabric.gathered_edge` | Обозначение собранного или мятого края материала. |
| `fill_shape` | Заливка формы | часть объекта | `fill` | `material` | `material.shape` | `material.shape.fill` | Общая заливка формы, когда материал пока не уточнен. |
| `fill_white_detail` | Видимая белая деталь | часть объекта | `fill` | `material` | `material.white_detail` | `material.white_detail.fill` | Белая видимая деталь или маска белой детали. |
| `fill_material_mask` | Маска материала | техническая | `technical` | `material` | — | — | Служебная маска материала. Не пользовательская конструктивная роль. |
| `hw_zipper` | Молния: зубцы | часть объекта | `symbol` | `hardware` | `hardware.zipper` | `hardware.zipper.teeth` | Зубцы/гребенка молнии. Не вся молния целиком. |
| `hw_zipper_tape` | Молния: тесьма | часть объекта | `stroke` | `hardware` | `hardware.zipper` | `hardware.zipper.tape` | Тесьма молнии, на которой крепятся зубцы. |
| `hw_ring` | Кольцо | самостоятельная сущность | `stroke` | `hardware` | `hardware.ring` | `hardware.ring.body` | Кольцо / ring как фурнитура. |
| `callout_line` | Выноска | аннотация | `annotation` | `annotation` | — | — | Линия выноски. Не является объектом, который подписывает. |
| `callout_zoom` | Выноска к увеличению | аннотация | `annotation` | `annotation` | — | — | Окружность или связь увеличения. |
| `arrow` | Стрелка | аннотация | `annotation` | `annotation` | — | — | Стрелка указания. |
| `label` | Текстовая подпись | аннотация | `text` | `annotation` | — | — | Текстовая подпись. Может уточнять объект через callout-связь. |
| `unknown` | Неизвестно | техническая | `technical` | `unknown` | — | — | Неопределенная роль или результат замены удаленных ролей. |

## 10. Как работает выбор роли в UI

В UI пользователь выбирает не всегда конкретный legacy-role, а смысловой выбор.

Пример:

```text
выбор: Резинка
```

Дальше UI смотрит на параметры текущей строки:

```text
строка с заливкой  -> fill_elastic
строка с обводкой -> line_elastic
```

То есть `заливка`, `обводка`, `поверхность`, цвет, толщина и пунктир остаются параметрами строки. Они не должны превращаться в отдельные пользовательские опции выбора там, где это один и тот же объект.

Для реальных частей составного объекта выбор остается отдельным:

```text
Молния: зубцы  -> hw_zipper
Молния: тесьма -> hw_zipper_tape
```

Потому что зубцы и тесьма молнии — это разные смысловые части, а не просто параметры одного слоя.

Технически это описано в `role_catalog.json`:

```text
role_choices[].role      -> сразу сохраняется legacy_role
role_choices[].variants  -> legacy_role выбирается по fill/stroke текущей строки
```
