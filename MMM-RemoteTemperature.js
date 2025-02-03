/* global Module */

Module.register("MMM-RemoteTemperature", {
  defaults: {
    devices: [],
    icon: "thermometer-half",
    showMore: true,
    showHumidity: false,
    showBattery: true,
    showTime: false,
    showAlerts: true,
  },

  requiresVersion: "2.1.0",

  start() {
    this.viewModel = {};
    this.sendSocketNotification("MMM-RemoteTemperature.INIT", this.config);
  },

  getDom() {
    const wrapper = document.createElement("div");

    if (Object.keys(this.viewModel).length === 0) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.classList = "dimmed small";
      return wrapper;
    }

    this.config.devices.forEach((device) => {
      const deviceData = this.viewModel[device.host];
      const deviceWrapper = document.createElement("div");
      deviceWrapper.classList = "device-container";

      const firstLineEl = document.createElement("div");

      if (this.config.icon) {
        const iconEl = document.createElement("span");
        iconEl.classList = `symbol fa fa-${this.config.icon}`;
        firstLineEl.appendChild(iconEl);
      }

      const nameEl = document.createElement("span");
      nameEl.classList = "device-name";
      nameEl.innerHTML = `${device.name}: `;
      firstLineEl.appendChild(nameEl);

      if (deviceData && deviceData.temperature !== undefined) {
        const temperatureEl = document.createElement("span");
        temperatureEl.classList = "temperature";
        temperatureEl.innerHTML = `${deviceData.temperature}&deg;C`;
        firstLineEl.appendChild(temperatureEl);
      } else {
        firstLineEl.innerHTML += " No data";
      }

      deviceWrapper.appendChild(firstLineEl);

      if (this.config.showMore && deviceData) {
        const secondLineEl = document.createElement("div");
        secondLineEl.classList = "more dimmed small";

        if (this.config.showHumidity && deviceData.humidity !== undefined) {
          secondLineEl.innerHTML += `<span class="fa fa-tint"></span> ${deviceData.humidity}% `;
        }

        if (this.config.showBattery && deviceData.battery !== undefined) {
          secondLineEl.innerHTML += `<span class="fa fa-battery-half"></span> ${deviceData.battery}% `;
        }

        if (this.config.showTime && deviceData.timestamp) {
          secondLineEl.innerHTML += `<span class="fa fa-clock"></span> ${moment(deviceData.timestamp).format("HH:mm")}`;
        }

        deviceWrapper.appendChild(secondLineEl);
      }

      wrapper.appendChild(deviceWrapper);
    });

    return wrapper;
  },

  socketNotificationReceived(notificationName, payload) {
    if (notificationName === "MMM-RemoteTemperature.VALUE_RECEIVED") {
      this.viewModel = payload;
      this.updateDom();
    }
  }
});
