var request = require('request');

/**
 * @typedef SmartThingsAccessory~AccessoryOptions
 * @property {string} name - The name of this accessory
 * @property {function} log - The object to use for logging messages
 * @property {string} location - The SmartThings location for this accessory
 * @property {object} commands - The command (setter) endpoints for this accessory
 * @property {object} attributes - The getter endpoints for this accessory
 * @property {object} Service - The homebridge Service object
 * @property {object} Characteristic - The homebridge Characteristic object
 */
function SmartThingsAccessory(options) {
	Object.keys(options).forEach(function (key) {
		this[key] = options[key];
	}, this);
}

SmartThingsAccessory.TYPES = [
	'switches',
	'doors',
	'hues',
	'thermostats',
	'lightSensors'
];

SmartThingsAccessory.prototype = {
	getServices: function () {
		var services = [];
		var Characteristic = this.Characteristic;
		var Service = this.Service;

		var accessoryInformationService = new Service.AccessoryInformation();
		accessoryInformationService
			.setCharacteristic(Characteristic.Name, this.name)
			.setCharacteristic(Characteristic.Manufacturer, 'SmartThings')
			.setCharacteristic(Characteristic.Model, 'Rev-1')
			.setCharacteristic(Characteristic.SerialNumber, 'A1S2NASF88EW');
		services.push(accessoryInformationService);

		var commands = this.commands;
		var attributes = this.attributes;

		// A dimmable light
		if (commands.on && commands.setLevel) {
			var lightbulbService = new Service.Lightbulb(this.name);

			lightbulbService.getCharacteristic(Characteristic.On)
				.on('set', this.setOn.bind(this))
				.on('get', this.getOn.bind(this));
			lightbulbService.getCharacteristic(Characteristic.Brightness)
				.on('set', this.setBrightness.bind(this))
				.on('get', this.getBrightness.bind(this))

			if (commands.setHue) {
				lightbulbService.getCharacteristic(Characteristic.Hue)
					.on('set', this.setHue.bind(this))
					.on('get', this.getHue.bind(this))
			}

			if (commands.setSaturation) {
				lightbulbService.getCharacteristic(Characteristic.Saturation)
					.on('set', this.setSaturation.bind(this))
					.on('get', this.getSaturation.bind(this))
			}

			services.push(lightbulbService);
		}
		// A switch
		else if (commands.on) {
			var switchService = new Service.Switch(this.name);
			switchService.getCharacteristic(Characteristic.On)
				.on('set', this.setOn.bind(this))
				.on('get', this.getOn.bind(this));
			services.push(switchService);
		}
		// A door
		else if (commands.open) {
			var doorService = new Service.GarageDoorOpener(this.name);
			doorService.getCharacteristic(Characteristic.CurrentDoorState)
				.on('get', this.getCurrentDoorState.bind(this));
			doorService.getCharacteristic(Characteristic.TargetDoorState)
				.on('set', this.setTargetDoorState.bind(this))
				.on('get', this.getTargetDoorState.bind(this));
			services.push(doorService);
		}
		// A thermostat
		else if (commands.setHeatingSetpoint || commands.setCoolingSetpoint) {
			var thermostatService = new Service.Thermostat(this.name);
			thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
				.on('get', this.getCurrentTemperature.bind(this));
			thermostatService.getCharacteristic(Characteristic.TargetTemperature)
				.on('get', this.getTargetTemperature.bind(this))
				.on('set', this.setTargetTemperature.bind(this));
			thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
				.on('get', this.getCurrentHeatingCoolingState.bind(this));
			thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
				.on('get', this.getTargetHeatingCoolingState.bind(this))
				.on('set', this.setTargetHeatingCoolingState.bind(this));
			thermostatService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
				.on('get', this.getTemperatureDisplayUnits.bind(this));
			services.push(thermostatService);
		}
		// A light sensor
		else if (attributes.illuminance) {
			var lightSensorService = new Service.LightSensor(this.name);
			lightSensorService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.on('get', this.getCurrentAmbientLightLevel.bind(this));
			services.push(lightSensorService);
		}

		return services;
	},

	getCurrentAmbientLightLevel: function (callback) {
		this.currentValue('illuminance', callback);
	},

	setOpen: function (value, callback) {
		this.command(value ? 'open' : 'closed', callback);
	},

	getOpen: function (callback) {
		callback = callback || function () {};
		this.currentValue('door', function (error, value) {
			if (error) {
				callback(error);
			}
			else {
				switch (value) {
				case 'open':
					callback(null, true);
					break;
				default:
					callback(null, false);
				}
			}
		});
	},

	setOn: function (value, callback) {
		this.command(value ? 'on' : 'off', callback);
	},

	getOn: function (callback) {
		callback = callback || function () {};
		this.currentValue('switch', function (error, value) {
			if (error) {
				callback(error);
			}
			else {
				switch (value) {
				case 'on':
					callback(null, true);
					break;
				default:
					callback(null, false);
				}
			}
		});
	},

	setBrightness: function (value, callback) {
		this.command('setLevel', value, callback);
	},

	getBrightness: function (callback) {
		this.currentValue('level', callback);
	},

	setHue: function (value, callback) {
		this.command('setHue', value, callback);
	},

	getHue: function (callback) {
		this.currentValue('hue', callback);
	},

	setSaturation: function (value, callback) {
		this.command('setSaturation', value, callback);
	},

	getSaturation: function (callback) {
		this.currentValue('saturation', callback);
	},

	getCurrentDoorState: function (callback) {
		var Characteristic = this.Characteristic;

		callback = callback || function () {};
		this.currentValue('status', function (error, value) {
			if (error) {
				callback(error);
			}
			else {
				switch (value) {
				case 'open':
					callback(null, Characteristic.CurrentDoorState.OPEN);
					break;
				case 'opening':
					callback(null, Characteristic.CurrentDoorState.OPENING);
					break;
				case 'closing':
					callback(null, Characteristic.CurrentDoorState.CLOSING);
					break;
				case 'closed':
					callback(null, Characteristic.CurrentDoorState.CLOSED);
					break;
				default:
					callback(null, Characteristic.CurrentDoorState.STOPPED);
				}
			}
		});
	},

	getTargetDoorState: function (callback) {
		var Characteristic = this.Characteristic;
		var self = this;
		callback = callback || function () {};
		this.currentValue('status', function (error, status) {
			if (error) {
				callback(error);
			}
			else {
				switch (status) {
				case Characteristic.CurrentDoorState.OPENING:
			case Characteristic.CurrentDoorState.OPEN:
				callback(null, Characteristic.TargetDoorState.OPEN);
				break;
			default:
				callback(null, Characteristic.TargetDoorState.CLOSED);
				break;
				}
			}
		});
	},

	setTargetDoorState: function (value, callback) {
		var Characteristic = this.Characteristic;
		switch (value) {
		case Characteristic.TargetDoorState.OPEN:
			this.command('open', callback);
			break;
		case Characteristic.TargetDoorState.CLOSED:
			this.command('close', callback);
			break;
		}
	},

	getCurrentTemperature: function (callback) {
		this.currentTemperatureValue('temperature', callback);
	},

	getTargetTemperature: function (callback) {
		var Characteristic = this.Characteristic;
		var self = this;
		callback = callback || function () {};
		this.getTargetHeatingCoolingState(function (error, mode) {
			if (error) {
				callback(error);
			}
			else {
				switch (mode) {
				case Characteristic.TargetHeatingCoolingState.COOL:
					self.currentTemperatureValue('coolingSetpoint', callback);
					break;
				case Characteristic.TargetHeatingCoolingState.HEAT:
					self.currentTemperatureValue('heatingSetpoint', callback);
					break;
				case Characteristic.TargetHeatingCoolingState.AUTO:
					// TODO
					callback('unimplemented');
					break;
				default:
					callback(null, undefined);
				}
			}
		});
	},

	setTargetTemperature: function (value, callback) {
		var Characteristic = this.Characteristic;
		var self = this;
		callback = callback || function () {};
		this.getTargetHeatingCoolingState(function (error, mode) {
			if (error) {
				callback(error);
			}
			else {
				switch (mode) {
				case Characteristic.TargetHeatingCoolingState.COOL:
					self.command('setCoolingSetpoint', value, callback);
					break;
				case Characteristic.TargetHeatingCoolingState.HEAT:
					self.command('setHeatingSetpoint', value, callback);
					break;
				case Characteristic.TargetHeatingCoolingState.AUTO:
					// TODO
						callback('unimplemented');
					break;
				default:
					callback('target state is off');
				}
			}
		});
	},

	getCurrentHeatingCoolingState: function (callback) {
		var Characteristic = this.Characteristic;
		callback = callback || function () {};
		this.currentValue('thermostatOperatingState', function (error, mode) {
			if (error) {
				callback(error);
			}
			else {
				switch (mode) {
				case 'cooling':
					callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
					break;
				case 'heating':
					callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
					break;
				default:
					callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
				}
			}
		});
	},

	getTargetHeatingCoolingState: function (callback) {
		var Characteristic = this.Characteristic;
		callback = callback || function () {};
		this.currentValue('thermostatMode', function (error, mode) {
			if (error) {
				callback(error);
			}
			else {
				switch (mode) {
				case 'cool':
					callback(null, Characteristic.TargetHeatingCoolingState.COOL);
					break;
				case 'heat':
					callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
					break;
				case 'auto':
					callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
					break;
				default:
					callback(null, Characteristic.TargetHeatingCoolingState.OFF);
				}
			}
		});
	},

	setTargetHeatingCoolingState: function (value, callback) {
		var Characteristic = this.Characteristic;
		var cmdValue = null;
		switch (value) {
		case Characteristic.TargetHeatingCoolingState.COOL:
			cmdValue = 'cool';
			break;
		case Characteristic.TargetHeatingCoolingState.HEAT:
			cmdValue = 'heat';
			break;
		case Characteristic.TargetHeatingCoolingState.AUTO:
			cmdValue = 'range';
			break;
		case Characteristic.TargetHeatingCoolingState.OFF:
			cmdValue = 'off';
			break;
		}

		if (cmdValue) {
			this.command('setThermostatMode', cmdValue, callback);
		}
		else {
			callback && callback('unknown target heating cooling state');
		}
	},

	getTemperatureDisplayUnits: function (callback) {
		var Characteristic = this.Characteristic;
		callback = callback || function () {};
		this.currentValue('temperatureUnit', function (error, unit) {
			if (error) {
				callback(error);
			}
			else {
				switch (unit) {
				case 'fahrenheit':
					callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
					break;
				default:
					callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
				}
			}
		});
	},

	command: function (command, value, callback) {
		if (typeof value === 'function') {
			callback = value;
			value = undefined;
		}

		var url = this.commands[command];
		var body = {};
		if (value) {
			body.value = value;
		}

		this.log(this.name + ' sending command ' + command + '(' + value + ')');

		callback = callback || function () {};

		var self = this;
		request.put({
			url: url,
			json: true,
			body: body
		}, function (error, response, body) {
			if (error) {
				self.log(self.name + ' error sending command: ' + url);
				callback('error sending command');
			}
			else {
				callback(null);
			}
		});
	},

	currentValue: function (attribute, callback) {
		var url = this.attributes[attribute];
		var self = this;
		callback = callback || function () {};

		request.get({
			url: url
		}, function (error, response, body) {
			if (error || response.statusCode !== 200) {
				self.log(self.name + ' error getting attribute: ' + url);
				callback('error getting attribute');
			}
			else {
				var obj = JSON.parse(body);
				if (obj.currentValue) {
					callback(null, obj.currentValue);
				}
				else {
					callback('current value not available');
				}
			}
		});
	},

	currentTemperatureValue: function (attribute, callback) {
		var self = this;
		this.currentValue('temperatureUnit', function (error, unit) {
			if (error) {
				callback(error);
			}
			else {
				self.currentValue(attribute, function (error, value) {
					if (error) {
						callback(error);
					}
					else {
						// Temperature callbacks always expect celsius
						if (unit === 'fahrenheit') {
							value = (value - 32) / 1.8
						}
						callback(null, value);
					}
				});
			}
		});
	}
};

module.exports = SmartThingsAccessory;
