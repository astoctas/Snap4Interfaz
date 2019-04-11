Process.prototype.connectArduino = function (port) {
    var sprite = this.blockReceiver();

    if (!sprite.arduino.connecting) {
        sprite.arduino.connecting = true;
        if (sprite.arduino.board === undefined) {
            if (port.indexOf('tcp://') === 0) {
                sprite.arduino.connectNetwork(port.slice(6));
            } else {
                // Second parameter tells `connect` to verify port before connecting
                // Since one can enter arbitrary text in this block, it is important
                // to do so!
                sprite.arduino.connect(port, true);
            }
        }
    }

    if (sprite.arduino.justConnected) {
        sprite.arduino.justConnected = undefined;
        return;
    }

    if (sprite.arduino.board && sprite.arduino.board.connected) {
        return;
    }

    this.pushContext('doYield');
    this.pushContext();
};

Process.prototype.disconnectArduino = function (port) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.board && sprite.arduino.board.connected) {
        sprite.arduino.disconnect(true); // silent
    }
};

Process.prototype.setPinMode = function (pin, mode) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {

        var board = sprite.arduino.board, 
            val;

        switch(mode[0]) {
            case 'digital input': val = board.MODES.INPUT; break;
            case 'digital output': val = board.MODES.OUTPUT; break;
            case 'PWM': val = board.MODES.PWM; break;
            case 'servo': val = board.MODES.SERVO; break;
            case 'analog input': val = board.MODES.ANALOG; break;
        }

        if (this.context.pinSet === undefined) {
            if (board.pins[pin].supportedModes.indexOf(val) > -1) {	
                board.pinMode(pin, val);
            } else { 
                return null;
            }
        }

        if (board.pins[pin].mode === val) {
            this.context.pinSet = true;
            return null;
        }

        this.pushContext('doYield');
        this.pushContext();
    } else {
        throw new Error(localize('Interfaz no conectada'));	
    }
};

Process.prototype.servoWrite = function (pin, value) {
    var sprite = this.blockReceiver();

    this.popContext();
    sprite.startWarp();
    this.pushContext('doYield');

    if (!this.isAtomic) {
        this.pushContext('doStopWarping');
    }

    if (sprite.arduino.isBoardReady()) {

        var board = sprite.arduino.board,
            numericValue;

        if (value[0] == 'disconnected') {
            if (board.pins[pin].mode != board.MODES.OUTPUT) {
                board.pinMode(pin, board.MODES.OUTPUT);
            }
            this.isAtomic = true;
            this.pushContext();
            return null;
        }

        if (board.pins[pin].mode != board.MODES.SERVO) {
            board.pinMode(pin, board.MODES.SERVO);
            board.servoConfig(pin, 600, 2400);
        }

        switch (value[0]) {
            case 'clockwise':
                numericValue = 1200;
                break;
            case 'counter-clockwise':
                numericValue = 1800;
                break;
            case 'stopped':
                numericValue = 1500;
                break;
            default:
                numericValue = value;
        }
        board.servoWrite(pin, numericValue);
        this.isAtomic = true;
        this.pushContext();
        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));			
    }

    this.isAtomic = true;
    this.pushContext();
};

Process.prototype.reportAnalogReading = function (pin) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {

        var board = sprite.arduino.board; 
        pin -= 1;
        if (board.pins[board.analogPins[pin]].mode != board.MODES.ANALOG) {
            board.pinMode(board.analogPins[pin], board.MODES.ANALOG);
        } else {
            return board.pins[board.analogPins[pin]].value;
        }

        this.pushContext('doYield');
        this.pushContext();
    } else {
        throw new Error(localize('Interfaz no conectada'));	
    }
};

Process.prototype.reportDigitalReading = function (pin) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {

        var board = sprite.arduino.board; 

        if (board.pins[pin].mode != board.MODES.INPUT) {
            board.pinMode(pin, board.MODES.INPUT);
            board.reportDigitalPin(pin, 1);
        } else {
            return board.pins[pin].value == 1;
        }

        this.pushContext('doYield');
        this.pushContext();
    } else {
        throw new Error(localize('Interfaz no conectada'));		
    }
};

Process.prototype.digitalWrite = function (pin, booleanValue) {
    var sprite = this.blockReceiver();
    
    this.popContext();
    sprite.startWarp();
    this.pushContext('doYield');

    if (!this.isAtomic) {
        this.pushContext('doStopWarping');
    }

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board,
            val = booleanValue ? board.HIGH : board.LOW;

        if (board.pins[pin].mode != board.MODES.OUTPUT) {
            board.pinMode(pin, board.MODES.OUTPUT);
        }
        board.digitalWrite(pin, val);
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }

    this.isAtomic = true;

    this.pushContext();
};

Process.prototype.pwmWrite = function (pin, value) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        if (board.pins[pin].mode != board.MODES.PWM) {
            board.pinMode(pin, board.MODES.PWM);
        }

        board.analogWrite(pin, value);
        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.reportConnected = function () {
    var sprite = this.blockReceiver();
    return sprite.arduino.isBoardReady();
};

Process.prototype.outputOn = function (outputNum) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        var data =[0xF0, //START_SYSEX
            0x02,
            0x01,outputNum-1,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.outputOff = function (outputNum) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        var data =[0xF0, //START_SYSEX
            0x02,
            0x02,outputNum-1,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.outputBrake = function (outputNum) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        var data =[0xF0, //START_SYSEX
            0x02,
            0x03,outputNum-1,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.outputInverse = function (outputNum) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        var data =[0xF0, //START_SYSEX
            0x02,
            0x04,outputNum-1,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.outputDirection = function (outputNum, dir) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 
        var d = (dir == "a") ? 0 : 1;

        var data =[0xF0, //START_SYSEX
            0x02,
            0x05,outputNum-1,d,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.outputPower = function (outputNum, pow) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 
        pow = Math.ceil(pow * 255 / 100);
        if(pow > 255) pow = 255;
        if (pow < 0) pow = 0;

        var data =[0xF0, //START_SYSEX
            0x02,
            0x06,outputNum-1,pow & 0x7F, (pow >> 7) & 0x7F,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.sendAnalog = function (analogNum, enable) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 
        var e = (enable == "si") ? 1 : 0;

        analogNum -= 1; 
        var data =[0xC0 | analogNum, e];

        board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

Process.prototype.sendDigital = function (outputNum, enable) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 
        var e = (enable == "si") ? 1 : 0;

        outputNum -= 1; 
        var data =[0xD0 | outputNum, e];

        board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};


Process.prototype.servoWrite = function (outputNum, value) {
    var sprite = this.blockReceiver();

    if (sprite.arduino.isBoardReady()) {
        var board = sprite.arduino.board; 

        var data =[0xF0, //START_SYSEX
            0x04,
            0x02,outputNum-1,value & 0x7F, (value >> 7) & 0x7F,
            0xF7  //END_SYSEX
            ];

            board.transport.write(new Buffer(data));

        return null;
    } else {
        throw new Error(localize('Interfaz no conectada'));
    }
};

