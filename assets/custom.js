class DeliveryPicker extends HTMLElement {
  static get observedAttributes() {
    return [ "delivery-date", "delivery-day", "zip-code", "delivery-time" ];
  }

  constructor() {
    const element = super();
    this.element = element;

    // Form elements
    this.formEl = this.element.querySelector(".delivery-zone__form form");
    this.countryEl = this.formEl.querySelector("select#delivery_zone_country");
    this.zipCodeEl = this.formEl.querySelector("input#delivery_zone_zip_code");

    // Delivery zone elements
    this.deliveryZonesEl = this.element.querySelector(".delivery-zones");
    this.deliveryTimeSlotsEl = this.element.querySelector(".delivery-time-slots");
    this.defaultErrorText = "";
  }

  triggerError(message) {
    const errorEl = this.querySelector(".delivery-picker__error");
    if (errorEl) {
      errorEl.textContent = message;
    }
    this.setAttribute("delivery-error", "true");
  }

  connectedCallback() {
    this.formEl.addEventListener("submit", this.#handleFormSubmission.bind(this));

    [...this.deliveryZonesEl.querySelectorAll(".delivery-zone")].forEach(deliveryZoneEl => {
      deliveryZoneEl.addEventListener("click", this.#handleDeliveryZoneSelection.bind(this));
    });

    if (this.deliveryTimeSlotsEl) {
      [...this.deliveryTimeSlotsEl.querySelectorAll(".time-slot-button")].forEach(timeSlotEl => {
        timeSlotEl.addEventListener("click", this.#handleTimeSlotSelection.bind(this));
      });
    }

    const errorEl = this.querySelector(".delivery-picker__error");
    if (errorEl) {
      this.defaultErrorText = errorEl.textContent;
    }

    const zipCodeFromCache = localStorage.getItem("delivery-picker:zip-code");
    if (zipCodeFromCache && !this.zipCode) {
      this.zipCode = zipCodeFromCache;
      this.zipCodeEl.value = zipCodeFromCache;
    }

    const countryFromCache = localStorage.getItem("delivery-picker:country");
    if (countryFromCache) {
      this.countryEl.value = countryFromCache;
    }

    const deliveryDateFromCache = localStorage.getItem("delivery-picker:delivery-date");
    const deliveryDayFromCache = localStorage.getItem("delivery-picker:delivery-day");
    const deliveryTimeFromCache = localStorage.getItem("delivery-picker:delivery-time");
    if (deliveryDateFromCache && !this.getAttribute("delivery-date")) {
      this.setAttribute("delivery-date", deliveryDateFromCache);
      if (deliveryDayFromCache) {
        this.setAttribute("delivery-day", deliveryDayFromCache);
      }
      if (deliveryTimeFromCache) {
        this.setAttribute("delivery-time", deliveryTimeFromCache);
      }
    }

    if (this.deliveryDate) {
      sessionStorage.setItem("deliveryDateSelected", "true");
      window.deliveryDateSelected = true;
    } else {
      sessionStorage.setItem("deliveryDateSelected", "false");
      window.deliveryDateSelected = false;
    }

    if (this.zipCode && this.deliveryZone) {
      sessionStorage.setItem("postcodeVerified", "true");
      window.postcodeVerified = true;
    } else {
      sessionStorage.setItem("postcodeVerified", "false");
      window.postcodeVerified = false;
    }

    const today = new Date().setHours(0, 0, 0, 0);
    if (this.deliveryDate && new Date(this.deliveryDate) < today) {
      this.#clearDeliveryDate();
    }

    this.countryEl.addEventListener("change", this.#onCountryChange.bind(this));
    this.#updateFlag();

    if (this.zipCode) {
      this.#showDeliveryZones();
    }
  }

  #onCountryChange() {
    this.#updateFlag();
    if (this.zipCode) {
      this.#showDeliveryZones();
      if (this.deliveryZone) {
        sessionStorage.setItem("postcodeVerified", "true");
        window.postcodeVerified = true;
      } else {
        sessionStorage.setItem("postcodeVerified", "false");
        window.postcodeVerified = false;
      }
    }
  }

  disconnectedCallback() {
    this.formEl.removeEventListener("submit", this.#handleFormSubmission.bind(this));
    this.countryEl.removeEventListener("change", this.#onCountryChange.bind(this));

    [...this.deliveryZonesEl.querySelectorAll(".delivery-zone")].forEach(deliveryZoneEl => {
      deliveryZoneEl.removeEventListener("click", this.#handleDeliveryZoneSelection.bind(this));
    });

    if (this.deliveryTimeSlotsEl) {
      [...this.deliveryTimeSlotsEl.querySelectorAll(".time-slot-button")].forEach(timeSlotEl => {
        timeSlotEl.removeEventListener("click", this.#handleTimeSlotSelection.bind(this));
      });
    }
  }

  updateCartAlert() {
    const verified = sessionStorage.getItem("postcodeVerified") === "true";
    const dateSelected = sessionStorage.getItem("deliveryDateSelected") === "true";
    const cartAlert = this.querySelector(".delivery-picker-cart-alert");
    if (cartAlert && verified && dateSelected) {
      cartAlert.classList.add("visually-hidden");
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "delivery-date") {
      if (newValue) {
        this.removeAttribute("delivery-error");
        sessionStorage.setItem("deliveryDateSelected", "true");
        window.deliveryDateSelected = true;
        localStorage.setItem("delivery-picker:delivery-date", newValue);
      } else {
        sessionStorage.setItem("deliveryDateSelected", "false");
        window.deliveryDateSelected = false;
        localStorage.removeItem("delivery-picker:delivery-date");
      }
      this.updateCartAlert();
      this.dispatchEvent(new CustomEvent("delivery-picker:updated", {
        bubbles: true,
        detail: { deliveryDate: newValue }
      }));
    }

    if (name === "delivery-day") {
      if (newValue) {
        localStorage.setItem("delivery-picker:delivery-day", newValue);
      } else {
        localStorage.removeItem("delivery-picker:delivery-day");
      }
    }

    if (name === "delivery-time") {
      if (newValue) {
        localStorage.setItem("delivery-picker:delivery-time", newValue);
      } else {
        localStorage.removeItem("delivery-picker:delivery-time");
      }
    }

    if (name === "zip-code") {
      if (!!newValue) {
        localStorage.setItem("delivery-picker:zip-code", newValue);
        this.#showDeliveryZones();
        if (this.deliveryZone) {
          sessionStorage.setItem("postcodeVerified", "true");
          window.postcodeVerified = true;
        } else {
          sessionStorage.setItem("postcodeVerified", "false");
          window.postcodeVerified = false;
        }
      } else {
        this.#hideDeliveryZones();
        sessionStorage.setItem("postcodeVerified", "false");
        window.postcodeVerified = false;
      }
      this.updateCartAlert();
    }
  }

  #clearDeliveryDate() {
    this.setAttribute("delivery-date", "");
    this.setAttribute("delivery-day", "");
    this.setAttribute("delivery-time", "");

    this.#updateCart("", "", "");
    this.#showDeliveryZones();
  }

  #handleDeliveryZoneSelection(event) {
    event.preventDefault();

    const newDeliveryDate = event.currentTarget.dataset.deliveryDate;
    const newDeliveryDay = event.currentTarget.dataset.deliveryDay;

    this.setAttribute("delivery-date", newDeliveryDate);
    this.setAttribute("delivery-day", newDeliveryDay);

    this.#updateCart(newDeliveryDate, newDeliveryDay, this.deliveryTime);
    this.#showDeliveryZones();
  }

  #handleTimeSlotSelection(event) {
    event.preventDefault();
    const newDeliveryTime = event.currentTarget.dataset.timeSlot;
    this.setAttribute("delivery-time", newDeliveryTime);
    this.#updateCart(this.deliveryDate, this.deliveryDay, newDeliveryTime);
    this.#showDeliveryZones();
  }

  #handleFormSubmission(event) {
    event.preventDefault();
    this.zipCode = this.zipCodeEl.value;
    
    const errorEl = this.querySelector(".delivery-picker__error");
    if (errorEl && this.defaultErrorText) {
      errorEl.textContent = this.defaultErrorText;
    }
    
    if (!this.deliveryZone) {
      this.setAttribute("delivery-error", "true");
      sessionStorage.setItem("postcodeVerified", "false");
      window.postcodeVerified = false;
      this.#hideDeliveryZones();
      this.#setZoneFeedback(false);
    } else {
      this.removeAttribute("delivery-error");
      sessionStorage.setItem("postcodeVerified", "true");
      window.postcodeVerified = true;
      this.#showDeliveryZones();
    }
  }

  #hideDeliveryZones() {
    this.deliveryZonesEl.classList.add("visually-hidden");
  }

  #updateFlag() {
    const selectedOption = this.countryEl.options[this.countryEl.selectedIndex];
    if (selectedOption) {
      localStorage.setItem("delivery-picker:country", this.countryEl.value);
      const flagUrl = selectedOption.dataset.flagUrl;
      const flagImg = this.element.querySelector("#current_country_flag");
      if (flagImg) {
        if (flagUrl) {
          flagImg.src = flagUrl;
          flagImg.style.display = "block";
        } else {
          flagImg.style.display = "none";
        }
      }
    }
  }

  #setZoneFeedback(hasVisibleDates) {
    const feedbackEl = this.element.querySelector(".delivery-zone__form-feedback");
    const unavailableTemplate = this.element.querySelector("#delivery-zone-unavailable");
    if (!feedbackEl) return;

    feedbackEl.innerHTML = "";
    if (this.deliveryZone && !hasVisibleDates && unavailableTemplate) {
      feedbackEl.appendChild(unavailableTemplate.content.cloneNode(true));
    }
  }

  #showDeliveryZones() {
    if (!this.deliveryZonesEl) return;

    const minOffset = this.#getMinOffset();
    const maxOffset = this.#getMaxOffset();
    let visibleCount = 0;

    [...this.deliveryZonesEl.querySelectorAll(".delivery-zone")].forEach((deliveryZoneEl) => {
      if (deliveryZoneEl.dataset.deliveryDate == this.deliveryDate) {
        deliveryZoneEl.classList.add("delivery-zone--active");
      } else {
        deliveryZoneEl.classList.remove("delivery-zone--active");
      }

      const offset = parseInt(deliveryZoneEl.dataset.deliveryOffset, 10);
      const dayMatch = this.deliveryZone && this.deliveryZone.days.includes(deliveryZoneEl.dataset.deliveryDay);
      const offsetMatch = minOffset === null || offset >= minOffset;
      const withinWeekMatch = maxOffset === null || offset <= maxOffset;

      if (dayMatch && offsetMatch && withinWeekMatch) {
        deliveryZoneEl.classList.remove("visually-hidden");
        visibleCount++;
      } else {
        deliveryZoneEl.classList.add("visually-hidden");
      }
    });

    if (this.deliveryZone) {
      this.deliveryZonesEl.classList.remove("visually-hidden");
      this.#setZoneFeedback(visibleCount > 0);
    } else {
      this.#hideDeliveryZones();
      this.#setZoneFeedback(false);
      return;
    }

    if (this.deliveryDate && this.deliveryZone && this.deliveryZone.zoneId !== "zone5") {
      if (this.deliveryTimeSlotsEl) {
        this.deliveryTimeSlotsEl.classList.remove("visually-hidden");
        [...this.deliveryTimeSlotsEl.querySelectorAll(".time-slot-button")].forEach((btn) => {
          if (btn.dataset.timeSlot === this.deliveryTime) {
            btn.classList.add("time-slot--active");
          } else {
            btn.classList.remove("time-slot--active");
          }
        });
      }
    } else if (this.deliveryTimeSlotsEl) {
      this.deliveryTimeSlotsEl.classList.add("visually-hidden");
    }
  }

  #getMaxOffset() {
    if (!this.hasAttribute("restrict-next-week")) return null;
    const orderDay = new Date().getDay(); 
    if (orderDay !== 1 && orderDay !== 2) return null;
    return 7 - orderDay;
  }

  #getMinOffset() {
    if (!this.deliveryZone) return null;
    const orderDay = new Date().getDay(); 

    const minOffsetsByZone = {
      zone1: [3, 2, 3, 5, 4, 5, 4],
      zone2: [2, 3, 2, 6, 5, 4, 3],
      zone3: [2, 3, 2, 6, 5, 4, 3],
      zone4: [3, 2, 2, 5, 4, 4, 3],
    };

    const zoneId = this.deliveryZone.zoneId;

    if (zoneId === "zone5") {
      const minLeadDays = orderDay === 0 ? 3 : 4;
      for (let offset = minLeadDays; offset <= 14; offset++) {
        const targetDay = (orderDay + offset) % 7;
        if (targetDay === 3 || targetDay === 4) return offset;
      }
      return minLeadDays;
    }

    return minOffsetsByZone[zoneId]?.[orderDay] ?? null;
  }

  #updateCart(deliveryDate, deliveryDay, deliveryTime) {
    this.setAttribute("loading", true);

    const attributes = { "Delivery Date": deliveryDate, "Delivery Day": deliveryDay };
    if (deliveryTime) {
      attributes["Delivery Time"] = deliveryTime;
    } else {
      attributes["Delivery Time"] = "";
    }

    fetch("/cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", },
      body: JSON.stringify({ attributes }),
    })
      .then((cart) => this.setAttribute("loading", false))
      .catch((error) => this.setAttribute("loading", false));
  }

  get deliveryZones() {
    return [
      { zoneId: "zone1", countryCode: "NL", localDelivery: true,  startsAt: 1000,  endsAt: 4299,   days: [ "monday", "wednesday", "friday" ] },
      { zoneId: "zone2", countryCode: "NL", localDelivery: true,  startsAt: 4300,  endsAt: 9999,   days: [ "tuesday", "thursday" ] },
      { zoneId: "zone3", countryCode: "BE", localDelivery: true,  startsAt: 1000,  endsAt: 9999,   days: [ "tuesday", "thursday" ] },
      { zoneId: "zone4", countryCode: "DE", localDelivery: true,  startsAt: 40000, endsAt: 47999,  days: [ "monday", "tuesday", "wednesday", "thursday" ] },
      { zoneId: "zone4", countryCode: "DE", localDelivery: true,  startsAt: 50000, endsAt: 53999,  days: [ "monday", "tuesday", "wednesday", "thursday" ] },
      { zoneId: "zone5", countryCode: "DE", localDelivery: false, startsAt: 0,     endsAt: 39999,  days: [ "wednesday", "thursday" ] },
      { zoneId: "zone5", countryCode: "DE", localDelivery: false, startsAt: 48000, endsAt: 49999,  days: [ "wednesday", "thursday" ] },
      { zoneId: "zone5", countryCode: "DE", localDelivery: false, startsAt: 54000, endsAt: 100000, days: [ "wednesday", "thursday" ] },
    ];
  }

  get deliveryDate() {
    return this.getAttribute("delivery-date");
  }

  get deliveryDay() {
    return this.getAttribute("delivery-day");
  }

  get deliveryTime() {
    return this.getAttribute("delivery-time");
  }

  get deliveryZone() {
    if (!this.zipCode || this.zipCodeDigits === null) return null;

    const deliveryZonesForCountry = this.deliveryZones.filter(deliveryZone => deliveryZone.countryCode === this.countryEl.value);
    return deliveryZonesForCountry.find(zone => this.zipCodeDigits >= zone.startsAt && this.zipCodeDigits <= zone.endsAt) || null;
  }

  set zipCode(value) {
    this.setAttribute("zip-code", value);
  }

  get zipCode() {
    return this.getAttribute("zip-code");
  }

  get zipCodeDigits() {
    if (!this.zipCode) return null;
    const digits = this.zipCode.replace(/\D/g, "");
    if (!digits) return null;
    const value = parseInt(digits, 10);
    return Number.isNaN(value) ? null : value;
  }
}

customElements.define('delivery-picker', DeliveryPicker);


