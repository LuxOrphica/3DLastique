import { Link } from "react-router-dom";
import "./TechPackHub.css";

const builderSections = [
  {
    code: "01",
    title: "Паспорт изделия",
    purpose: "Паспорт изделия: бренд, сезон, артикул, категория, базовый размер, размерный ряд и статус разработки.",
    fill: "Заполняется первым. Эти данные должны повторяться в PDF/XLSX, на титуле, в таблицах и в переписке с производством.",
  },
  {
    code: "02",
    title: "Технические выноски",
    purpose: "Технические выноски к эскизу: швы, карманы, застежки, отделка, конструктивные узлы, видимые особенности.",
    fill: "Каждая выноска должна отвечать на вопрос фабрики: что сделать, где сделать, каким способом и с каким материалом.",
  },
  {
    code: "03",
    title: "BOM",
    purpose: "BOM / спецификация материалов: материал верха, подкладка, прокладочные материалы, фурнитура, нитки, ярлыки, упаковка.",
    fill: "Для каждого материала нужны: роль, состав, артикул, цвет, поставщик, расход, единица, статус и комментарий.",
  },
  {
    code: "04",
    title: "Технология",
    purpose: "Технология сборки: припуски, строчки, прокладочные материалы, подкладка, эластичная тесьма, уход, параметры пряжи/стирки/эксплуатации.",
    fill: "Состав вкладки зависит от изделия. Пальто требует подкладку и прокладочные материалы, трикотаж - спецификацию пряжи, купальники - эластичную тесьму и эксплуатационные свойства.",
  },
  {
    code: "05",
    title: "Табель мер",
    purpose: "POM-таблица: точки измерений, базовый размер, размерный ряд, допуски и правила градации.",
    fill: "Самый чувствительный раздел для посадки. Каждая точка должна иметь понятный метод измерения и tolerance.",
  },
  {
    code: "06-10",
    title: "Передача",
    purpose: "Детали кроя, цветовая карта, уход, маркировка, упаковка и файлы для передачи.",
    fill: "Финальные вкладки превращают рабочий документ в комплект, который можно отправлять фабрике.",
  },
];

const guideClusters = [
  {
    eyebrow: "С чего начать",
    title: "База техпака",
    summary: "Что такое техпак, зачем он нужен фабрике и почему одного эскиза недостаточно.",
    articles: [
      "Техпак = инструкция производства, а не презентация дизайна",
      "Минимум перед первым образцом: эскиз, BOM, POM, технология, файлы",
      "Разница: техпак, спецификация изделия, табель мер, лекала",
    ],
  },
  {
    eyebrow: "Разделы",
    title: "Разделы документа",
    summary: "Что именно должно лежать в паспорте изделия, выносках, BOM, технологии, POM и передаче файлов.",
    articles: [
      "BOM без пустых строк: роль, материал, цвет, расход, статус",
      "Выноски без общих слов: узел, метод, место, примечание",
      "POM: точка измерения, метод, размерный ряд, tolerance",
    ],
  },
  {
    eyebrow: "Инструменты",
    title: "Связка инструментов",
    summary: "Как использовать конструктор техпака вместе с POM, каталогом узлов и VSE.",
    articles: [
      "POM-инструмент дает измерения и методы снятия мерок",
      "Каталог узлов закрывает выноски и конструктивные узлы",
      "VSE помогает разобрать визуальную деталь до технического описания",
    ],
  },
  {
    eyebrow: "Фабрика",
    title: "Передача на производство",
    summary: "Финальная проверка перед отправкой PDF/XLSX технологу или фабрике.",
    articles: [
      "Подтверждено: ткань, размеры, конструкция, критичная фурнитура",
      "Уточняется: поставщик, цена или второстепенная упаковка",
      "Перед первым образцом нельзя оставлять пустыми POM и технологию",
    ],
  },
];

const bomRows = [
  {
    component: "Материал верха",
    required: "Всегда",
    fields: "состав, плотность/GSM, цвет, поставщик, ширина, расход",
    example: "Шерсть/пэ 70/30, 420 GSM, чёрный, 1.85 м/шт",
  },
  {
    component: "Подкладка",
    required: "Верхняя одежда / юбки / часть изделий низа",
    fields: "состав, зона применения, цвет, антистатическая обработка, расход",
    example: "Вискозная подкладка тон-в-тон, корпус + рукав",
  },
  {
    component: "Прокладочный материал",
    required: "Воротники / борта / пояса / входы в карманы",
    fields: "тип, зона применения, поставщик, режим прессования",
    example: "Средняя клеевая прокладка, полочка + лацкан + пояс",
  },
  {
    component: "Нитки",
    required: "Всегда",
    fields: "тип, номер/толщина, цвет, зона применения",
    example: "Армированные полиэфирные, тон-в-тон, основные швы",
  },
  {
    component: "Фурнитура",
    required: "По изделию",
    fields: "молния, пуговицы, кнопки, люверсы, шнур, наконечники",
    example: "Молния YKK №5, кнопки цвета античной латуни, хлопковый шнур",
  },
  {
    component: "Ярлыки и упаковка",
    required: "Всегда для передачи на производство",
    fields: "основной ярлык, размерник, ярлык ухода, бирка, пакет",
    example: "Жаккардовый ярлык, ярлык ухода в левом боковом шве, пакет из переработанного полиэтилена",
  },
];

const pomExamples = [
  {
    garment: "Пальто / жакет",
    points: "Грудь, талия, низ, плечо, длина рукава, длина спинки, ширина рукава, манжета, воротник.",
    tolerance: "Основные ширины ±1.0 cm, длины ±0.7 cm, мелкие детали ±0.3-0.5 cm.",
  },
  {
    garment: "Брюки",
    points: "1/2 талии, 1/2 бёдер, передняя и задняя высота сидения, шаговый и боковой шов, бедро, колено, низ.",
    tolerance: "Талия/бёдра ±0.7-1.0 см, шаговый/боковой шов ±0.7 см, высота сидения ±0.5 см.",
  },
  {
    garment: "Футболка / худи",
    points: "Грудь, длина изделия, плечо, длина рукава, ширина рукава, манжета/рибана, низ, раскрытие капюшона.",
    tolerance: "Трикотажные изделия обычно допускают ±1.0 см по ширине и ±0.7 см по длине.",
  },
  {
    garment: "Купальники",
    points: "Грудь/талия/бёдра в расслабленном состоянии, растянутое измерение, длина бретели, обхват ноги, высота сидения.",
    tolerance: "Важно фиксировать расслабленное и растянутое состояние, иначе фабрика не поймет посадку.",
  },
];

const constructionDetails = [
  {
    title: "Припуски швов",
    details: "Указать припуск для основных швов, низа, горловины, рукава, пояса и спец-узлов. Не писать просто «стандартно».",
  },
  {
    title: "Спецификация строчек",
    details: "Тип строчки, частота стежков, нитка, закрепки, расстояние отстрочки, видимые декоративные строчки.",
  },
  {
    title: "Прокладочные материалы и подкладка",
    details: "Где клеить, какой материал, температура/пресс при необходимости, где подкладка крепится и где остается свободной.",
  },
  {
    title: "Эластичная тесьма / рибана / растяжимость",
    details: "Ширина резинки, коэффициент растяжения, восстановление формы, зона применения, натяжение. Для купальников это критичный блок.",
  },
  {
    title: "Стирка и уход",
    details: "Усадка, режим стирки, химчистка, глажение, устойчивость цвета. Для денима отдельно фиксировать обработку и стирку.",
  },
  {
    title: "Передача файлов",
    details: "Что передается фабрике: PDF-техпак, XLSX-таблицы, DXF-лекала, AI/PDF-файлы принтов, цветовые референсы, заметки по ревизии.",
  },
];

const garmentGuides = [
  {
    slug: "coat-blazer",
    title: "Пальто / жакет",
    tag: "Верхняя одежда",
    focus: "Подкладка, клеевые, лацканы, воротник, карманы, припуски, плечевые узлы.",
    builder: "Обязательны: BOM, прокладочные материалы, подкладка, строчки, POM, детали кроя.",
    checklist: ["материал верха + подкладка + прокладка", "выноски по лацкану/воротнику", "POM плеча и рукава", "спецификация пуговиц/застёжки"],
  },
  {
    slug: "trousers-chino",
    title: "Брюки / чиносы",
    tag: "Низ",
    focus: "Посадка, талия, бедра, шаговый шов, боковой шов, низ, застежка, карманы.",
    builder: "Критичны POM: талия, бёдра, высота сидения, шаговый/боковой шов, бедро, колено, низ.",
    checklist: ["конструкция пояса", "гульфик/застёжка", "детали карманов", "допуски по высоте сидения и шаговому шву"],
  },
  {
    slug: "skirt",
    title: "Юбка",
    tag: "Низ",
    focus: "Талия, бедра, длина, вытачки, шлица, подкладка, застежка, обработка низа.",
    builder: "Проверить технологию, опциональную подкладку, POM и детали кроя.",
    checklist: ["положение вытачек", "шлица/разрез", "застёжка-молния", "обработка низа"],
  },
  {
    slug: "tshirt-polo",
    title: "Футболка / поло",
    tag: "Верх",
    focus: "GSM, состав полотна, горловина, плечо, рукав, низ, печать или вышивка.",
    builder: "Главные блоки: BOM, строчки, POM, цветовая карта, уход.",
    checklist: ["плотность GSM", "рибана горловины", "принт/вышивка", "заметка по усадке"],
  },
  {
    slug: "knitwear",
    title: "Вязаный трикотаж",
    tag: "Верх",
    focus: "Пряжа, класс вязки, структура вязки, рибана, финишная обработка, усадка, уход.",
    builder: "Нужны спецификация пряжи, POM, уход и аккуратные допуски.",
    checklist: ["состав пряжи", "класс вязки", "структура вязки", "блокировка/финишная обработка"],
  },
  {
    slug: "hoodie-sweatshirt",
    title: "Худи / свитшот",
    tag: "Верх",
    focus: "Капюшон, шнур, люверсы, манжеты, карман, rib, плотность футера.",
    builder: "Проверить BOM, строчки, выноски по капюшону и карману.",
    checklist: ["конструкция капюшона", "шнур + люверсы", "карман-кенгуру", "рибана манжеты/низа"],
  },
  {
    slug: "swimwear",
    title: "Купальники",
    tag: "Купальники",
    focus: "Растяжимый материал, подкладка, эластичная тесьма, устойчивость к хлору, восстановление формы, посадка.",
    builder: "Важны подкладка, эластичная тесьма, эксплуатационные свойства, POM и допуски.",
    checklist: ["POM в расслабленном/растянутом состоянии", "ширина резинки", "зоны подкладки", "эксплуатационные требования"],
  },
  {
    slug: "files",
    title: "Файлы",
    tag: "Передача",
    focus: "DXF/PDF, эскизы, таблицы, цветовые карты, версии, комментарии.",
    builder: "Перед экспортом проверить передачу файлов и статусы разделов.",
    checklist: ["PDF-техпак", "XLSX-таблицы", "DXF-лекала", "дата ревизии"],
  },
];

const statusRules = [
  { status: "Заполнить", meaning: "Поле еще не готово. Нельзя отправлять фабрике, если так помечены BOM, POM или технология." },
  { status: "Уточняется", meaning: "Можно оставить для цены, поставщика или второстепенной упаковки, но не для посадки и технологии." },
  { status: "Подтверждено", meaning: "Данные проверены внутри команды и могут использоваться для первого образца." },
  { status: "Утверждено", meaning: "Финально согласовано после образца, примерки или утверждения брендом." },
];

const factoryChecklist = [
  "Есть эскиз спереди/сзади или понятные визуальные референсы.",
  "BOM содержит материалы, фурнитуру, цвета, расход и статусы.",
  "POM-таблица заполнена по базовому размеру и размерному ряду.",
  "Указаны tolerances для ключевых измерений.",
  "Технология описывает швы, припуски, подкладку, прокладочные материалы и отделку.",
  "Выноски ссылаются на реальные узлы, а не на общие слова.",
  "Маркировка, ярлык ухода, упаковка и handoff-файлы не пустые.",
  "PDF/XLSX экспорт проверен перед отправкой технологу или фабрике.",
];

const nextSteps = [
  "Сделать отдельные страницы-гайды для каждого garment type.",
  "Добавить якоря из карточек прямо на вкладки конструктора.",
  "Собрать реальные примеры: BOM, POM, выноски, чеклист передачи на производство.",
  "Добавить фильтр по роли: дизайнер, бренд, технолог, студент.",
];

export default function TechPackHub() {
  return (
    <main className="techpack-hub">
      <section className="techpack-hub-hero">
        <div className="container techpack-hub-hero-grid">
          <div>
            <div className="section-label">Хаб по техпакам</div>
            <h1>Хаб по техпакам для 3D Lastique</h1>
            <p>
              Практическая база вокруг продукта: что заполнять в конструкторе техпака,
              как пользоваться POM, BOM, узлами и VSE, и что проверить перед передачей на производство.
            </p>
            <div className="techpack-hub-actions">
              <Link to="/tools/techpack" className="techpack-hub-primary">Открыть конструктор техпака</Link>
              <Link to="/tools/pom" className="techpack-hub-secondary">Перейти в POM</Link>
              <Link to="/tools/nodes" className="techpack-hub-secondary">Каталог узлов</Link>
            </div>
          </div>
          <aside className="techpack-hub-summary">
            <span>Hub map</span>
            <strong>BOM · POM · Технология · Передача</strong>
            <p>От базового состава техпака до конкретных проверок по материалам, измерениям и передаче фабрике.</p>
          </aside>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Навигация</div>
              <h2>Информационные кластеры</h2>
            </div>
            <p>Верхний уровень хаба: из него позже можно сделать статьи, onboarding или встроенную справку.</p>
          </div>

          <div className="techpack-hub-grid">
            {guideClusters.map((cluster) => (
              <article className="techpack-hub-card" key={cluster.title}>
                <div className="techpack-hub-card-eyebrow">{cluster.eyebrow}</div>
                <h3>{cluster.title}</h3>
                <p>{cluster.summary}</p>
                <ul>
                  {cluster.articles.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Карта конструктора</div>
              <h2>Что заполнять в конструкторе техпака</h2>
            </div>
            <p>Карта основных вкладок, чтобы пользователь понимал порядок заполнения и роль каждого блока.</p>
          </div>

          <div className="techpack-hub-timeline">
            {builderSections.map((section) => (
              <article className="techpack-hub-step" key={section.code}>
                <div className="techpack-hub-step-code">{section.code}</div>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.purpose}</p>
                  <small>{section.fill}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Конкретные данные</div>
              <h2>BOM: что конкретно указывать</h2>
            </div>
            <p>Минимальная таблица, без которой фабрика будет задавать уточняющие вопросы до расчета и первого образца.</p>
          </div>

          <div className="techpack-hub-table">
            <div className="techpack-hub-table-row techpack-hub-table-head">
              <span>Компонент</span>
              <span>Когда нужен</span>
              <span>Поля</span>
              <span>Пример</span>
            </div>
            {bomRows.map((row) => (
              <div className="techpack-hub-table-row" key={row.component}>
                <strong>{row.component}</strong>
                <span>{row.required}</span>
                <span>{row.fields}</span>
                <span>{row.example}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Примеры POM</div>
              <h2>Какие измерения заводить первыми</h2>
            </div>
            <p>POM должен фиксировать посадку, а не быть случайным списком мерок. Начинаем с базовых контрольных точек.</p>
          </div>

          <div className="techpack-hub-info-grid">
            {pomExamples.map((item) => (
              <article className="techpack-hub-info" key={item.garment}>
                <h3>{item.garment}</h3>
                <p>{item.points}</p>
                <small>{item.tolerance}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Технология</div>
              <h2>Что писать в технологии</h2>
            </div>
            <p>Раздел construction должен убрать неоднозначность: как именно изделие собирается, усиливается и отделывается.</p>
          </div>

          <div className="techpack-hub-info-grid">
            {constructionDetails.map((item) => (
              <article className="techpack-hub-info" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.details}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Гайды по изделиям</div>
              <h2>Гайды по типам изделий</h2>
            </div>
            <p>Карточки завязаны на реальные пресеты конструктора и показывают, что проверять для каждого изделия.</p>
          </div>

          <div className="techpack-hub-guide-grid">
            {garmentGuides.map((guide) => (
              <article className="techpack-hub-guide" key={guide.title}>
                <span>{guide.tag}</span>
                <h3>{guide.title}</h3>
                <p>{guide.focus}</p>
                <small>{guide.builder}</small>
                <ul>
                  {guide.checklist.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <Link className="techpack-hub-guide-link" to={`/tools/techpack/guides/${guide.slug}`}>
                  Открыть гайд
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container">
          <div className="techpack-hub-section-head">
            <div>
              <div className="section-label">Статусы</div>
              <h2>Как читать статусы</h2>
            </div>
            <p>Статусы нужны не для красоты: они показывают, можно ли уже отправлять документ дальше.</p>
          </div>

          <div className="techpack-hub-status-grid">
            {statusRules.map((rule) => (
              <article className="techpack-hub-status" key={rule.status}>
                <h3>{rule.status}</h3>
                <p>{rule.meaning}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container techpack-hub-checklist">
          <div>
            <div className="section-label">Готово к производству</div>
            <h2>Чеклист перед отправкой</h2>
            <p>Быстрая проверка документа перед отправкой PDF/XLSX на фабрику, технологу или конструктору.</p>
          </div>
          <ol>
            {factoryChecklist.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      </section>

      <section className="techpack-hub-section">
        <div className="container techpack-hub-roadmap">
          <div>
            <div className="section-label">Следующий этап</div>
            <h2>Что развивать дальше</h2>
          </div>
          <ol>
            {nextSteps.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      </section>
    </main>
  );
}
