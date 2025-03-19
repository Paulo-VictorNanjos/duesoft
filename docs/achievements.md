# Sistema de Conquistas (Achievements)

## Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura](#estrutura)
3. [Como Criar Novas Conquistas](#como-criar-novas-conquistas)
4. [Tipos de Condições](#tipos-de-condições)
5. [Raridades](#raridades)
6. [Integração](#integração)
7. [Personalização Visual](#personalização-visual)

## Visão Geral

O sistema de conquistas permite recompensar usuários por atingirem objetivos específicos na plataforma. Cada conquista desbloqueada concede XP ao usuário e é exibida em seu perfil.

## Estrutura

### Modelo de Conquista 

javascript
{
title: String, // Título da conquista
description: String, // Descrição detalhada
icon: String, // Classe do ícone FontAwesome
category: String, // cursos, provas, experiência, social
condition: {
type: String, // Tipo da condição
value: Number, // Valor necessário
days?: Number // Opcional: período em dias
},
xpReward: Number, // XP concedido ao desbloquear
rarity: String // comum, raro, épico, lendário
}
```

## Como Criar Novas Conquistas

1. Abra o arquivo `seed/achievements.js`
2. Adicione uma nova conquista ao array seguindo o modelo:

```javascript
{
    title: 'Nome da Conquista',
    description: 'Descrição do objetivo',
    icon: 'fas fa-icon-name',
    category: 'categoria',
    condition: {
        type: 'tipoCondicao',
        value: 10
    },
    xpReward: 500,
    rarity: 'raro'
}
```

3. Execute o seed para adicionar ao banco:
```bash
node seed/achievements.js
```

## Tipos de Condições

### Condições Disponíveis:
- `coursesCompleted`: Número de cursos concluídos
- `coursesCompletedInPeriod`: Cursos concluídos em X dias
- `perfectExamScore`: Provas com nota 100%
- `quickExamWithHighScore`: Provas rápidas com alta pontuação
- `reachCategory`: Alcançar categoria específica
- `loginStreak`: Dias consecutivos de login

### Adicionando Nova Condição:
1. Adicione o tipo no modelo Achievement
2. Implemente a verificação em `utils/achievementChecker.js`:

```javascript
static async checkCondition(user, achievement) {
    switch (achievement.condition.type) {
        case 'novaTipoCondicao': {
            // Lógica de verificação
            return resultado;
        }
    }
}
```

## Raridades

- **Comum**: Conquistas básicas (100-500 XP)
- **Raro**: Conquistas intermediárias (500-1500 XP)
- **Épico**: Conquistas difíceis (1500-3000 XP)
- **Lendário**: Conquistas muito difíceis (3000+ XP)

Cada raridade tem seu próprio estilo visual definido em `views/achievements/index.ejs`.

## Integração

Para verificar conquistas em uma ação:

```javascript
const unlockedAchievements = await AchievementChecker.checkAchievements(userId);

if (unlockedAchievements.length > 0) {
    const io = req.app.get('io');
    io.to(userId.toString()).emit('achievements:unlocked', {
        achievements: unlockedAchievements
    });
}
```

## Personalização Visual

### Ícones
Use classes do FontAwesome 6.0. Exemplo:
- `fas fa-graduation-cap`
- `fas fa-trophy`
- `fas fa-star`

### Cores por Raridade
Definidas em CSS:
```css
[data-rarity="comum"] { background: linear-gradient(135deg, #e5e7eb, #d1d5db); }
[data-rarity="raro"] { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
[data-rarity="épico"] { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
[data-rarity="lendário"] { background: linear-gradient(135deg, #fbbf24, #d97706); }
```

### Notificações
As notificações de conquistas são exibidas no canto inferior direito da tela por 5 segundos.
