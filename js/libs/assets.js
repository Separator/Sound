/**
 * Created with JetBrains WebStorm.
 * User: Максим
 * Date: 08.07.14
 * Time: 21:14
 * To change this template use File | Settings | File Templates.
 * Required: jquery, underscore
 */

function Assets(options) {
    var defaultSettings = {
        "ajax":                 {
            "async":    false,
            "cache":    false,
            "dataType": "json",
            "type":     "POST",
            "timeout":  10000
        },
        "paths": {
            "assetsDirectory":  "assets",
            "catalogFile":      "catalog.json",
            "descriptionFile":  "description.json",
            "imagesDirectory":  "images"
        },

        "phrases": {
            "load_begin":   "Начало загрузки актива",
            "load_end":     "Окончание загрузки раздела актива",
            "load_error":   "Ошибка загрузки актива"
        },

        "downloadList": null,
        "progress": 0,
        "loadStep": 0,
        "loadedItems":  null,
        "loadedImagesItems": null,
        "loadedSoundsItems": null,

        "statusHandler":            function(message) {},
        "progressHandler":          function(progress) {},
        "loadFailHandler":          function() {},
        "itemHandlers":             {},
        "loadAll":                  function(loadedItems) {}
    };

    /**
     * Получить обработанные активы анимации
     * @param animationObject
     * @param animation
     * @returns {*}
     */
    this.getAnimationAssets = function(animationObject, animation) {
        var loadedItems = this['loadedItems'];
        var loadedImagesItems = this['loadedImagesItems'];
        for (var itemName in loadedImagesItems) {
            if (animationObject in loadedItems[itemName]) {
                var animations = loadedItems[itemName][animationObject];
                if (animation in animations) {
                    return animations[animation];
                };
            };
        };
        return false;
    };
    /**
     * Получить обработанные активы анимации
     * @param itemName
     * @returns {Object}
     */
    this.animationProcess = function(itemName) {
        var result = {};
        var animationBlocks = this['loadedItems'][itemName];
        var imagesList = this['loadedImagesItems'][itemName];
        for (var animationBlockName in animationBlocks) {
            result[animationBlockName] = {};
            var animationsList = animationBlocks[animationBlockName];
            for (var animationName in animationsList) {
                var frames = animationsList[animationName]["frames"];
                var processedFrames = [];
                var duration = 0;
                var currentSecond = 0;
                for (var i = 0; i < frames.length; i++) {
                    duration += frames[i]['t'];
                    processedFrames.push({
                        "begin":    currentSecond,
                        "end":      currentSecond + frames[i]['t'],
                        "img":      imagesList[animationBlockName][frames[i]['i']]
                    });
                    currentSecond += frames[i]['t'];
                };
                result[animationBlockName][animationName] = {
                    "duration": duration,
                    "end":      animationsList[animationName]["end"],
                    "frames":   processedFrames
                };
            };
        };
        return result;
    };
    /**
     * Получение информации из json-файлов
     * @param url
     * @returns {boolean}
     */
    this.request = function(url) {
        var result = false;
        $.ajax(
            $.extend(
                true,
                _.clone(this['ajax']),
                {
                    "url":  url
                },
                {
                    "success":  function(data)  {result = data;}/*,
                 "error":    function(e)     {result = e}*/
                }
            )
        );
        return result;
    };
    /**
     * Загрузка актива типа "animation"
     * @param itemName
     * @param itemData
     */
    this.loadAnimation = function(itemName, itemData) {
        var that = this;
        var phrases = this['phrases'];
        var imagesNum = 0;
        var hasImages = false;
        for (var animationName in itemData) {
            var animationOptions = this.request(
                this['paths']['assetsDirectory']+'/'+itemName+'/'+animationName+'/'+this['paths']['descriptionFile']
            );
            if (animationOptions) {
                this['loadedItems'][itemName][animationName] = animationOptions;
                if (!hasImages) {
                    hasImages = {};
                };
                hasImages[animationName] = {};
                for (var actionName in animationOptions) {
                    var frames = animationOptions[actionName]['frames'];
                    hasImages[animationName][actionName] = frames;
                    imagesNum += frames.length;
                };
            } else {
                this.loadFailHandler(phrases['load_error'] + ' "' + itemName + '->' + animationName + '"');
            };
        };
        if (imagesNum) {
            // создаём хранилище для картинок:
            if (!this['loadedImagesItems']) {
                this['loadedImagesItems'] = {};
            };
            this['loadedImagesItems'][itemName] = {};
            var loadedImagesNum = 0;
            for (var animationName in hasImages) {
                this['loadedImagesItems'][itemName][animationName] = {};
                var animationItem = hasImages[animationName];
                var imagePath = this['paths']['assetsDirectory'] + '/' +
                    itemName + '/' + animationName + '/' +
                    this['paths']['imagesDirectory'] + '/';
                for (var actionName in animationItem) {
                    var frames = animationItem[actionName];
                    for (var i = 0; i < frames.length; i++) {
                        var imageName = frames[i]['i'];
                        (function(itemName, animationName, imageName, imagePath) {
                            var imageObject = new Image();
                            imageObject.onload = function() {
                                loadedImagesNum++;
                                that['loadedImagesItems'][itemName][animationName][imageName] = this;
                                if (loadedImagesNum == imagesNum) {
                                    // обработка загрузки:
                                    that.setProgress(that['progress'] + that['loadStep']);
                                    if (that['itemHandlers'][itemName]) {
                                        that['itemHandlers'][itemName](that.animationProcess(itemName));
                                    };
                                    that['handlersStatus'][itemName] = true;
                                    if (that.allItemsLoaded()) {
                                        that.loadAll(that['loadedItems']);
                                    };
                                };
                            };
                            imageObject.onerror = function() {
                                loadedImagesNum++;
                                that.loadFailHandler(phrases['load_error'] + ' "' + animationName + '->' + imageName + '"');
                                if (loadedImagesNum == imagesNum) {
                                    // обработка загрузки:
                                    that.setProgress(that['progress'] + that['loadStep']);
                                    if (that['itemHandlers'][itemName]) {
                                        that['itemHandlers'][itemName](that.animationProcess(itemName));
                                    };
                                    that['handlersStatus'][itemName] = true;
                                    if (that.allItemsLoaded()) {
                                        that.loadAll(that['loadedItems']);
                                    };
                                };
                            };
                            imageObject.src = imagePath + imageName;
                        })(itemName, animationName, imageName, imagePath);
                    };
                };
            };
        } else {
            // обработка загрузки:
            this.setProgress(this['progress'] + this['loadStep']);
            if (this['itemHandlers'][itemName]) {
                this['itemHandlers'][itemName](this['loadedItems'][itemName]);
            };
            this['handlersStatus'][itemName] = true;
            if (this.allItemsLoaded()) {
                this.loadAll(this['loadedItems']);
            };
        };
    };
    /**
     * Загрузка актива типа "hash"
     * @param itemName
     * @param itemData
     */
    this.loadHash = function(itemName, itemData) {
        var that = this;
        var hasImages = false;
        var imagesNum = 0;
        var phrases = this['phrases'];
        for (var unitName in itemData) {
            var unitOptions = this.request(
                this['paths']['assetsDirectory']+'/'+itemName+'/'+unitName+'/'+this['paths']['descriptionFile']
            );
            if (unitOptions) {
                this['loadedItems'][itemName][unitName] = unitOptions;
                if ("images" in unitOptions) {
                    if (!hasImages) {
                        hasImages = {};
                    };
                    hasImages[unitName] = unitOptions['images'];
                    imagesNum += _.size(unitOptions['images']);
                };
            } else {
                this.loadFailHandler(phrases['load_error'] + ' "' + itemName + '->' + unitName + '"');
            };
        };
        if (imagesNum) {
            // создаём хранилище для картинок:
            if (!this['loadedImagesItems']) {
                this['loadedImagesItems'] = {};
            };
            this['loadedImagesItems'][itemName] = {};
            var loadedImagesNum = 0;
            for (var unitName in hasImages) {
                this['loadedImagesItems'][itemName][unitName] = {};
                var unitImages = hasImages[unitName];
                for (var imageName in unitImages) {
                    (function(imageName, unitName) {
                        var imageSrc = that['paths']['assetsDirectory'] +
                            '/' + itemName + '/' + unitName +
                            '/' + that['paths']['imagesDirectory'] +
                            '/' + unitImages[imageName];
                        var imageObject = new Image();
                        imageObject.onload = function() {
                            loadedImagesNum++;
                            that['loadedImagesItems'][itemName][unitName][imageName] = this;
                            if (loadedImagesNum == imagesNum) {
                                // обработка загрузки:
                                that.setProgress(that['progress'] + that['loadStep']);
                                if (that['itemHandlers'][itemName]) {
                                    that['itemHandlers'][itemName](that['loadedItems'][itemName]);
                                };
                                that['handlersStatus'][itemName] = true;
                                if (that.allItemsLoaded()) {
                                    that.loadAll(that['loadedItems']);
                                };
                            };
                        };
                        imageObject.onerror = function() {
                            loadedImagesNum++;
                            that.loadFailHandler(phrases['load_error'] + ' "' + imageName + '->' + imageSrc + '"');
                            if (loadedImagesNum == imagesNum) {
                                // обработка загрузки:
                                that.setProgress(that['progress'] + that['loadStep']);
                                if (that['itemHandlers'][itemName]) {
                                    that['itemHandlers'][itemName](that['loadedItems'][itemName]);
                                };
                                that['handlersStatus'][itemName] = true;
                                if (that.allItemsLoaded()) {
                                    that.loadAll(that['loadedItems']);
                                };
                            };
                        };
                        imageObject.src = imageSrc;
                    })(imageName, unitName);
                };
            };
        } else {
            // обработка загрузки:
            this.setProgress(this['progress'] + this['loadStep']);
            if (this['itemHandlers'][itemName]) {
                this['itemHandlers'][itemName](this['loadedItems'][itemName]);
            };
            this['handlersStatus'][itemName] = true;
            if (this.allItemsLoaded()) {
                this.loadAll(this['loadedItems']);
            };
        };
    };
    /**
     * Загрузка актива типа "sound"
     * @param itemName
     * @param itemData
     */
    this.loadSound = function(itemName, itemData) {
        var that = this;
        var hasSounds = false;
        var soundsNum = 0;
        var phrases = this['phrases'];
        for (var soundLibName in itemData) {
            var soundsList = this.request(
                this['paths']['assetsDirectory']+'/'+itemName+'/'+soundLibName+'/'+this['paths']['descriptionFile']
            );
            if (soundsList) {
                this['loadedItems'][itemName][soundLibName] = soundsList;
                if (_.size(soundsList)) {
                    if (!hasSounds) {
                        hasSounds = {};
                    };
                    hasSounds[soundLibName] = soundsList;
                    soundsNum += _.size(soundsList);
                };
            } else {
                this.loadFailHandler(phrases['load_error'] + ' "' + itemName + '->' + soundLibName + '"');
            };
        };
        if (hasSounds) {
            // создаём хранилище для звуков:
            if (!this['loadedSoundsItems']) {
                this['loadedSoundsItems'] = {};
            };
            this['loadedSoundsItems'][itemName] = {};
            var loadedSoundsNum = 0;
            for (var soundLibName in hasSounds) {
                this['loadedSoundsItems'][itemName][soundLibName] = {};
                var filesList = hasSounds[soundLibName];
                for (var soundFileName in filesList) {
                    (function(soundFileName, soundLibName) {
                        var filePath = that['paths']['assetsDirectory'] +
                            '/' + itemName + '/' + soundLibName +
                            '/' + soundFileName;
                        var audio = new Audio();
                        audio.addEventListener('canplaythrough', function() {
                            loadedSoundsNum++;
                            that['loadedSoundsItems'][itemName][soundLibName][soundFileName] = this;
                            that['loadedItems'][itemName][soundLibName][soundFileName] = this;
                            if (loadedSoundsNum == soundsNum) {
                                // обработка загрузки:
                                that.setProgress(that['progress'] + that['loadStep']);
                                if (that['itemHandlers'][itemName]) {
                                    that['itemHandlers'][itemName](that['loadedSoundsItems'][itemName]);
                                };
                                that['handlersStatus'][itemName] = true;
                                if (that.allItemsLoaded()) {
                                    that.loadAll(that['loadedItems']);
                                };
                            };
                        }, false);
                        audio.addEventListener('error', function() {
                            loadedSoundsNum++;
                            that.loadFailHandler(phrases['load_error'] + ' "' + soundLibName + '->' + soundFileName + '"');
                            if (loadedSoundsNum == soundsNum) {
                                // обработка загрузки:
                                that.setProgress(that['progress'] + that['loadStep']);
                                if (that['itemHandlers'][itemName]) {
                                    that['itemHandlers'][itemName](that['loadedSoundsItems'][itemName]);
                                };
                                that['handlersStatus'][itemName] = true;
                                if (that.allItemsLoaded()) {
                                    that.loadAll(that['loadedItems']);
                                };
                            };
                        }, false);
                        audio.src = filePath;
                    })(soundFileName, soundLibName);
                };
            };
        } else {
            // обработка загрузки:
            this.setProgress(this['progress'] + this['loadStep']);
            if (this['itemHandlers'][itemName]) {
                this['itemHandlers'][itemName](this['loadedSoundsItems'][itemName]);
            };
            this['handlersStatus'][itemName] = true;
            if (this.allItemsLoaded()) {
                this.loadAll(this['loadedItems']);
            };
        };
    };
    /**
     * Загрузка актива
     * @param itemName
     * @param item
     * @returns {boolean}
     */
    this.loadItem = function(itemName, item) {
        var phrases = this['phrases'];
        if (this['statusHandler']) {
            this.statusHandler(phrases['load_begin'] + ' "' + item['description'] + '"');
        };
        var itemData = $.ajax(
            $.extend(
                true,
                _.clone(this['ajax']),
                {
                    "async":    true,
                    "context":  this,
                    "url":      this['paths']['assetsDirectory'] + '/' + itemName + '/' + this['paths']['catalogFile'],
                    "success":  function(itemData) {
                        if (!this['loadedItems']) {
                            this['loadedItems'] = {};
                        };
                        this['loadedItems'][itemName] = {};
                        switch (item['type']) {
                            case "animation":
                                this.loadAnimation(itemName, itemData);
                                break;

                            case 'sound':
                                this.loadSound(itemName, itemData);
                                break;

                            case "hash":
                            default:
                                this.loadHash(itemName, itemData);
                                break;
                        };
                    },
                    "error":    function(e) {
                        this.loadFailHandler(phrases['load_error'] + ' "' + itemName + '"');
                    }
                }
            )
        );
        return true;
    };
    /**
     * Установка шага загрузки
     * @param value
     */
    this.setStep = function(value) {
        this['loadStep'] = value;
    };
    /**
     * Установка текущего процента загрузки активов
     * @param value
     */
    this.setProgress = function(value) {
        if (value <   0) value = 0;
        if (value > 100) value = 100;
        this['progress'] = value;
        if (this['progressHandler']) {
            this.progressHandler(Math.floor(this['progress']));
        };
    };
    /**
     * Проверка срабатывания всех обработчиков загрузки
     * @returns {boolean}
     */
    this.allItemsLoaded = function() {
        var result = true;
        var downloadList = this['downloadList'];
        var handlersStatus = this['handlersStatus'];
        for (var itemName in downloadList) {
            if (!handlersStatus[itemName]) {
                result = false;
                break;
            };
        };
        return result;
    };
    /**
     * Загрузка активов
     * @param loadList
     * @return {Boolean}
     */
    this.load = function(loadList) {
        if (!_.size(loadList)) {
            return false;
        };
        var handlersList = this['itemHandlers'];
        var handlersStatus = {};
        for (var handlerName in handlersList) {
            if (handlerName in loadList) {
                handlersStatus[handlerName] = false;
            };
        };
        this['handlersStatus'] = handlersStatus;
        this.setProgress(0);
        this.setStep(100 / _.size(loadList));
        // начинаем загрузку:
        for (var itemName in loadList) {
            this.loadItem(itemName, loadList[itemName]);
        };
        return true;
    };
    /**
     * Инициализация
     * @param options
     * @return {Boolean}
     */
    this.init = function(options) {
        // подгребаем значения по умолчанию:
        $.extend(true, this, _.clone(defaultSettings), options);
        // вытаскиваем список загружаемых активов:
        var downloadList = this['downloadList'];
        if (!downloadList) {
            downloadList = this.request(this['paths']['assetsDirectory'] + '/' + this['paths']['catalogFile']);
            if (!downloadList) {
                return false;
            };
            this['downloadList'] = downloadList;
        };
        // загрузаем активы:
        this.load(downloadList);
        return true;
    };

    // Вызов инициализации:
    this.init(options);
};