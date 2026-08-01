import { describe, it, expect } from "vitest";
import {
  CreateServiceAppointmentSchema,
  CreateRentAppointmentSchema,
} from "./appoinment.validation.js";

describe("CreateServiceAppointmentSchema — booking time slot is REQUIRED", () => {
  it("should accept a SERVICE booking with a bookingTime slot", () => {
    const parsed = CreateServiceAppointmentSchema.parse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      bookingTime: "10:00",
      appointmentType: "SERVICE",
      price: 150,
    });

    expect(parsed.bookingTime).toBe("10:00");
  });

  it("should REJECT a SERVICE booking without a bookingTime slot", () => {
    const result = CreateServiceAppointmentSchema.safeParse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      appointmentType: "SERVICE",
      price: 150,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("bookingTime"))
      ).toBe(true);
    }
  });

  it("should REJECT a SERVICE booking with an empty bookingTime", () => {
    const result = CreateServiceAppointmentSchema.safeParse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      bookingTime: "",
      appointmentType: "SERVICE",
      price: 150,
    });

    expect(result.success).toBe(false);
  });

  it("should REJECT a SERVICE booking with an invalid time format", () => {
    const result = CreateServiceAppointmentSchema.safeParse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      bookingTime: "25:99",
      appointmentType: "SERVICE",
      price: 150,
    });

    expect(result.success).toBe(false);
  });

  it("should normalize a single-digit hour (9:00) to zero-padded (09:00)", () => {
    const parsed = CreateServiceAppointmentSchema.parse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      bookingTime: "9:00",
      appointmentType: "SERVICE",
      price: 150,
    });

    expect(parsed.bookingTime).toBe("09:00");
  });
});

describe("CreateRentAppointmentSchema — booking time slot stays OPTIONAL", () => {
  it("should accept a RENT booking WITHOUT a bookingTime (full-day rental)", () => {
    const parsed = CreateRentAppointmentSchema.parse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      appointmentType: "RENT",
      dailyPrice: 200,
      duration: 1,
      durationUnit: "days",
    });

    expect(parsed.bookingTime).toBeUndefined();
  });

  it("should accept a RENT booking WITH a bookingTime", () => {
    const parsed = CreateRentAppointmentSchema.parse({
      listingId: "listing-1",
      bookingDate: "2026-08-15",
      bookingTime: "14:00",
      appointmentType: "RENT",
      hourlyPrice: 25,
      duration: 3,
      durationUnit: "hours",
    });

    expect(parsed.bookingTime).toBe("14:00");
  });
});
