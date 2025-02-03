const NodeHelper = require("node_helper");
const axios = require("axios");

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-RemoteTemperature] Node Helper Started.");
    this.devices = [];
    this.viewModel = {};
    this.units = "metric"; // Default to metric (Celsius)
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === "MMM-RemoteTemperature.INIT") {
      console.log("[MMM-RemoteTemperature] Received INIT request. Devices:", payload.devices);
      this.devices = payload.devices;

      // Set the units from the frontend config (either 'imperial' or 'metric')
      this.units = payload.units === "imperial" ? "imperial" : "metric"; // 'imperial' -> Fahrenheit, 'metric' -> Celsius
      this._fetchTemperatureData(); // Initial fetch
      setInterval(() => this._fetchTemperatureData(), 60000); // Fetch every 60 seconds
    }
  },

  async _fetchTemperatureData() {
    console.log("[MMM-RemoteTemperature] Fetching temperature data...");

    const results = {};
    let totalTemperature = 0;
    let deviceCount = 0;

    for (const device of this.devices) {
      const url = `http://${device.host}:${device.port}/temperature`; // Target API URL

      try {
        console.log(`[MMM-RemoteTemperature] Requesting data from ${url}...`);
        
        const response = await axios.get(url, { timeout: 5000 }); // 5s timeout
        console.log(`[MMM-RemoteTemperature] Response from ${device.host}:`, response.data);

        let temperature = response.data.temperature;
        
        if (this.units === "imperial") {
          // Convert to Fahrenheit if units are imperial
          temperature = this._convertToFahrenheit(temperature);
        }

        // Round the temperature to 2 decimal places
        temperature = this._roundToTwoDecimalPlaces(temperature);

        // Add the temperature to the total for average calculation
        totalTemperature += temperature;
        deviceCount++;

        // Store only the temperature (no additional data)
        results[device.host] = {
          temperature: temperature ?? "N/A"
        };

      } catch (error) {
        console.error(`[MMM-RemoteTemperature] ERROR fetching from ${url}:`, error.message);
        results[device.host] = { error: "Unavailable" };
      }
    }

    console.log("[MMM-RemoteTemperature] Final fetched data:", results);
    this.viewModel = results;

    // Calculate the average temperature if there are devices with valid data
    let averageTemperature = "N/A";
    if (deviceCount > 0) {
      averageTemperature = this._roundToTwoDecimalPlaces(totalTemperature / deviceCount);
    }

    // Send only the rounded average temperature as the payload
    this.indoorTemperature = averageTemperature;

    // Emit the single rounded temperature as the INDOOR_TEMPERATURE notification
    this.sendSocketNotification("INDOOR_TEMPERATURE", this.roundValue(this.indoorTemperature));

    // Emit the standard notification for display (optional)
    this.sendSocketNotification("MMM-RemoteTemperature.VALUE_RECEIVED", this.viewModel);
  },

  // Helper function to convert Celsius to Fahrenheit
  _convertToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  },

  // Helper function to round the temperature to 2 decimal places
  _roundToTwoDecimalPlaces(value) {
    return Math.round(value * 100) / 100; // Multiply by 100, round, then divide by 100
  },

  // Round a value as per the config (rounding to 1 or 2 decimal places)
  roundValue(value) {
    const decimals = 2; // You can change this value if you want to round to a different decimal place
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
});
