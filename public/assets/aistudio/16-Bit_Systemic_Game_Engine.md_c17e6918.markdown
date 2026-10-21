# 16-Bit Systemic Game Engine
## Technical Design Document

**Версія:** 0.1 — Concept Draft  
**Статус:** Experimental / Pre-Prototype  
**Філософія:** Minimalist Rendering, Deep Gameplay Systems

---

# 1. Концепція

Цей рушій створюється для ігор, які зовні наслідують естетику 16-бітної ери, але за складністю внутрішніх систем можуть значно перевершувати класичні консольні ігри.

Основний принцип:

> **Мінімум графічної складності — максимум системної складності.**

Рушій не ставить за мету створення фотореалістичних сцен або складної 3D-графіки.

Натомість він оптимізований під:

- top-down та 3/4 perspective;
- tile-based світи;
- sprite-based rendering;
- низьку внутрішню роздільність;
- стилізоване освітлення;
- насичений gameplay;
- системну взаємодію об'єктів;
- відкриті світи;
- моддинг;
- data-driven content;
- Lua scripting.

Графічно гра може нагадувати епоху SNES / Sega Genesis, але її світ повинен поводитися як сучасна системна RPG.

---

# 2. Ключові принципи

## 2.1. Простота візуалізації

Базовий renderer повинен залишатися простим.

Типова внутрішня роздільність:

- 320×180;
- 384×216;
- 426×240;
- або інша низька роздільність.

Масштабування виконується без interpolation.

Основні графічні primitives:

- tiles;
- sprites;
- particles;
- rectangles;
- lines;
- simple lighting;
- palette-based effects.

---

## 2.2. Складність через системи

Глибина гри повинна виникати не через кількість графічних assets, а через взаємодію систем.

Приклад:

```text
Weather
   ↓
Environment
   ↓
Resources
   ↓
Economy
   ↓
NPC behavior
   ↓
Quests
   ↓
Player decisions
```

Одна зміна у світі потенційно може впливати на багато інших систем.

---

# 3. Архітектура рушія

Базова архітектура:

```text
┌──────────────────────────────┐
│          GAME LAYER          │
│ quests / narrative / rules   │
├──────────────────────────────┤
│       SCRIPTING LAYER        │
│             Lua              │
├──────────────────────────────┤
│      SIMULATION LAYER        │
│ NPC / economy / ecology      │
├──────────────────────────────┤
│       GAMEPLAY LAYER         │
│ combat / inventory / skills  │
├──────────────────────────────┤
│         WORLD LAYER          │
│ maps / entities / tiles      │
├──────────────────────────────┤
│       RENDERING LAYER        │
│ sprites / particles / light  │
├──────────────────────────────┤
│        PLATFORM LAYER        │
│ filesystem / input / audio   │
└──────────────────────────────┘
```

Шари повинні бути максимально незалежними.

Renderer не повинен містити логіку квестів.

Combat не повинен безпосередньо залежати від конкретного UI.

Lua не повинен мати прямий доступ до внутрішньої пам'яті рушія.

---

# 4. World System

Світ складається з:

- regions;
- maps;
- tiles;
- entities;
- objects;
- triggers;
- resources;
- environmental states.

Приклад:

```text
World
 ├── Region
 │    ├── Map
 │    │    ├── Tiles
 │    │    ├── Objects
 │    │    ├── NPCs
 │    │    └── Triggers
 │    │
 │    └── World Events
 │
 └── Global State
```

World State зберігає довготривалі зміни:

```text
forest_density
town_population
faction_relations
resource_prices
quest_flags
weather
time
```

---

# 5. Time System

Світ має глобальний час.

Час може впливати на:

- NPC schedules;
- магазини;
- ворогів;
- квести;
- погоду;
- ресурси;
- випадкові події;
- доступність локацій.

Приклад:

```text
Morning
   ↓
NPC → Workshop

Afternoon
   ↓
NPC → Market

Evening
   ↓
NPC → Home
```

Час не повинен бути лише декоративним.

---

# 6. Weather & Environment

Environment System відповідає за стан навколишнього світу.

Базові параметри:

```text
temperature
humidity
wind
rain
snow
visibility
light_level
```

Environment може впливати на gameplay.

Наприклад:

```text
Rain
 ↓
Fire weaker
 ↓
Mud appears
 ↓
Movement changes
 ↓
NPC schedules change
```

---

# 7. NPC System

NPC мають:

- attributes;
- needs;
- faction;
- relationships;
- inventory;
- occupation;
- schedule;
- AI state;
- memory;
- dialogue state.

NPC не повинні існувати лише як статичні декорації.

Базовий цикл:

```text
Observe
 ↓
Evaluate
 ↓
Choose Action
 ↓
Execute
 ↓
Update State
```

---

# 8. Faction System

Фракції мають власні:

- відносини;
- території;
- ресурси;
- цілі;
- reputation;
- alliances;
- conflicts.

Відношення можуть бути числовими:

```text
-100 ───── 0 ───── +100
hostile   neutral   allied
```

Дії гравця можуть змінювати faction state.

---

# 9. Quest System

Квести повинні бути системними, а не лише лінійними сценаріями.

Quest може реагувати на World State.

Приклад:

```text
IF ore_stock < 10
AND player.has_access_to_mine
THEN
    activate "Missing Ore"
```

Квест може мати:

- conditions;
- objectives;
- stages;
- rewards;
- consequences;
- alternate outcomes;
- failure conditions.

---

# 10. Inventory & Crafting

Inventory підтримує:

- items;
- equipment;
- resources;
- consumables;
- quest items;
- modular components.

Crafting повинен бути data-driven.

```text
Recipe:

iron + wood → sword

steel + crystal → energy blade
```

Складні системи можуть дозволяти моддерам створювати власні рецепти без зміни engine core.

---

# 11. Character Progression

Прогресія не обмежується класичними:

```text
STR
DEX
INT
```

Система повинна підтримувати:

- attributes;
- skills;
- abilities;
- equipment;
- implants;
- mutations;
- perks;
- passive effects;
- temporary effects.

Конкретний тип прогресії визначається грою.

Той самий engine повинен підтримувати fantasy, cyberpunk, post-apocalyptic та інші settings.

---

# 12. Combat System

Combat орієнтований на швидкий системний gameplay.

Базові елементи:

- movement;
- attack;
- defense;
- dodge;
- stun;
- knockback;
- status effects;
- abilities;
- combos.

Combo System дозволяє пов'язувати дії:

```text
LIGHT
 ↓
LIGHT
 ↓
HEAVY
 ↓
LAUNCH
 ↓
AIR ATTACK
```

Комбінації можуть залежати від:

- weapon;
- character;
- stamina;
- status;
- equipped abilities;
- timing;
- enemy state.

---

# 13. Status & Effects System

Усі gameplay effects повинні бути універсальними.

Приклади:

```text
Burning
Frozen
Poisoned
Stunned
Bleeding
Electrified
Wet
Invisible
Hasted
```

Effects можуть взаємодіяти.

Наприклад:

```text
Wet
 +
Electricity
 =
Electrified
```

Це дозволяє створювати складні gameplay interactions без hardcoding кожної ситуації.

---

# 14. Event System

Engine має глобальну Event Bus.

Приклади подій:

```text
player_spawned
item_used
enemy_killed
quest_started
quest_completed
npc_died
weather_changed
time_changed
faction_relation_changed
```

Системи можуть підписуватися на події.

```text
Combat
   ↓
enemy_killed
   ↓
Quest System
   ↓
Quest objective updated
```

---

# 15. Data-Driven Content

Game content не повинен бути hardcoded у engine.

Контент зберігається окремо:

```text
game/
 ├── maps/
 ├── items/
 ├── enemies/
 ├── npcs/
 ├── quests/
 ├── dialogue/
 ├── recipes/
 ├── factions/
 └── scripts/
```

Для декларативних даних допускається Markdown + frontmatter, YAML або інший легкий serialization format.

Приклад:

```yaml
item:
  id: iron_sword
  damage: 8
  weight: 2.5
  value: 50
```

---

# 16. Lua Modding

Lua є основним scripting layer.

Markdown/YAML описує **що існує**.

Lua описує **як воно поводиться**.

Наприклад:

```lua
function on_use(item, player, target)

    if target.type == "water" then
        target:apply_effect("electrified")
        player:add_effect("shock")

    end

end
```

Lua API повинен надавати контрольований доступ до:

```text
World
Entities
Items
Combat
Quests
Dialogue
Factions
Inventory
Events
Time
Weather
Audio
Effects
```

---

# 17. Mod Architecture

Мод має власну директорію:

```text
mods/
 └── example_mod/
      ├── mod.toml
      ├── items/
      ├── enemies/
      ├── quests/
      ├── maps/
      ├── sprites/
      └── scripts/
```

Мод може:

- додавати предмети;
- додавати NPC;
- додавати ворогів;
- додавати карти;
- додавати квести;
- змінювати existing content;
- створювати scripted events;
- додавати нові gameplay interactions.

---

# 18. Rendering System

Renderer оптимізований під 2D.

Основні компоненти:

```text
Renderer
 ├── Tile Renderer
 ├── Sprite Renderer
 ├── Particle Renderer
 ├── Lighting
 ├── Camera
 ├── Animation
 └── Post Processing
```

Візуальний стиль не повинен бути жорстко прив'язаний до конкретної гри.

Renderer має підтримувати:

- top-down;
- 3/4;
- side-view у майбутньому;
- sprite animation;
- tile animation;
- palette effects;
- screen effects.

---

# 19. Audio System

Audio System підтримує:

- music;
- ambient sound;
- sound effects;
- positional audio;
- dynamic music states.

Gameplay events можуть керувати музикою.

Наприклад:

```text
Exploration
     ↓
Combat Started
     ↓
Combat Music
     ↓
Boss Detected
     ↓
Boss Music
```

---

# 20. Save System

Save System повинен зберігати не тільки позицію гравця.

Зберігаються:

```text
Player State
World State
Quest State
NPC State
Faction State
Inventory
Equipment
Time
Weather
Global Flags
```

Це дозволяє зберігати реальний стан системного світу.

---

# 21. Performance Philosophy

Рушій розрахований на запуск на слабкому hardware.

Основні принципи:

- low resolution rendering;
- batching;
- tile chunking;
- object pooling;
- deterministic simulation where possible;
- low memory overhead;
- asynchronous asset loading;
- scalable simulation frequency.

Графічна простота використовується не лише як стиль, а й як спосіб звільнити ресурси для simulation.

---

# 22. Target Platforms

Перший прототип:

```text
Desktop
 ├── Linux
 ├── Windows
 └── potentially Android
```

Архітектура не повинна залежати від конкретної платформи.

---

# 23. Suggested Technology Stack

Початковий варіант:

```text
Core:
    Rust

Rendering:
    wgpu / lightweight 2D renderer

Scripting:
    Lua

Data:
    Markdown
    YAML / TOML

Audio:
    cpal / rodio / equivalent

Compression / Assets:
    standard Rust ecosystem
```

Конкретні бібліотеки можуть бути замінені без зміни архітектурних принципів.

---

# 24. Example Game

Приклад гри на цьому рушії:

**Top-down systemic action RPG**

Гравець потрапляє у невеликий open world.

Є:

- 5 регіонів;
- 3 фракції;
- 50 NPC;
- динамічна економіка;
- crafting;
- equipment;
- implants;
- combat combos;
- quests;
- day/night cycle;
- weather;
- random events.

Графіка при цьому залишається:

```text
16-bit
320×180
tile-based
sprite-based
```

Візуальна простота не обмежує системну складність.

---

# 25. Design Goal

Рушій повинен дозволяти створювати ігри, де:

> **кожен об'єкт є частиною системи, кожна система може взаємодіяти з іншими, а гравець отримує можливість створювати власні рішення замість проходження виключно заздалегідь написаного сценарію.**

Головна мета — не створити найбільший engine.

Головна мета — створити **маленький, модульний і легкий engine, здатний породжувати великі gameplay-системи.**