# VSE Role Review Table

Дата: июнь 2026

Это рабочая сводка по фактическому использованию ролей и решению по чистке. После решения от июня 2026 неиспользуемые и редкие роли выведены из активного набора.

Полная машинная таблица:

- `tools/vse/role_usage_current.json`
- `tools/vse/role_usage_current.csv`
- `tools/vse/role_review_table.csv`

## Короткий итог

- Было объявлено ролей: 74
- Осталось активных ролей: 37
- Удалено неиспользуемых ролей: 23
- Редкие роли заменяются на `unknown`: 14
- Необъявленные роли встречаются в данных: 17
- Проверено `std.svg`: 4123

Вывод: старый список был слишком широким. Активный набор сокращен, а редкие роли больше не должны возвращаться как финальная роль после node-state/regenerate.

## Корзины

### 1. Оставлено

`keep_active`

Роли, которые остаются в `ROLE_STYLES`, `role_catalog` и UI.

Примеры:

- `contour_outer`
- `stitch_edge`
- `stitch_thru`
- `callout_line`
- `break_line`
- `hw_zipper_tape`
- `fill_elastic`
- `fill_interlining`

### 2. Редкие заменяются на unknown

`replace_with_unknown`

Роли встречались редко. По текущему решению они удалены из активного списка и нормализуются в `unknown`.

Редкие роли:

- `_skip`
- `boundary_lining`
- `boundary_zone`
- `dim_line`
- `fill_binding`
- `hw_buckle`
- `hw_buckle_fill`
- `hw_button`
- `hw_buttonhole`
- `hw_other`
- `hw_zipper_tape_edge`
- `line_decorative`
- `line_mesh`
- `line_velcro`

### 3. Удалены как неиспользуемые

`removed_unused`

Роли объявлялись, но не были найдены в registry, annotations и `std.svg`. Они удалены из активного набора.

Неиспользуемые роли:

- `construction_aux`
- `contour_cut`
- `contour_fold`
- `fill_fur`
- `fill_gradient`
- `fill_pink_dark`
- `fill_pink_light`
- `fill_shadow`
- `guide_line`
- `hw_snap`
- `line_photo_trace`
- `line_reference`
- `seam_allowance`
- `stitch_C`
- `stitch_F`
- `stitch_L`
- `stitch_O`
- `stitch_cover`
- `stitch_double`
- `stitch_hidden`
- `stitch_overlock`
- `stitch_topstitch`
- `stitch_zigzag`

### 4. Нормализовать или добавить явно

`normalize_or_add`

Эти значения встречаются в данных, но не являются объявленными ролями `ROLE_STYLES`. Часть из них похожа на старые русские названия, которые надо мапить на нормальные role-id.

Необъявленные значения:

- `Decorative fabric`
- `Mesh`
- `Reflectig piping`
- `contour_glue`
- `contour_mesh`
- `contour_pu_tape`
- `fill_mesh`
- `Выноски с увеличением`
- `Мех`
- `Размерная линия`
- `Резинка`
- `Соединяющая стрелка`
- `Строчка по краю`
- `выносная линия`
- `линия на фото?`
- `непонятно`
- `ремень-стяжка?`

## Как этим пользоваться

Основной UI показывает в селекте только:

- активные роли;
- `unknown`;
- без редких и архивных ролей.

Старые сохранения не должны ломаться: удаленные роли нормализуются в `unknown`.

Примененное изменение:

```text
ROLE_STYLES сокращен до активных ролей.
role_catalog сокращен до активных ролей.
UI selector показывает только активные роли.
style_registry / annotations / legacy overrides заменяют удаленные роли на unknown.
engine / api_server нормализуют удаленные роли в unknown.
```
