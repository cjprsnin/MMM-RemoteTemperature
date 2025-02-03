async _fetchTemperatureData() {
  console.log("[MMM-RemoteTemperature] Fetching temperature data...");

  const results = {};

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

      results[device.host] = {
        temperature: temperature ?? "N/A",
        humidity: response.data.humidity ?? "N/A",
        battery: response.data.battery ?? "N/A",
        timestamp: Date.now(),
      };

    } catch (error) {
      console.error(`[MMM-RemoteTemperature] ERROR fetching from ${url}:`, error.message);
      results[device.host] = { error: "Unavailable" };
    }
  }

  console.log("[MMM-RemoteTemperature] Final fetched data:", results);
  this.viewModel = results;

  // Emit one notification with the aggregated temperature data
  this.sendSocketNotification("INDOOR_TEMPERATURE", {
    devices: results, // All devices' data in one payload
    timestamp: Date.now(),
  });

  // Emit the standard notification for display
  this.sendSocketNotification("MMM-RemoteTemperature.VALUE_RECEIVED", this.viewModel);
}
