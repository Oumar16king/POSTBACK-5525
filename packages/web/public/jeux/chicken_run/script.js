/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
const GAME_MODES = {
    easy: [1.1, 1.2, 1.3, 1.5, 1.8, 2, 2.5, 3, 4, 5.5, 7.5, 10],
    medium: [1.2, 1.5, 1.7, 2, 3, 4.5, 6, 8.5, 12],
    hard: [1.4, 2, 4, 8, 15],
    hardcore: [1.6, 2.5, 5, 10]
};
let currentGameMode = 'easy';
let gameInProgress = false;
let gameFinished = false;

// Элементы DOM
const chicken = document.getElementById('chicken');
const getSignalBtn = document.getElementById('getSignalBtn');
const backBtn = document.getElementById('backBtn');
const modeButtons = document.querySelectorAll('.mode-btn');
const tunnel = document.querySelector('.tunnel');

// Обработчики выбора режима игры
modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (gameInProgress) return; // Не позволяем менять режим во время игры
        
        // Убираем активный класс у всех кнопок
        modeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Добавляем активный класс текущей кнопке
        button.classList.add('active');
        
        // Устанавливаем новый режим
        currentGameMode = button.dataset.mode;
        
        // Очистка если игра закончена
        if (gameFinished) {
            cleanupAllGameElements();
            gameFinished = false;
        }
        
        console.log(`Режим игры изменен на: ${currentGameMode}`);
    });
});

// Обработчик кнопки Back
backBtn.addEventListener('click', () => {
    window.history.back();
});

// Обработчик кнопки получения сигнала
getSignalBtn.addEventListener('click', async () => {
    if (gameInProgress) return;
    
    gameInProgress = true;
    getSignalBtn.disabled = true;
    
    // Отключаем кнопки выбора режима во время игры
    modeButtons.forEach(btn => btn.disabled = true);
    
    try {
        // ВАЖНО: Полная очистка перед началом новой игры
        await cleanupAllGameElements();
        gameFinished = false;
        
        await playGameSequence();
    } catch (error) {
        console.error('Ошибка в игре:', error);
        await cleanupAllGameElements();
    } finally {
        gameInProgress = false;
        getSignalBtn.disabled = false;
        modeButtons.forEach(btn => btn.disabled = false);
        gameFinished = true;
    }
});

// Полная очистка всех игровых элементов
function cleanupAllGameElements() {
    return new Promise(resolve => {
        // Убираем все динамически созданные элементы
        const fireAnimations = document.querySelectorAll('.fire-animation');
        const deadChickenContainers = document.querySelectorAll('.dead-chicken-container');
        
        fireAnimations.forEach(element => element.remove());
        deadChickenContainers.forEach(element => element.remove());
        
        // Показываем живую курицу
        chicken.style.display = 'block';
        
        // Убираем все классы анимации
        chicken.classList.remove('jumping');
        
        console.log('Все игровые элементы очищены');
        resolve();
    });
}

// Основная игровая последовательность
async function playGameSequence() {
    console.log(`Запуск игры в режиме: ${currentGameMode}`);
    
    // 1. Курица прыгает
    await chickenJump();
    
    // 2. Воспроизводим анимацию огня с превращением курицы во время огня
    await playFireAnimationWithTransformation();
    
    // 3. Игра завершается - результат остается до новой игры или смены режима
    console.log('Игра завершена - результат останется до новой игры');
}

// Анимация прыжка курицы
function chickenJump() {
    return new Promise(resolve => {
        chicken.classList.add('jumping');
        
        setTimeout(() => {
            chicken.classList.remove('jumping');
            resolve();
        }, 800);
    });
}

// Воспроизведение анимации огня с превращением курицы во время огня
function playFireAnimationWithTransformation() {
    return new Promise(resolve => {
        const fireContainer = document.createElement('div');
        fireContainer.className = 'fire-animation';
        
        const fireImg = document.createElement('img');
        fireContainer.appendChild(fireImg);
        
        tunnel.appendChild(fireContainer);
        
        let currentFrame = 0;
        const totalFrames = 22; // fire_0.webp до fire_21.webp
        const transformFrame = Math.floor(totalFrames / 2); // Превращаем курицу в середине анимации огня
        
        function updateFrame() {
            fireImg.src = `fire_${currentFrame}.webp`;
            fireImg.onerror = () => {
                console.warn(`Кадр fire_${currentFrame}.webp не найден`);
                fireImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
            };
            
            // Превращаем курицу в середине анимации огня
            if (currentFrame === transformFrame) {
                transformChickenToDead();
            }
            
            currentFrame++;
            
            if (currentFrame < totalFrames) {
                setTimeout(updateFrame, 82); // ~1.8 секунды на 22 кадра
            } else {
                // Удаляем анимацию огня после завершения
                fireContainer.remove();
                resolve();
            }
        }
        
        updateFrame();
    });
}

// Превращаем курицу в мертвую во время огня
function transformChickenToDead() {
    // Скрываем живую курицу
    chicken.style.display = 'none';
    
    // Создаем контейнер для мертвой курицы
    const deadChickenContainer = document.createElement('div');
    deadChickenContainer.className = 'dead-chicken-container';
    
    const deadChickenImg = document.createElement('img');
    deadChickenImg.src = 'deadchicken.png';
    deadChickenImg.className = 'dead-chicken-img';
    deadChickenImg.alt = 'Dead Chicken';
    
    // Обработка ошибки загрузки изображения мертвой курицы
    deadChickenImg.onerror = () => {
        console.warn('deadchicken.png не найден, используем заглушку');
        deadChickenImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjIwIiBoZWlnaHQ9IjIyMCIgdmlld0JveD0iMCAwIDIyMCAyMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIyMCIgaGVpZ2h0PSIyMjAiIGZpbGw9IiNmZjAwMDAiLz48dGV4dCB4PSIxMTAiIHk9IjExNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+WDwvdGV4dD48L3N2Zz4=';
    };
    function getWeightedMultiplier(mode) {
    const multipliers = GAME_MODES[mode];

    // Example weights (small ones more common, big ones rare)
    const weights = multipliers.map(value => {
        if (value <= 2) return 50;   // very common
        if (value <= 5) return 20;   // medium chance
        if (value <= 10) return 8;   // rare
        return 2;                    // super rare
    });

    // Pick based on weights
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < multipliers.length; i++) {
        if (random < weights[i]) {
            return multipliers[i];
        }
        random -= weights[i];
    }
}
    
    // Создаем элемент множителя
    const multiplierElement = document.createElement('div');
    multiplierElement.className = 'dead-chicken-multiplier';
    
    // Получаем случайный множитель для текущего режима
    const multipliers = GAME_MODES[currentGameMode];
    const randomMultiplier = getWeightedMultiplier(currentGameMode);
    multiplierElement.textContent = `${randomMultiplier}x`;
    
    console.log(`Выпал множитель: ${randomMultiplier}x в режиме ${currentGameMode}`);
    
    deadChickenContainer.appendChild(deadChickenImg);
    deadChickenContainer.appendChild(multiplierElement);
    
    tunnel.appendChild(deadChickenContainer);
}

// Инициализация игры
console.log('Chicken Road Signal Game загружена!');
console.log(`Текущий режим: ${currentGameMode}`);
console.log('Доступные режимы:', Object.keys(GAME_MODES));

// Очистка при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    cleanupAllGameElements();
}); 