import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Обязательно для работы на GitHub Pages (статический экспорт)
  basePath: '/NextLevel', // Имя твоего репозитория, чтобы пути к картинкам не ломались
  images: {
    unoptimized: true, // GitHub не умеет оптимизировать картинки на лету
  },
};

export default nextConfig;
