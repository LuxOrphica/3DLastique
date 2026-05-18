// POM library — Classic Men's Trousers (Samo)
// Source: technical map_trousers samo.xlsx
// Base size: 48 (RU). All values in cm, flat finished garment measurements.

export const GARMENTS = [
  // outerwear
  { id: "coat_single",       labelRU: "Пальто однобортное",           labelEN: "Single-breasted coat",    category: "outerwear" },
  { id: "coat_double",       labelRU: "Пальто двубортное",            labelEN: "Double-breasted coat",    category: "outerwear" },
  { id: "jacket_blazer",     labelRU: "Жакет / блейзер",              labelEN: "Jacket / blazer",         category: "outerwear" },
  // bottoms
  { id: "trousers_classic",  labelRU: "Брюки классические",           labelEN: "Classic trousers",        category: "bottoms"   },
  { id: "trousers_casual",   labelRU: "Брюки casual / chino",         labelEN: "Casual trousers / chino", category: "bottoms"   },
  { id: "skirt",             labelRU: "Юбка",                         labelEN: "Skirt",                   category: "bottoms"   },
  // tops
  { id: "tshirt_polo",       labelRU: "Футболка / поло",              labelEN: "T-shirt / polo",          category: "tops"      },
  { id: "knitwear",          labelRU: "Джемпер / свитер",             labelEN: "Knitwear / jumper",       category: "tops"      },
  { id: "hoodie_sweatshirt", labelRU: "Худи / свитшот",               labelEN: "Hoodie / sweatshirt",     category: "tops"      },
  // swimwear
  { id: "swimsuit",          labelRU: "Купальник слитный",            labelEN: "One-piece swimsuit",      category: "swimwear"  },
  { id: "swim_shorts",       labelRU: "Плавки / шорты купальные",     labelEN: "Swim shorts / trunks",    category: "swimwear"  },
  { id: "swimwear_set",      labelRU: "Раздельный купальник (топ+низ)", labelEN: "Bikini / swimwear set", category: "swimwear"  },
];

export const ALL_SIZES = [44, 46, 48, 50, 52, 54, 56, 58, 60];
export const SIZES_DEFAULT = [46, 48, 50, 52, 54, 56];
export const BASE_SIZE_DEFAULT = 48;
export const COAT_SIZES_DEFAULT = [48, 50, 52, 54, 56, 58];
export const COAT_BASE_SIZE_DEFAULT = 52;

// Values stored as exact table — no linear approximation
// sizes array must match ALL_SIZES order
const TROUSERS_POMS = [
  {
    code: "B",
    nameRU: "Полуобхват талии",
    nameEN: "1/2 Waist",
    method: "Measure across top edge of waistband, garment fastened, straight line.",
    methodRU: "По верхнему краю пояса, в застегнутом виде, по прямой.",
    values:    [42.1, 44.1, 46.1, 48.1, 50.1, 52.1, 54.1, 56.1, 58.1],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "width",
    group: "main",
  },
  {
    code: "C",
    nameRU: "Полуобхват бёдер",
    nameEN: "1/2 Hip",
    method: "Measure at fullest part, parallel to waistband top edge.",
    methodRU: "По линии бёдер, параллельно верхнему краю пояса, на уровне наибольшего обхвата.",
    values:    [54.2, 56.2, 58.2, 60.2, 62.2, 64.2, 66.1, 68.1, 70.1],
    tolPlus:   1.0,
    tolMinus:  1.0,
    type: "width",
    group: "main",
  },
  {
    code: "N",
    nameRU: "Передняя высота сидения с поясом",
    nameEN: "Front rise incl. waistband",
    method: "From top edge of waistband (front) down to crotch seam intersection.",
    methodRU: "От верхнего края пояса спереди до точки пересечения шаговых швов.",
    values:    [28.6, 29.1, 29.7, 30.2, 30.7, 31.2, 31.7, 32.2, 32.7],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "length",
    group: "main",
  },
  {
    code: "N1",
    nameRU: "Задняя высота сидения с поясом",
    nameEN: "Back rise incl. waistband",
    method: "From top edge of waistband (back) down to crotch seam intersection.",
    methodRU: "От верхнего края пояса сзади до точки пересечения шаговых швов.",
    values:    [41.5, 42.6, 43.7, 44.8, 45.9, 47.1, 48.2, 49.3, 50.4],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "length",
    group: "main",
  },
  {
    code: "C1",
    nameRU: "Ширина бедра",
    nameEN: "1/2 Thigh",
    method: "2.5 cm below crotch seam, straight line inseam to outseam.",
    methodRU: "На 2.5 см ниже шагового шва, по прямой от шагового до бокового шва.",
    values:    [32.45, 33.65, 34.85, 36.0, 37.15, 38.35, 39.5, 40.7, 41.85],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "width",
    group: "main",
  },
  {
    code: "C2",
    nameRU: "Ширина колена",
    nameEN: "1/2 Knee width",
    method: "At knee level, straight line from inseam to outseam.",
    methodRU: "На уровне колена, по прямой между боковым и шаговым швом.",
    values:    [23.4, 24.2, 25.0, 25.8, 26.6, 27.4, 28.2, 29.0, 29.8],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "width",
    group: "main",
  },
  {
    code: "D",
    nameRU: "Ширина низа",
    nameEN: "Leg opening",
    method: "At hem, straight line from inseam to outseam.",
    methodRU: "По низу брючины, по прямой.",
    values:    [19.25, 19.75, 20.25, 20.75, 21.25, 21.75, 22.25, 22.75, 23.25],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "width",
    group: "main",
  },
  {
    code: "J",
    nameRU: "Длина по боковому шву с поясом",
    nameEN: "Outseam incl. waistband",
    method: "From top edge of waistband along outseam to hem.",
    methodRU: "От верхнего края пояса по боковому шву до низа.",
    values:    [113.8, 114.8, 115.8, 116.8, 117.8, 118.8, 119.8, 120.8, 121.8],
    tolPlus:   1.0,
    tolMinus:  1.0,
    type: "length",
    group: "main",
  },
  {
    code: "J6",
    nameRU: "Длина по шаговому шву",
    nameEN: "Inseam",
    method: "From crotch seam point to hem along inseam.",
    methodRU: "От точки шага до низа по шаговому шву.",
    values:    [85.8, 86.3, 86.7, 87.3, 87.7, 88.2, 88.7, 89.2, 89.7],
    tolPlus:   1.0,
    tolMinus:  1.0,
    type: "length",
    group: "main",
  },
  {
    code: "B3",
    nameRU: "Высота пояса",
    nameEN: "Waistband height",
    method: "Finished height at centre front.",
    methodRU: "В готовом виде, по центру переда.",
    values:    [4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "main",
  },
  {
    code: "B'",
    nameRU: "Длина пояса по верху",
    nameEN: "Waistband length",
    method: "Total length of waistband along top edge.",
    methodRU: "Общая длина пояса по верхнему срезу.",
    values:    [95.9, 99.9, 103.9, 107.9, 111.9, 115.9, 119.9, 123.9, 127.9],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "length",
    group: "main",
  },
  {
    code: "O",
    nameRU: "Длина гульфика",
    nameEN: "Fly length",
    method: "From top edge of waistband to end of fly topstitch line.",
    methodRU: "От верхнего края пояса до конца отделочной/конструктивной линии гульфика.",
    values:    [16.4, 16.4, 16.3, 16.3, 16.3, 16.3, 16.3, 16.3, 16.3],
    tolPlus:   0.3,
    tolMinus:  0.3,
    type: "length",
    group: "main",
  },
  {
    code: "Bp",
    nameRU: "Длина заднего прорезного кармана",
    nameEN: "Back welt pocket opening",
    method: "Along pocket opening line.",
    methodRU: "По линии входа заднего кармана.",
    values:    [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "detail",
  },
  {
    code: "Bp1",
    nameRU: "Ширина рамки заднего кармана",
    nameEN: "Back welt pocket welt width",
    method: "Finished welt width.",
    methodRU: "Ширина рамки/листочки в готовом виде.",
    values:    [12.8, 13.8, 14.8, 15.8, 16.8, 17.8, 18.8, 19.8, 20.8],
    tolPlus:   0.1,
    tolMinus:  0.1,
    type: "length",
    group: "detail",
  },
  {
    code: "Sp",
    nameRU: "Длина входа в боковой карман",
    nameEN: "Side pocket opening",
    method: "Along pocket opening line.",
    methodRU: "По линии входа в карман.",
    values:    [17.6, 17.6, 17.6, 17.6, 17.7, 17.7, 17.7, 17.7, 17.7],
    tolPlus:   0.3,
    tolMinus:  0.3,
    type: "length",
    group: "detail",
  },
  {
    code: "W10_1",
    nameRU: "Глубина 1-го защипа",
    nameEN: "Pleat depth 1",
    method: "Finished pleat depth at waistline, front.",
    methodRU: "В готовом виде по талии переда.",
    values:    [1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8, 1.8],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "detail",
  },
  {
    code: "W10_2",
    nameRU: "Глубина 2-го защипа",
    nameEN: "Pleat depth 2",
    method: "Finished pleat depth at waistline, front.",
    methodRU: "В готовом виде по талии переда.",
    values:    [1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "detail",
  },
  {
    code: "Q1",
    nameRU: "Расстояние между защипами",
    nameEN: "Pleat spacing",
    method: "Between pleat fold lines at waistline.",
    methodRU: "Между линиями защипов по талии.",
    values:    [4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3, 4.3],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "detail",
  },
  {
    code: "J8",
    nameRU: "Длина подкладки передней половинки",
    nameEN: "Front lining length",
    method: "From top edge of lining piece to bottom of lining.",
    methodRU: "От верхнего среза детали подкладки до низа подкладки.",
    values:    [52.6, 53.1, 53.6, 54.1, 54.6, 55.1, 55.6, 56.1, 56.6],
    tolPlus:   0.5,
    tolMinus:  0.5,
    type: "length",
    group: "detail",
  },
  {
    code: "D1",
    nameRU: "Высота отворота по низу",
    nameEN: "Turn-up cuff height",
    method: "Straight line from hem fold to cuff fold, finished.",
    methodRU: "По прямой от низа брючины до линии отворота, в готовом виде.",
    values:    [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0],
    tolPlus:   0.2,
    tolMinus:  0.2,
    type: "length",
    group: "detail",
  },
];

// Single-breasted coat — base size 52. Values in cm, flat finished measurements.
// Codes and names per technical map_single-breasted coat.xlsx (02_Measurements sheet).
// Numeric values are design targets — template in source file has no graded values.
const COAT_SINGLE_POMS = [
  // ── main measurements ────────────────────────────────────────────────────────
  { code: "A",   nameRU: "Полуобхват груди",               nameEN: "1/2 Chest",                   methodRU: "Горизонтально на уровне проймы, от одного бокового шва до другого.",         method: "Horizontally at armhole level, side seam to side seam.",                 values: [50.0,52.0,54.0,56.0,58.0,60.0,62.0,64.0,66.0], tolPlus: 1.0, tolMinus: 1.0, type: "width",  group: "main" },
  { code: "A2",  nameRU: "Ширина спинки",                  nameEN: "Across back",                  methodRU: "Горизонтально по спинке на уровне A4, от проймы до проймы.",                  method: "Horizontally across back at A4 level, armhole to armhole.",               values: [19.5,20.0,20.5,21.0,21.5,22.0,22.5,23.0,23.5], tolPlus: 0.5, tolMinus: 0.5, type: "width",  group: "main" },
  { code: "A4",  nameRU: "Уровень измерения ширины спинки",nameEN: "Position across back",         methodRU: "От HPS вниз до линии A2.",                                                     method: "From HPS down to the A2 measurement line.",                               values: [17.0,17.0,17.5,17.5,18.0,18.0,18.5,18.5,19.0], tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "main" },
  { code: "E1",  nameRU: "Поперечное измерение плеч",       nameEN: "Across shoulders",             methodRU: "По прямой от одной плечевой точки до другой.",                                 method: "Straight line from shoulder point to shoulder point.",                    values: [45.0,46.0,47.0,48.0,49.0,50.0,51.0,52.0,53.0], tolPlus: 0.5, tolMinus: 0.5, type: "width",  group: "main" },
  { code: "E",   nameRU: "Ширина плеча",                   nameEN: "Shoulder width",               methodRU: "По плечевому шву от горловины до плечевой точки.",                              method: "Along shoulder seam from neck point to shoulder point.",                  values: [14.0,14.5,15.0,15.5,16.0,16.5,17.0,17.5,18.0], tolPlus: 0.3, tolMinus: 0.3, type: "width",  group: "main" },
  { code: "B",   nameRU: "Ширина талии",                   nameEN: "Waist width",                  methodRU: "Горизонтально по линии талии.",                                                 method: "Horizontally at waist line level.",                                       values: [43.0,45.0,47.0,49.0,51.0,53.0,55.0,57.0,59.0], tolPlus: 1.0, tolMinus: 1.0, type: "width",  group: "main" },
  { code: "B5",  nameRU: "Уровень линии талии спереди",    nameEN: "Position of waist line front", methodRU: "От HPS вниз до линии талии.",                                                   method: "From HPS down to waist line.",                                            values: [42.0,42.5,43.0,43.5,44.0,44.5,45.0,45.5,46.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  { code: "C",   nameRU: "Ширина по бёдрам",               nameEN: "Hip width",                    methodRU: "Горизонтально по линии бёдер.",                                                 method: "Horizontally at hip level.",                                              values: [52.0,54.0,56.0,58.0,60.0,62.0,64.0,66.0,68.0], tolPlus: 1.0, tolMinus: 1.0, type: "width",  group: "main" },
  { code: "Ca2", nameRU: "Уровень линии бёдер от HPS",     nameEN: "Hip position from HPS",        methodRU: "От HPS вниз до линии бёдер.",                                                   method: "From HPS down to hip level.",                                             values: [65.0,66.0,67.0,68.0,69.0,70.0,71.0,72.0,73.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  { code: "D",   nameRU: "Ширина низа изделия",            nameEN: "Hem width",                    methodRU: "По низу пальто, 1/2 ширины.",                                                   method: "At hem, 1/2 width, straight line.",                                       values: [51.0,53.0,55.0,57.0,59.0,61.0,63.0,65.0,67.0], tolPlus: 1.0, tolMinus: 1.0, type: "width",  group: "main" },
  { code: "J",   nameRU: "Длина переда от HPS до низа",    nameEN: "Front length from HPS to hem", methodRU: "От HPS до низа изделия по прямой.",                                             method: "From HPS straight down to hem.",                                          values: [73.0,74.0,75.0,76.0,77.0,78.0,79.0,80.0,81.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  { code: "J1",  nameRU: "Длина спинки от HPS до низа",    nameEN: "Back length from HPS to hem",  methodRU: "От HPS по спинке до низа изделия.",                                             method: "From HPS down back to hem.",                                              values: [74.0,75.0,76.0,77.0,78.0,79.0,80.0,81.0,82.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  { code: "J3",  nameRU: "Длина по центру спинки",         nameEN: "Centre back length",           methodRU: "От горловины спинки по центру до низа.",                                        method: "From back neck seam down centre back to hem.",                            values: [68.0,69.0,70.0,71.0,72.0,73.0,74.0,75.0,76.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  { code: "J5",  nameRU: "Длина бокового шва ниже проймы", nameEN: "Side seam below armhole",      methodRU: "Вдоль бокового шва от нижней точки проймы до низа.",                            method: "Along side seam from underarm point to hem.",                             values: [55.0,56.0,57.0,58.0,59.0,60.0,61.0,62.0,63.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "main" },
  // ── detail measurements ───────────────────────────────────────────────────────
  { code: "F3",  nameRU: "Высота проймы",                  nameEN: "Armhole height",               methodRU: "От HPS вниз до уровня нижнего шва рукава.",                                     method: "From HPS down to underarm seam level.",                                   values: [24.5,25.0,25.5,26.0,26.5,27.0,27.5,28.0,28.5], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "detail" },
  { code: "G",   nameRU: "Длина рукава (втачной)",         nameEN: "Sleeve length set-in",         methodRU: "От плечевой точки до низа рукава.",                                             method: "From shoulder point to sleeve hem.",                                      values: [62.0,62.5,63.0,63.5,64.0,64.5,65.0,65.5,66.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "detail" },
  { code: "F7",  nameRU: "Ширина рукава",                  nameEN: "Sleeve width",                 methodRU: "Поперек рукава, 1/2 ширины.",                                                   method: "Across sleeve, 1/2 width.",                                               values: [18.5,19.0,19.5,20.0,20.5,21.0,21.5,22.0,22.5], tolPlus: 0.5, tolMinus: 0.5, type: "width",  group: "detail" },
  { code: "H",   nameRU: "Ширина рукава по низу",          nameEN: "Sleeve opening",               methodRU: "По низу рукава, 1/2 ширины.",                                                   method: "At sleeve hem, 1/2 width.",                                               values: [13.5,13.8,14.0,14.3,14.5,14.8,15.0,15.3,15.5], tolPlus: 0.3, tolMinus: 0.3, type: "width",  group: "detail" },
  { code: "L",   nameRU: "Высота воротника сзади",         nameEN: "Centre back collar height",    methodRU: "По центру спинки от шва до края воротника.",                                    method: "At centre back from collar seam to collar edge.",                         values: [3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5,3.5],          tolPlus: 0.2, tolMinus: 0.2, type: "length", group: "detail" },
  { code: "L6",  nameRU: "Длина воротника по верхнему краю",nameEN: "Collar length upper edge",   methodRU: "По верхнему краю воротника от края до края.",                                   method: "Along upper edge of collar, end to end.",                                 values: [40.0,41.0,42.0,43.0,44.0,45.0,46.0,47.0,48.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "detail" },
  { code: "L8",  nameRU: "Длина лацкана",                  nameEN: "Lapel length",                 methodRU: "Вдоль края лацкана от линии перегиба до острия.",                                method: "Along lapel edge from break line to lapel point.",                        values: [20.0,20.0,20.5,20.5,21.0,21.0,21.5,21.5,22.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "detail" },
  { code: "L9",  nameRU: "Ширина лацкана",                 nameEN: "Lapel width",                  methodRU: "По прямой в контрольном месте лацкана.",                                        method: "Straight line at widest point of lapel.",                                 values: [8.5,8.5,9.0,9.0,9.5,9.5,10.0,10.0,10.5],       tolPlus: 0.3, tolMinus: 0.3, type: "width",  group: "detail" },
  { code: "Cp",  nameRU: "Вход в нагрудный карман",        nameEN: "Chest pocket opening",         methodRU: "По линии входа в нагрудный карман.",                                            method: "Along chest pocket opening line.",                                        values: [10.5,10.5,10.5,10.5,11.0,11.0,11.0,11.0,11.0], tolPlus: 0.2, tolMinus: 0.2, type: "length", group: "detail" },
  { code: "Cp1", nameRU: "Высота листочки нагрудного кармана",nameEN: "Chest pocket welt height",  methodRU: "По высоте листочки/рамки нагрудного кармана.",                                  method: "Finished welt height of chest pocket.",                                   values: [2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0],           tolPlus: 0.1, tolMinus: 0.1, type: "length", group: "detail" },
  { code: "Sp1", nameRU: "Высота листочки бокового кармана",nameEN: "Side pocket welt height",     methodRU: "По прямой линии высоты листочки/рамки.",                                        method: "Finished welt height of side pocket.",                                    values: [2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5,2.5],           tolPlus: 0.1, tolMinus: 0.1, type: "length", group: "detail" },
  { code: "Sp",  nameRU: "Вход в боковой карман",          nameEN: "Side pocket opening",          methodRU: "От закрепки до закрепки по прямой.",                                            method: "Straight line, tack to tack.",                                            values: [13.5,13.5,14.0,14.0,14.5,14.5,15.0,15.0,15.5], tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "detail" },
  { code: "T2",  nameRU: "Расположение бокового кармана от CF (вверху)", nameEN: "Side pocket placement from CF (top)", methodRU: "По прямой от шва центра полочки вверх, не включая молнию.", method: "From CF seam, excluding zipper/fly, upwards.",                           values: [7.0,7.0,7.0,7.5,7.5,7.5,8.0,8.0,8.0],           tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "detail" },
  { code: "T3",  nameRU: "Расположение бокового кармана от CF (внизу)",  nameEN: "Side pocket placement from CF (bottom)", methodRU: "По прямой от шва центра полочки вниз, не включая молнию.", method: "From CF seam, excluding zipper/fly, downwards.",                         values: [4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0],           tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "detail" },
  { code: "P1",  nameRU: "Расстояние между пуговицами",    nameEN: "Distance between buttons",     methodRU: "Между центрами соседних пуговиц.",                                              method: "Between centres of adjacent buttons.",                                    values: [10.0,10.0,10.0,10.5,10.5,10.5,11.0,11.0,11.0], tolPlus: 0.2, tolMinus: 0.2, type: "length", group: "detail" },
  { code: "U",   nameRU: "Длина шлицы сзади",              nameEN: "Back vent length",             methodRU: "От низа изделия вверх до верхней точки шлицы.",                                 method: "From garment hem up to top of back vent.",                                values: [22.0,22.0,23.0,23.0,24.0,24.0,25.0,25.0,26.0], tolPlus: 0.5, tolMinus: 0.5, type: "length", group: "detail" },
];

// Double-breasted coat — same structure as single, pocket block differs.
// Sp1/T2/T3 replaced by Spf/Spf2/T9 (flap pocket instead of welt).
const COAT_DOUBLE_POMS = [
  ...COAT_SINGLE_POMS.filter(p => !["Sp1", "T2", "T3"].includes(p.code)),
  { code: "Spf",  nameRU: "Длина клапана бокового кармана",  nameEN: "Side pocket flap length",  methodRU: "От края до края клапана по прямой.",                    method: "Straight line, end to end of flap.",                values: [13.5,13.5,14.0,14.0,14.5,14.5,15.0,15.0,15.5], tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "detail" },
  { code: "Spf2", nameRU: "Высота клапана бокового кармана", nameEN: "Side pocket flap height",  methodRU: "По центру / самой широкой части клапана.",               method: "At centre / widest point of flap.",                 values: [6.0,6.0,6.5,6.5,7.0,7.0,7.5,7.5,8.0],           tolPlus: 0.2, tolMinus: 0.2, type: "length", group: "detail" },
  { code: "T9",   nameRU: "Расположение бокового кармана от центра переда", nameEN: "Side pocket placement from CF", methodRU: "От центра переда до контрольной точки кармана.", method: "From CF to pocket reference point.", values: [9.5,9.5,10.0,10.0,10.5,10.5,11.0,11.0,11.5],     tolPlus: 0.3, tolMinus: 0.3, type: "length", group: "detail" },
];

export function getPoms(garmentId, group = "all") {
  const map = {
    "classic-trousers": TROUSERS_POMS,
    "coat-single": COAT_SINGLE_POMS,
    "coat-double": COAT_DOUBLE_POMS,
  };
  const all = map[garmentId] ?? [];
  if (group === "main") return all.filter(p => p.group === "main");
  if (group === "detail") return all.filter(p => p.group === "detail");
  return all;
}

// Exact lookup with linear interpolation for sizes between table entries
export function calcValue(pom, size, _baseSize) {
  const idx = ALL_SIZES.indexOf(size);
  if (idx !== -1) return pom.values[idx];
  // interpolate for non-standard sizes
  const lo = ALL_SIZES.filter(s => s <= size).pop();
  const hi = ALL_SIZES.find(s => s > size);
  if (lo === undefined) return pom.values[0];
  if (hi === undefined) return pom.values[ALL_SIZES.length - 1];
  const loIdx = ALL_SIZES.indexOf(lo);
  const hiIdx = ALL_SIZES.indexOf(hi);
  const t = (size - lo) / (hi - lo);
  return +(pom.values[loIdx] + t * (pom.values[hiIdx] - pom.values[loIdx])).toFixed(1);
}
