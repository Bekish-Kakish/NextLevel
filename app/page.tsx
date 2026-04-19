export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <section
        className="ui-panel"
        style={{
          width: "min(920px, 100%)",
          padding: "32px",
          border: "1px solid rgba(167, 188, 255, 0.18)",
        }}
      >
        <p style={{ margin: 0, opacity: 0.72, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          NextLevel
        </p>
        <h1 style={{ marginTop: 12, marginBottom: 16, fontSize: "clamp(2rem, 5vw, 4rem)" }}>
          Пепельный рубеж
        </h1>
        <p style={{ marginTop: 0, marginBottom: 24, maxWidth: 680, lineHeight: 1.6, fontSize: "1.05rem" }}>
          Сайт проекта снова живой. Это стартовая страница для браузерной 2D RPG: дальше сюда можно
          подключить меню, карту мира, профиль персонажа, квесты и боевую систему.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <div className="ui-card ui-frame" style={{ padding: "16px", borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Что уже исправлено</h2>
            <p style={{ marginBottom: 0, opacity: 0.84 }}>
              Добавлена корневая страница `app/page.tsx`, чтобы у сайта был реальный маршрут `/`.
            </p>
          </div>

          <div className="ui-card ui-frame" style={{ padding: "16px", borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>GitHub Pages</h2>
            <p style={{ marginBottom: 0, opacity: 0.84 }}>
              Конфиг обновлен так, чтобы ассеты и роуты корректно работали в репозитории `NextLevel`.
            </p>
          </div>

          <div className="ui-card ui-frame" style={{ padding: "16px", borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Следующий шаг</h2>
            <p style={{ marginBottom: 0, opacity: 0.84 }}>
              Подключить твой реальный UI игры вместо временного landing screen и заново задеплоить Pages.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
