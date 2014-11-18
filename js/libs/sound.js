/**
 * Created with JetBrains PhpStorm.
 * User: Максим
 * Date: 22.09.14
 * Time: 23:05
 * To change this template use File | Settings | File Templates.
 * Required: jquery, underscore
 */

function Sound(options) {
    var defaultSettings = {
        'limit':                    50,
        'playList':                 {},
        'sounds':                   {},
        'index':                    0,

        'backgroundMusic':          {
            'list':     [],
            'index':    0,
            'type':     'random',
            'sound':    null
        },

        'characterCoordinates':     null,
        'earshot':                  500
    };

    /**
     * Включить фоновую музыку
     * @param list
     */
    this.playBackground = function(list) {
        var backgroundMusic = this['backgroundMusic'];
        if (list && list.length) {
            if (backgroundMusic['sound']) {
                backgroundMusic['sound'].pause();
            };
            backgroundMusic['list'] = list;
            switch (backgroundMusic['type']) {
                case 'random':
                    backgroundMusic['index'] = Math.floor( Math.random( ) * ( list.length ) );
                    break;
                default:
                    backgroundMusic['index'] = 0;
                    break;
            };
            backgroundMusic['sound'] = new Audio();
            var sounds = this['sounds'];
            var sound = list[backgroundMusic['index']];
            backgroundMusic['sound']['src'] = sounds[sound['library']][sound['sound']]['src'];
            backgroundMusic['sound'].addEventListener('ended', function() {
                switch (backgroundMusic['type']) {
                    case 'random':
                        var bufferIndex = Math.floor( Math.random( ) * ( list.length ) );
                        if (bufferIndex == backgroundMusic['index']) {
                            bufferIndex++;
                            if (bufferIndex >= backgroundMusic['list'].length) {
                                bufferIndex = 0;
                            };
                        };
                        backgroundMusic['index'] = bufferIndex;
                        break;
                    default:
                        backgroundMusic['index']++;
                        if (backgroundMusic['index'] >= backgroundMusic['list'].length) {
                            backgroundMusic['index'] = 0;
                        };
                        break;
                };
                var sound = list[backgroundMusic['index']];
                backgroundMusic['sound']['src'] = sounds[sound['library']][sound['sound']]['src'];
                backgroundMusic['sound'].play();
            }, false);
            backgroundMusic['sound'].play();
        };
    };
    /**
     * Остановить воспроизведение фоновой музыки
     */
    this.pauseBackground = function() {
        if (this['backgroundMusic'] && this['backgroundMusic']['sound']) {
            this['backgroundMusic']['sound'].pause();
        };
    };
    /**
     * Восстановить воспроизведение фоновой музыки
     */
    this.cancelPauseBackground = function() {
        if (this['backgroundMusic'] &&
            this['backgroundMusic']['sound'] &&
            this['backgroundMusic']['sound']['paused']) {
            this['backgroundMusic']['sound'].play();
        };
    };
    /**
     * Получить коэффициент громкости в зависимости от рассторяния до источника
     * @param options
     * @returns {number}
     */
    this.getSoundDistanceVolumeCoefficient = function(options) {
        if (!this['characterCoordinates']) {
            return 1;
        };
        var characterCoordinates = this['characterCoordinates'];
        var earshot = this['earshot'];
        if (typeof options['x'] != 'undefined' &&
            typeof options['y'] != 'undefined' &&
            typeof options['z'] != 'undefined') {
            var distance = Math.sqrt(
                Math.pow(characterCoordinates['x'] - options['x'], 2) +
                Math.pow(characterCoordinates['y'] - options['y'], 2) +
                Math.pow(characterCoordinates['z'] - options['z'], 2)
            );
        } else {
            return 1;
        };
        if (distance - earshot > 0) {
            return 0;
        } else {
            return (earshot - distance) / earshot;
        };
    };
    /**
     * Пересчитать громкость звука в зависимости от коэффициентов (пока-что только расстояние)
     * @param ID
     */
    this.syncSoundVolume = function(ID) {
        var playList = this['playList'];
        if (ID in playList) {
            var item = playList[ID];
            var distanceCoefficient = this.getSoundDistanceVolumeCoefficient(item);
            item['sound']['volume'] = item['currentVolume'] * distanceCoefficient;
        };
    }
    /**
     * Пересчитать громкость для всех звуков
     */
    this.syncSoundsVolume = function() {
        var playList = this['playList'];
        for (var ID in playList) {
            this.syncSoundVolume(ID);
        };
    };
    /**
     * Установить громкость для указанного звука
     * @param ID
     * @param volume
     */
    this.setSoundVolume = function(ID, volume) {
        (volume > 1) ? volume = 1 : (volume < 0) ? volume = 0 : 1 ;
        var playList = this['playList'];
        if (ID in playList) {
            playList[ID]['currentVolume'] = volume;
            this.syncSoundVolume(ID);
        };
    };
    /**
     * Установить громкость для всех звуков
     * @param volume
     */
    this.setSound = function(volume) {
        var playList = this['playList'];
        for (var ID in playList) {
            this.setSoundVolume(ID, volume);
        };
    };
    /**
     * Установить координаты персонажа
     * @param x
     * @param y
     * @param z
     */
    this.setCharacterCoordinates = function(x, y, z) {
        this['characterCoordinates'] = {
            'x':    x,
            'y':    y,
            'z':    z
        };
        this.syncSoundsVolume();
    };
    /**
     * Проверка возможности добавления звука
     * @param options
     * @returns {boolean}
     */
    this.checkSound = function(options) {
        if (_.size(this['playList']) < this['limit']) {
            return true;
        } else {
            return false;
        };
    };
    /**
     * Остановить воспроизведение всех звуков
     */
    this.pause = function() {
        var playList = this['playList'];
        for (var ID in playList) {
            if (playList[ID]['sound']) {
                playList[ID]['sound'].pause();
            };
        };
    };
    /**
     * Возобновить воспроизведение после паузы
     */
    this.cancelPause = function() {
        var playList = this['playList'];
        for (var ID in playList) {
            if (playList[ID]['sound'] && playList[ID]['sound']['paused']) {
                playList[ID]['sound'].play();
            };
        };
    };
    /**
     * Удаление звуковой позиции
     * @param ID
     * @returns {boolean}
     */
    this.removeFromPlayList = function (ID) {
        if (ID in this['playList']) {
            this['playList'][ID]['sound'].pause();
            delete this['playList'][ID];
            return true;
        } else {
            return false;
        };
    };
    /**
     * Добавление звуковой позиции
     * @param options
     * @returns {boolean}
     */
    this.appendToPlayList = function(options) {
        var that = this;
        var result = false;
        if (this.checkSound(options)) {
            var item = $.extend(true, {}, options);
            item['currentVolume'] = item['volume'] || 1;
            item['sound'] = new Audio();
            item['sound']['src'] = this['sounds'][options['library']][options['sound']]['src'];
            item['sound'].addEventListener('ended', function() {
                if (item['repeat']) {
                    item['repeat']--;
                    if (item['delay']) {
                        setTimeout(function() {
                            item['sound'].play();
                        }, item['delay']);
                    } else {
                        item['sound'].play();
                    };
                } else {
                    that.removeFromPlayList(result);
                    if (item['ended']) {
                        item['ended'].apply(that);
                    };
                };
            }, false);
            if (item['repeat']) {
                // :DEBUG: пока-что убрал возможность повторения звука
                item['repeat'] = 1;
                item['repeat']--;
                var result = ++this['index'];
                this['playList'][result] = item;
                this.syncSoundVolume(result);
                item['sound'].play();
            };
        };
        return result;
    };
    /**
     * Воспроизвести указанный звуковой файл
     * @param library
     * @param sound
     * @param volume
     * @param endHandler
     */
    this.play = function(library, sound, volume, endHandler) {
        return this.appendToPlayList({
            'repeat':   1,
            'delay':    0,
            'library':  library,
            'sound':    sound,
            'volume':   volume,
            'ended':    endHandler
        });
    };
    /**
     * Инициализация
     * @param options
     * @returns {boolean}
     */
    this.init = function(options) {
        // подгребаем значения по умолчанию:
        $.extend(true, this, _.clone(defaultSettings), options);
        // some code...
        return true;
    };
    // инициализация:
    this.init(options);
};