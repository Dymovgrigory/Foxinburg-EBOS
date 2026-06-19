# 🦊 FOXINBURG — Brand Guide

## Бренд
- **Название:** FOXINBURG / Фоксинбург
- **Слоган:** Образование, которое вдохновляет
- **Позиционирование:** Educational Business Operating System (EBOS) мирового уровня

## Корпоративные цвета

| Название | HEX | RGB | CMYK | Применение |
|----------|-----|-----|------|------------|
| Deep Purple | `#3A2953` | `58, 41, 83` | `30%, 51%, 0%, 67%` | Основной фон, header, sidebar, primary buttons, навигация |
| Fox Yellow | `#F5ED75` | `245, 237, 117` | `0%, 3%, 52%, 4%` | Акценты, CTA, badges, gamification, highlights |
| Pure White | `#FFFFFF` | `255, 255, 255` | `0%, 0%, 0%, 0%` | Карточки, текст на тёмном фоне, контраст |
| Dark Grey | `#2A2A2A` | `42, 42, 42` | `0%, 0%, 0%, 84%` | Основной текст, иконки |

## Градиенты
- **Hero:** `linear-gradient(135deg, #3A2953 0%, #4A3568 50%, #3A2953 100%)`
- **Accent Glow:** `linear-gradient(135deg, #F5ED75 0%, #FFF5A0 100%)`
- **Glass Card:** `linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`

## Типографика
- **Заголовки:** Inter / Montserrat / system-ui, bold/semi-bold
- **Основной текст:** Inter, regular/medium
- **Акцентный текст:** Fox Yellow на Deep Purple

## Логотип и маскот
- **Маскот:** Лисёнок в академической шапочке
- **Логотип:** Круглая печать с лисёнком и текстом «Языковая экосистема Фоксинбург»
- **Иконки:** Плавные волнистые линии Fox Yellow на Deep Purple

## Правила UI
1. **Фон приложения:** Deep Purple (`#3A2953`) или его светлая вариация `#F8F7FA`
2. **Primary buttons:** Fox Yellow background + Deep Purple text
3. **Secondary buttons:** Transparent + Fox Yellow border/text
4. **Cards:** White или glass-эффект на тёмном фоне
5. **Hover-эффекты:** Лёгкое свечение Fox Yellow, scale 1.02
6. **Скругление:** `border-radius: 12px` для карточек, `9999px` для pills
7. **Тени:** `0 4px 20px rgba(58, 41, 83, 0.15)`

## Assets
Логотипы и иконки должны быть размещены в:
- `assets/logo/`
- `assets/brand-icons/`
- `frontend/public/`
