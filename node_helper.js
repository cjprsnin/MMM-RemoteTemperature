const NodeHelper = require("node_helper");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = NodeHelper.create({
    start() {
        this.config = null;
        this.cache = {
            weather: {
                data: null,
                timestamp: null,
                ttl: 10 * 60 * 1000 // 10 minutes
            },
            holidays: {
                data: null,
                timestamp: null,
                ttl: 24 * 60 * 60 * 1000 // 24 hours
            }
        };
    },

    socketNotificationReceived(notification, payload) {
        switch (notification) {
            case "INIT_CONFIG":
                this.config = payload;
                break;
            case "API-FETCH":
                this.handleWeatherRequest(payload);
                break;
            case "HOLIDAY-FETCH":
                this.handleHolidayRequest(payload);
                break;
        }
    },

    async handleWeatherRequest(url) {
        try {
            if (this.isCacheValid("weather")) {
                this.sendWeatherData(this.cache.weather.data);
                return;
            }

            const response = await this.retryableRequest(() => 
                axios.get(url, { timeout: 5000 })
            );

            this.cacheWeatherData(response.data);
            this.sendWeatherData(response.data);
        } catch (error) {
            this.handleWeatherError(error, url);
        }
    },

    async handleHolidayRequest(url) {
        try {
            if (this.isCacheValid("holidays")) {
                this.sendHolidayData(this.cache.holidays.data);
                return;
            }

            const response = await this.retryableRequest(() => 
                axios.get(url, { timeout: 5000 })
            );

            const holidays = this.parseHolidays(response.data);
            this.cacheHolidayData(holidays);
            this.sendHolidayData(holidays);
        } catch (error) {
            this.handleHolidayError(error, url);
        }
    },

    parseHolidays(html) {
        try {
            const $ = cheerio.load(html);
            const holidays = [];

            $("#holidays-table tr[data-date]").each((i, row) => {
                const dateStr = $(row).attr("data-date");
                const date = new Date(dateStr);
                
                $(row).find(".holiday-name").each((j, cell) => {
                    holidays.push({
                        name: $(cell).text().trim(),
                        date: date.toISOString()
                    });
                });
            });

            return holidays;
        } catch (error) {
            throw new Error(`Failed to parse holidays: ${error.message}`);
        }
    },

    async retryableRequest(requestFn, retries = 3, delay = 1000) {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryableRequest(requestFn, retries - 1, delay * 2);
            }
            throw error;
        }
    },

    isCacheValid(type) {
        return (
            this.cache[type].data &&
            Date.now() - this.cache[type].timestamp < this.cache[type].ttl
        );
    },

    cacheWeatherData(data) {
        this.cache.weather = {
            data,
            timestamp: Date.now(),
            ttl: this.config?.weatherCacheTTL || 10 * 60 * 1000
        };
    },

    cacheHolidayData(data) {
        this.cache.holidays = {
            data,
            timestamp: Date.now(),
            ttl: this.config?.holidayCacheTTL || 24 * 60 * 60 * 1000
        };
    },

    sendWeatherData(data) {
        this.sendSocketNotification("API-RESPONSE", {
            success: true,
            data: this.transformWeatherData(data),
            cached: this.isCacheValid("weather")
        });
    },

    sendHolidayData(data) {
        this.sendSocketNotification("HOLIDAY-RESPONSE", {
            success: true,
            data,
            cached: this.isCacheValid("holidays")
        });
    },

    transformWeatherData(rawData) {
        return {
            temp: rawData.main?.temp,
            humidity: rawData.main?.humidity,
            code: rawData.weather?.[0]?.id,
            description: rawData.weather?.[0]?.description,
            windSpeed: rawData.wind?.speed,
            sunrise: rawData.sys?.sunrise,
            sunset: rawData.sys?.sunset,
            timestamp: Date.now()
        };
    },

    handleWeatherError(error, url) {
        const errorInfo = {
            message: "Weather data fetch failed",
            url,
            code: error.code,
            status: error.response?.status,
            retryIn: this.config?.retryInterval || 5000
        };

        console.error(`[MMM-DynamicWeather] ${errorInfo.message}:`, errorInfo);
        this.sendSocketNotification("API-RESPONSE", {
            success: false,
            error: errorInfo
        });
    },

    handleHolidayError(error, url) {
        const errorInfo = {
            message: "Holiday data fetch failed",
            url,
            code: error.code,
            status: error.response?.status
        };

        console.error(`[MMM-DynamicWeather] ${errorInfo.message}:`, errorInfo);
        this.sendSocketNotification("HOLIDAY-RESPONSE", {
            success: false,
            error: errorInfo
        });
    }
});
