const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    // console.log('[MMM-RemoteTemperature] Node Helper Started.');
    this.devices = [];
    this.viewModel = {};
    this.units = 'metric'; // Default to metric (Celsius)
    this.fetchInterval = 60000; // Default interval (60 seconds)
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === 'MMM-RemoteTemperature.INIT') {
      // console.log('[MMM-RemoteTemperature] Received INIT request. Devices:', payload.devices);
      this.devices = payload.devices;

      // Set the units from the frontend config (either 'imperial' or 'metric')
      this.units = payload.units === 'imperial' ? 'imperial' : 'metric'; // 'imperial' -> Fahrenheit, 'metric' -> Celsius

      // Use the fetchInterval provided in the config or default to 60 seconds
      this.fetchInterval = payload.fetchInterval || 60000; // Default to 60000ms (60 seconds)

      this._fetchTemperatureData(); // Initial fetch
      setInterval(() => this._fetchTemperatureData(), this.fetchInterval); // Fetch at the configured interval
    }
  },

  async _fetchTemperatureData() {
    // console.log('[MMM-RemoteTemperature] Fetching temperature data...');

    const results = {};
    let totalTemperature = 0;
    let deviceCount = 0;

    await Promise.all(this.devices.map(async (device) => {
      const url = `http://${device.host}:${device.port}/temperature`; // Target API URL

      try {
        const response = await axios.get(url, { timeout: 5000 }); // 5s timeout

        let { temperature } = response.data;

        if (this.units === 'imperial') {
          // Convert to Fahrenheit if units are imperial
          temperature = this._convertToFahrenheit(temperature);
        }

        // Round the temperature to 2 decimal places
        temperature = this._roundToTwoDecimalPlaces(temperature);

        // Add the temperature to the total for average calculation
        totalTemperature += temperature;
        deviceCount += 1;

        // Store only the temperature (no additional data)
        results[device.host] = {
          temperature: temperature ?? 'N/A'
        };
      } catch (error) {
        // console.error(`[MMM-RemoteTemperature] ERROR fetching from ${url}:`, error.message);
        results[device.host] = { error: 'Unavailable' };
      }
    })).catch((error) => {
      console.error('[MMM-RemoteTemperature] Unhandled promise rejection:', error.message);
    });

    this.viewModel = results;

    // Calculate the average temperature if there are devices with valid data
    let averageTemperature = 'N/A';
    if (deviceCount > 0) {
      averageTemperature = this._roundToTwoDecimalPlaces(totalTemperature / deviceCount);
    }

    // Emit the average indoor temperature first
    this.sendSocketNotification('INDOOR_TEMPERATURE', {
      temperature: averageTemperature
    });
    // console.log('[MMM-RemoteTemperature] Sending INDOOR_TEMPERATURE notification:', averageTemperature);

    // Emit the full device data afterward
    this.sendSocketNotification('MMM-RemoteTemperature.VALUE_RECEIVED', this.viewModel);
  },

  _convertToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
  },

  _roundToTwoDecimalPlaces(number) {
    return Math.round(number * 100) / 100;
  }
});
