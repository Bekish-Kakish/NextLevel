export default function HomePage() {
  const features = [
    {
      title: "Живой мир",
      text: "Мрачная фэнтези-атмосфера, сюжетные зоны, задания и ощущение настоящего путешествия по опасному миру.",
    },
    {
      title: "Тактические бои",
      text: "Сражения против врагов мира с ростом сложности, наградами и прогрессом персонажа.",
    },
    {
      title: "Рост героя",
      text: "Прокачка, экипировка, инвентарь, характеристики и постепенное раскрытие силы персонажа.",
    },
  ];

  const roadmap = [
    "Главное меню и вход в игру",
    "Экран персонажа и инвентарь",
    "Квесты, награды и карта мира",
    "Боевая система и интерфейс боя",
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px 56px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <section
          className="ui-panel hero-core"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "clamp(28px, 5vw, 56px)",
            border: "1px solid rgba(167, 188, 255, 0.18)",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 10% 0%, rgba(250, 204, 21, 0.14), transparent 28%), radial-gradient(circle at 85% 15%, rgba(34, 211, 238, 0.16), transparent 26%), radial-gradient(circle at 50% 100%, rgba(244, 114, 182, 0.10), transparent 34%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: "24px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 0 24px rgba(34,211,238,0.12)",
                  fontSize: "0.9rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>NextLevel</span>
                <span style={{ opacity: 0.55 }}>•</span>
                <span>Браузерная RPG</span>
              </div>

              <h1
                style={{
                  margin: "18px 0 14px",
                  fontSize: "clamp(2.7rem, 6vw, 5.5rem)",
                  lineHeight: 0.94,
                  letterSpacing: "-0.04em",
                }}
              >
                Пепельный рубеж
              </h1>

              <p
                style={{
                  margin: 0,
                  maxWidth: 720,
                  color: "rgba(236, 240, 255, 0.84)",
                  fontSize: "clamp(1rem, 2vw, 1.16rem)",
                  lineHeight: 1.75,
                }}
              >
                Темный фэнтезийный мир, где игрок растет через бои, задания, добычу и исследование опасных
                территорий. Эта страница теперь выглядит как нормальный landing, а не как пустой экран после
                неудачного деплоя.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  marginTop: 28,
                }}
              >
                <a
                  className="ui-btn"
                  href="#features"
                  style={{
                    padding: "14px 18px",
                    background: "linear-gradient(135deg, rgba(250, 204, 21, 0.96), rgba(249, 115, 22, 0.92))",
                    color: "#120f06",
                    fontWeight: 800,
                    boxShadow: "0 18px 34px rgba(249, 115, 22, 0.28)",
                  }}
                >
                  Смотреть особенности
                </a>
                <a
                  className="ui-btn ui-frame"
                  href="#roadmap"
                  style={{
                    padding: "14px 18px",
                    borderColor: "rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    fontWeight: 700,
                  }}
                >
                  Что дальше
                </a>
              </div>
            </div>

            <div
              className="ui-card ui-frame"
              style={{
                padding: 20,
                alignSelf: "stretch",
                background: "rgba(7, 12, 24, 0.66)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <p style={{ margin: 0, opacity: 0.62, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.8rem" }}>
                    Статус проекта
                  </p>
                  <h2 style={{ margin: "10px 0 6px", fontSize: "1.5rem" }}>Сайт поднят и подготовлен к развитию</h2>
                  <p style={{ margin: 0, color: "rgba(236,240,255,0.78)", lineHeight: 1.65 }}>
                    Убрана несовместимая серверная часть для GitHub Pages и добавлен аккуратный стартовый экран.
                  </p>
                </div>

                <div className="ui-card" style={{ padding: 16, background: "rgba(255,255,255,0.03)" }}>
                  <p style={{ margin: 0, opacity: 0.62, fontSize: "0.82rem" }}>Технологии</p>
                  <p style={{ margin: "8px 0 0", fontWeight: 700 }}>Next.js · React · Tailwind-ready UI</p>
                </div>

                <div className="ui-card" style={{ padding: 16, background: "rgba(255,255,255,0.03)" }}>
                  <p style={{ margin: 0, opacity: 0.62, fontSize: "0.82rem" }}>Дальнейшая сборка</p>
                  <p style={{ margin: "8px 0 0", fontWeight: 700 }}>Можно наращивать игру поверх этого каркаса</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" style={{ marginTop: 26 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {features.map((item) => (
              <article
                key={item.title}
                className="ui-panel task-card"
                style={{
                  padding: 22,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p style={{ margin: 0, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.78rem" }}>
                  Особенность
                </p>
                <h3 style={{ margin: "10px 0 12px", fontSize: "1.25rem" }}>{item.title}</h3>
                <p style={{ margin: 0, color: "rgba(236,240,255,0.78)", lineHeight: 1.7 }}>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="roadmap"
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div
            className="ui-panel"
            style={{
              padding: 24,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <p style={{ margin: 0, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.78rem" }}>
              План развития
            </p>
            <h2 style={{ margin: "12px 0 16px", fontSize: "1.7rem" }}>Что можно подключить следующим коммитом</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {roadmap.map((step, index) => (
                <div
                  key={step}
                  className="ui-card ui-frame"
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    padding: 14,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(250,204,21,0.16)",
                      border: "1px solid rgba(250,204,21,0.24)",
                      fontWeight: 800,
                      color: "#ffd666",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ lineHeight: 1.55 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="ui-panel"
            style={{
              padding: 24,
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{ margin: 0, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.78rem" }}>
                Визуальный тон
              </p>
              <h2 style={{ margin: "12px 0 12px", fontSize: "1.7rem" }}>Темный sci-fantasy интерфейс</h2>
              <p style={{ margin: 0, color: "rgba(236,240,255,0.78)", lineHeight: 1.75 }}>
                Оставил атмосферу темного мира с мягкими свечениями, стеклянными панелями и акцентами золота,
                циана и розы — сайт уже выглядит как заготовка под игру, а не как стандартный шаблон Next.js.
              </p>
            </div>

            <div
              style={{
                marginTop: 22,
                minHeight: 220,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "radial-gradient(circle at 20% 20%, rgba(251,191,36,0.22), transparent 26%), radial-gradient(circle at 80% 30%, rgba(34,211,238,0.18), transparent 24%), radial-gradient(circle at 50% 88%, rgba(244,114,182,0.16), transparent 28%), linear-gradient(180deg, rgba(9,14,24,0.9), rgba(7,10,19,0.94))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 18,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 28,
                  right: 28,
                  bottom: 26,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ height: 10, width: "72%", borderRadius: 999, background: "rgba(255,255,255,0.16)" }} />
                <div style={{ height: 10, width: "54%", borderRadius: 999, background: "rgba(255,255,255,0.12)" }} />
                <div style={{ height: 10, width: "83%", borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
